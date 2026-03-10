import { Request, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../database/connection.js';
import { ActaEntrega } from '../models/actaEntrega.js';
import { DetalleActa } from '../models/detalleActa.js';
import { Dispositivo } from '../models/dispositivo.js';
import { MovimientoDispositivo } from '../models/movimientoDispositivo.js';
import { TokenFirma } from '../models/tokenFirma.js';
import { getPhotoUrl } from '../config/multer.js';
import { getIO } from '../models/server.js';
 
/**
 * Generar número de acta único
 */
const generarNumeroActa = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const ultimaActa = await ActaEntrega.findOne({
    where: {
      numeroActa: {
        [Op.like]: `ACTA-${year}-%`
      }
    },
    order: [['id', 'DESC']]
  });
  
  let numero = 1;
  if (ultimaActa) {
    const partes = ultimaActa.numeroActa.split('-');
    numero = parseInt(partes[2]) + 1;
  }
  
  return `ACTA-${year}-${numero.toString().padStart(4, '0')}`;
};

/**
 * Obtener todas las actas de entrega
 */
export const obtenerActas = async (req: Request, res: Response) => {
  try {
    const { estado, busqueda, fechaInicio, fechaFin } = req.query;
    
    let where: any = {};
    
    if (estado && estado !== 'todas') {
      where.estado = estado;
    }
    
    if (busqueda) {
      where[Op.or] = [
        { numeroActa: { [Op.iLike]: `%${busqueda}%` } },
        { nombreReceptor: { [Op.iLike]: `%${busqueda}%` } },
        { cargoReceptor: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }
    
    if (fechaInicio && fechaFin) {
      where.fechaEntrega = {
        [Op.between]: [new Date(fechaInicio as string), new Date(fechaFin as string)]
      };
    }
    
    const actas = await ActaEntrega.findAll({
      where,
      include: [
        {
          model: DetalleActa,
          as: 'detalles',
          include: [
            {
              model: Dispositivo,
              as: 'dispositivo',
              attributes: ['id', 'nombre', 'categoria', 'marca', 'modelo', 'serial']
            }
          ]
        }
      ],
      order: [['fechaEntrega', 'DESC']]
    });
    
    res.json(actas);
  } catch (error) {
    console.error('Error al obtener actas:', error);
    res.status(500).json({ msg: 'Error al obtener las actas de entrega' });
  }
};

/**
 * Obtener acta por ID con detalles completos
 */
export const obtenerActaPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const acta = await ActaEntrega.findByPk(Number(id), {
      include: [
        {
          model: DetalleActa,
          as: 'detalles',
          include: [
            {
              model: Dispositivo,
              as: 'dispositivo'
            }
          ]
        }
      ]
    });
    
    if (!acta) {
      res.status(404).json({ msg: 'Acta no encontrada' });
      return;
    }
    
    res.json(acta);
  } catch (error) {
    console.error('Error al obtener acta:', error);
    res.status(500).json({ msg: 'Error al obtener el acta' });
  }
};

/**
 * Crear nueva acta de entrega con múltiples dispositivos
 */
export const crearActaEntrega = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      nombreReceptor,
      cedulaReceptor,
      cargoReceptor,
      telefonoReceptor,
      correoReceptor,
      firmaReceptor,
      fechaDevolucionEsperada,
      observacionesEntrega,
      dispositivos: dispositivosRaw, // Viene como string JSON desde FormData
      Uid
    } = req.body;
    
    // Parsear dispositivos si viene como string
    let dispositivos = dispositivosRaw;
    if (typeof dispositivosRaw === 'string') {
      try {
        dispositivos = JSON.parse(dispositivosRaw);
      } catch (e) {
        await transaction.rollback();
        res.status(400).json({ msg: 'Formato de dispositivos inválido' });
        return;
      }
    }
    
    // Validar que haya dispositivos
    if (!dispositivos || !Array.isArray(dispositivos) || dispositivos.length === 0) {
      await transaction.rollback();
      res.status(400).json({ msg: 'Debe seleccionar al menos un dispositivo' });
      return;
    }
    
    // Verificar que todos los dispositivos estén disponibles
    const dispositivosIds = dispositivos.map((d: any) => d.dispositivoId);
    const dispositivosDB = await Dispositivo.findAll({
      where: { id: dispositivosIds },
      transaction
    });
    
    const noDisponibles = dispositivosDB.filter(d => d.estado !== 'disponible');
    if (noDisponibles.length > 0) {
      await transaction.rollback();
      res.status(400).json({
        msg: 'Algunos dispositivos no están disponibles',
        dispositivos: noDisponibles.map(d => d.nombre)
      });
      return;
    }

    // Para dispositivos tipo stock, verificar stock disponible (stock actual - reservas pendientes del modelo nuevo)
    const dispositivosStock = dispositivosDB.filter(d => d.tipoRegistro === 'stock');
    let stockReservado: { [id: number]: number } = {};

    if (dispositivosStock.length > 0) {
      const stockIds = dispositivosStock.map(d => d.id);

      // Obtener detalles de actas pendientes de firma
      const detallesPendientes = await DetalleActa.findAll({
        where: { dispositivoId: stockIds },
        include: [{
          model: ActaEntrega,
          as: 'acta',
          where: { estado: 'pendiente_firma' },
          attributes: ['id']
        }],
        attributes: ['dispositivoId', 'cantidad', 'actaId'],
        transaction
      });

      if (detallesPendientes.length > 0) {
        // Solo contar reservas del modelo nuevo (tienen movimiento tipo 'reserva')
        // Las actas viejas ya redujeron el stock al crearse
        const movimientosReserva = await MovimientoDispositivo.findAll({
          where: {
            dispositivoId: stockIds,
            tipoMovimiento: 'reserva' as any
          },
          attributes: ['dispositivoId', 'actaId'],
          transaction
        });

        const reservaSet = new Set(
          movimientosReserva.map((m: any) => `${m.dispositivoId}-${m.actaId}`)
        );

        for (const detalle of detallesPendientes) {
          const did = (detalle as any).dispositivoId;
          const actaId = (detalle as any).actaId;

          if (reservaSet.has(`${did}-${actaId}`)) {
            stockReservado[did] = (stockReservado[did] || 0) + ((detalle as any).cantidad || 1);
          }
        }
      }
    }

    const sinStockSuficiente = dispositivos.filter((item: any) => {
      const dispoDb = dispositivosDB.find((d: any) => d.id === item.dispositivoId);
      if (dispoDb?.tipoRegistro !== 'stock') return false;
      const disponible = (dispoDb.stockActual || 0) - (stockReservado[dispoDb.id] || 0);
      return disponible < (item.cantidad || 1);
    });
    if (sinStockSuficiente.length > 0) {
      await transaction.rollback();
      const nombres = sinStockSuficiente.map((item: any) => {
        const d = dispositivosDB.find((d: any) => d.id === item.dispositivoId);
        const disponible = (d?.stockActual || 0) - (stockReservado[d?.id || 0] || 0);
        return `${d?.nombre} (necesita ${item.cantidad}, disponible: ${disponible})`;
      });
      res.status(400).json({
        msg: 'Stock insuficiente para algunos dispositivos',
        dispositivos: nombres
      });
      return;
    }
    
    // Generar número de acta
    const numeroActa = await generarNumeroActa();
    
    // Crear el acta (sin firma, se firmará por correo)
    const acta = await ActaEntrega.create({
      numeroActa,
      nombreReceptor,
      cedulaReceptor,
      cargoReceptor,
      telefonoReceptor,
      correoReceptor,
      firmaReceptor: null, // Sin firma inicial
      fechaEntrega: new Date(),
      fechaDevolucionEsperada,
      estado: 'pendiente_firma', // Estado pendiente de firma
      observacionesEntrega,
      Uid
    }, { transaction });
    
    // Procesar fotos si se subieron
    let fotosMap: { [key: string]: string[] } = {};
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const dispositivoId = file.fieldname.replace('fotos_', '');
        if (!fotosMap[dispositivoId]) {
          fotosMap[dispositivoId] = [];
        }
        fotosMap[dispositivoId].push(getPhotoUrl(file.filename, 'entregas'));
      }
    }
    
    // Crear detalles del acta y actualizar estado de dispositivos
    for (const item of dispositivos) {
      const dispositivo = dispositivosDB.find(d => d.id === item.dispositivoId);
      
      // Crear detalle
      await DetalleActa.create({
        actaId: acta.id,
        dispositivoId: item.dispositivoId,
        cantidad: item.cantidad || 1, // Guardar la cantidad especificada
        estadoEntrega: dispositivo?.estado,
        condicionEntrega: item.condicionEntrega || dispositivo?.condicion,
        fotosEntrega: JSON.stringify(fotosMap[item.dispositivoId] || []),
        observacionesEntrega: item.observaciones,
        devuelto: false
      }, { transaction });
      
      if (dispositivo?.tipoRegistro === 'stock') {
        // Dispositivo tipo stock: reservar sin reducir stock (se reduce al firmar)
        const cantidadReservada = item.cantidad || 1;

        await MovimientoDispositivo.create({
          dispositivoId: item.dispositivoId,
          tipoMovimiento: 'reserva' as any,
          estadoAnterior: `stock: ${dispositivo.stockActual}`,
          estadoNuevo: `stock: ${dispositivo.stockActual} (reserva: ${cantidadReservada})`,
          descripcion: `Reservado para ${nombreReceptor} (${cargoReceptor}) - ${cantidadReservada} uds - Acta ${numeroActa} (pendiente firma)`,
          actaId: acta.id,
          fecha: new Date(),
          Uid
        }, { transaction });
      } else {
        // Dispositivo individual: reservar hasta que el receptor firme
        await Dispositivo.update(
          { estado: 'reservado' },
          { where: { id: item.dispositivoId }, transaction }
        );

        await MovimientoDispositivo.create({
          dispositivoId: item.dispositivoId,
          tipoMovimiento: 'reserva' as any,
          estadoAnterior: 'disponible',
          estadoNuevo: 'reservado',
          descripcion: `Reservado para ${nombreReceptor} (${cargoReceptor}) - Acta ${numeroActa} pendiente de firma`,
          actaId: acta.id,
          fecha: new Date(),
          Uid
        }, { transaction });
      }
    }
    
    await transaction.commit();
    
    // Obtener acta completa con detalles
    const actaCompleta = await ActaEntrega.findByPk(acta.id, {
      include: [
        {
          model: DetalleActa,
          as: 'detalles',
          include: [
            {
              model: Dispositivo,
              as: 'dispositivo'
            }
          ]
        }
      ]
    });
    
    // Emitir evento de WebSocket para actualización en tiempo real
    const io = getIO();
    io.to('actas').emit('acta:created', actaCompleta);
    io.to('inventario').emit('dispositivo:updated', { multiple: true, ids: dispositivosIds });
    
    res.status(201).json({
      msg: 'Acta de entrega creada exitosamente',
      acta: actaCompleta
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear acta:', error);
    res.status(500).json({ msg: 'Error al crear el acta de entrega' });
  }
};

/**
 * Registrar devolución de dispositivos (parcial o completa)
 */
export const registrarDevolucion = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params; // ID del acta
    const {
      devoluciones: devolucionesRaw, // Viene como string JSON desde FormData
      observacionesDevolucion,
      Uid
    } = req.body;
    
    // Parsear devoluciones si viene como string
    let devoluciones = devolucionesRaw;
    if (typeof devolucionesRaw === 'string') {
      try {
        devoluciones = JSON.parse(devolucionesRaw);
      } catch (e) {
        await transaction.rollback();
        res.status(400).json({ msg: 'Formato de devoluciones inválido' });
        return;
      }
    }
    
    console.log('📦 Procesando devolución para acta:', id);
    console.log('   Dispositivos a devolver:', devoluciones?.length || 0);
    
    const acta = await ActaEntrega.findByPk(Number(id), {
      include: [{ model: DetalleActa, as: 'detalles' }],
      transaction
    });
    
    if (!acta) {
      await transaction.rollback();
      res.status(404).json({ msg: 'Acta no encontrada' });
      return;
    }
    
    // Procesar fotos de devolución
    let fotosMap: { [key: string]: string[] } = {};
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const detalleId = file.fieldname.replace('fotos_devolucion_', '');
        if (!fotosMap[detalleId]) {
          fotosMap[detalleId] = [];
        }
        fotosMap[detalleId].push(getPhotoUrl(file.filename, 'devoluciones'));
      }
    }
    
    // Procesar cada devolución
    for (const devolucion of devoluciones) {
      console.log('   Procesando devolución de detalle:', devolucion.detalleId);
      
      const detalle = await DetalleActa.findByPk(devolucion.detalleId, { transaction });
      
      if (!detalle) {
        console.log('   ⚠️ Detalle no encontrado:', devolucion.detalleId);
        continue;
      }
      
      if (detalle.devuelto) {
        console.log('   ⚠️ Detalle ya devuelto:', devolucion.detalleId);
        continue;
      }
      
      // Actualizar detalle del acta
      await detalle.update({
        devuelto: true,
        fechaDevolucion: new Date(),
        estadoDevolucion: devolucion.estadoDevolucion,
        condicionDevolucion: devolucion.condicionDevolucion,
        fotosDevolucion: JSON.stringify(fotosMap[devolucion.detalleId] || []),
        observacionesDevolucion: devolucion.observaciones
      }, { transaction });
      
      console.log('   ✅ Detalle actualizado como devuelto');
      
      // Actualizar estado del dispositivo según la devolución
      let nuevoEstado = 'disponible';
      if (devolucion.estadoDevolucion === 'dañado') {
        nuevoEstado = 'dañado';
      } else if (devolucion.estadoDevolucion === 'perdido') {
        nuevoEstado = 'perdido';
      }

      console.log('   Cambiando estado de dispositivo', detalle.dispositivoId, 'a:', nuevoEstado);

      // Obtener el dispositivo para verificar tipo de registro
      const dispositivo = await Dispositivo.findByPk(detalle.dispositivoId, { transaction });

      if (dispositivo?.tipoRegistro === 'stock') {
        // Dispositivo stock: restaurar cantidad al stock si se devuelve como disponible
        const cantidadDevuelta = detalle.cantidad || 1;
        const stockAnterior = dispositivo.stockActual || 0;

        if (nuevoEstado === 'disponible') {
          const stockRestaurado = stockAnterior + cantidadDevuelta;
          await Dispositivo.update(
            { stockActual: stockRestaurado, estado: 'disponible' },
            { where: { id: detalle.dispositivoId }, transaction }
          );

          await MovimientoDispositivo.create({
            dispositivoId: detalle.dispositivoId,
            tipoMovimiento: 'devolucion',
            estadoAnterior: `stock: ${stockAnterior}`,
            estadoNuevo: `stock: ${stockRestaurado}`,
            descripcion: `Devuelto de ${acta.nombreReceptor} - ${cantidadDevuelta} uds restauradas al stock${devolucion.observaciones ? ' - ' + devolucion.observaciones : ''}`,
            actaId: acta.id,
            fecha: new Date(),
            Uid
          }, { transaction });
        } else {
          // Dañado o perdido: no restaurar stock, solo registrar movimiento
          await MovimientoDispositivo.create({
            dispositivoId: detalle.dispositivoId,
            tipoMovimiento: 'devolucion',
            estadoAnterior: `stock: ${stockAnterior}`,
            estadoNuevo: `stock: ${stockAnterior} (${cantidadDevuelta} uds ${nuevoEstado})`,
            descripcion: `Devuelto de ${acta.nombreReceptor} - ${cantidadDevuelta} uds marcadas como ${nuevoEstado}${devolucion.observaciones ? ' - ' + devolucion.observaciones : ''}`,
            actaId: acta.id,
            fecha: new Date(),
            Uid
          }, { transaction });
        }
      } else {
        // Dispositivo individual: cambiar estado
        await Dispositivo.update(
          {
            estado: nuevoEstado as any,
            condicion: devolucion.condicionDevolucion
          },
          { where: { id: detalle.dispositivoId }, transaction }
        );

        // Registrar movimiento
        await MovimientoDispositivo.create({
          dispositivoId: detalle.dispositivoId,
          tipoMovimiento: 'devolucion',
          estadoAnterior: 'entregado',
          estadoNuevo: nuevoEstado,
          descripcion: `Devuelto de ${acta.nombreReceptor} - Estado: ${nuevoEstado}${devolucion.observaciones ? ' - ' + devolucion.observaciones : ''}`,
          actaId: acta.id,
          fecha: new Date(),
          Uid
        }, { transaction });
      }
      
      console.log('   ✅ Movimiento registrado');
    }
    
    // Verificar si todos los dispositivos fueron devueltos
    const detallesActualizados = await DetalleActa.findAll({
      where: { actaId: acta.id },
      transaction
    });
    
    const todosDevueltos = detallesActualizados.every(d => d.devuelto);
    const algunoDevuelto = detallesActualizados.some(d => d.devuelto);
    
    let nuevoEstadoActa = acta.estado;
    if (todosDevueltos) {
      nuevoEstadoActa = 'devuelta_completa';
    } else if (algunoDevuelto) {
      nuevoEstadoActa = 'devuelta_parcial';
    }
    
    await acta.update({
      estado: nuevoEstadoActa,
      observacionesDevolucion,
      fechaDevolucionReal: todosDevueltos ? new Date() : null
    }, { transaction });
    
    await transaction.commit();
    
    // Obtener acta actualizada
    const actaActualizada = await ActaEntrega.findByPk(Number(id), {
      include: [
        {
          model: DetalleActa,
          as: 'detalles',
          include: [
            {
              model: Dispositivo,
              as: 'dispositivo'
            }
          ]
        }
      ]
    });
    
    res.json({
      msg: todosDevueltos ? 'Devolución completa registrada' : 'Devolución parcial registrada',
      acta: actaActualizada
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al registrar devolución:', error);
    res.status(500).json({ msg: 'Error al registrar la devolución' });
  }
};

/**
 * Obtener actas activas (préstamos pendientes)
 */
export const obtenerActasActivas = async (req: Request, res: Response) => {
  try {
    const actas = await ActaEntrega.findAll({
      where: {
        estado: {
          [Op.in]: ['activa', 'devuelta_parcial']
        }
      },
      include: [
        {
          model: DetalleActa,
          as: 'detalles',
          where: { devuelto: false },
          required: false,
          include: [
            {
              model: Dispositivo,
              as: 'dispositivo',
              attributes: ['id', 'nombre', 'categoria', 'marca', 'modelo', 'serial']
            }
          ]
        }
      ],
      order: [['fechaEntrega', 'DESC']]
    });
    
    res.json(actas);
  } catch (error) {
    console.error('Error al obtener actas activas:', error);
    res.status(500).json({ msg: 'Error al obtener las actas activas' });
  }
};

/**
 * Obtener historial de entregas de un dispositivo específico
 */
export const obtenerHistorialDispositivo = async (req: Request, res: Response) => {
  try {
    const { dispositivoId } = req.params;
    
    const historial = await DetalleActa.findAll({
      where: { dispositivoId },
      include: [
        {
          model: ActaEntrega,
          as: 'acta',
          attributes: ['id', 'numeroActa', 'nombreReceptor', 'cargoReceptor', 'fechaEntrega', 'estado']
        }
      ],
      order: [[{ model: ActaEntrega, as: 'acta' }, 'fechaEntrega', 'DESC']]
    });
    
    res.json(historial);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ msg: 'Error al obtener el historial del dispositivo' });
  }
};

/**
 * Cancelar acta de entrega (pendiente o firmada)
 * Restaura el inventario y marca el acta como cancelada, manteniendo trazabilidad
 */
export const cancelarActaEntrega = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { Uid } = req.body;

    const acta = await ActaEntrega.findByPk(Number(id), {
      include: [
        {
          model: DetalleActa,
          as: 'detalles',
          include: [
            {
              model: Dispositivo,
              as: 'dispositivo'
            }
          ]
        }
      ],
      transaction
    });

    if (!acta) {
      await transaction.rollback();
      res.status(404).json({ msg: 'Acta no encontrada' });
      return;
    }

    if (acta.estado === 'cancelada') {
      await transaction.rollback();
      res.status(400).json({ msg: 'Esta acta ya está cancelada' });
      return;
    }

    const estadoAnterior = acta.estado;

    // Restaurar inventario para cada dispositivo del detalle
    const dispositivoIds: number[] = [];
    for (const detalle of (acta as any).detalles || []) {
      const dispositivo = detalle.dispositivo;
      if (!dispositivo) continue;

      dispositivoIds.push(dispositivo.id);

      if (estadoAnterior === 'pendiente_firma') {
        if (dispositivo.tipoRegistro === 'stock') {
          const cantidadReservada = detalle.cantidad || 1;

          // Verificar si usó modelo de reserva (stock NO fue reducido) o modelo viejo (stock SÍ fue reducido)
          const tieneReserva = await MovimientoDispositivo.findOne({
            where: {
              dispositivoId: dispositivo.id,
              actaId: acta.id,
              tipoMovimiento: 'reserva' as any
            },
            transaction
          });

          if (tieneReserva) {
            // Modelo nuevo: stock no fue reducido, solo liberar reserva
            await MovimientoDispositivo.create({
              dispositivoId: dispositivo.id,
              tipoMovimiento: 'cancelacion' as any,
              estadoAnterior: `stock: ${dispositivo.stockActual} (reserva: ${cantidadReservada})`,
              estadoNuevo: `stock: ${dispositivo.stockActual}`,
              descripcion: `Cancelación de Acta ${acta.numeroActa} - Reserva de ${cantidadReservada} uds liberada`,
              actaId: acta.id,
              fecha: new Date(),
              Uid
            }, { transaction });
          } else {
            // Modelo viejo: stock fue reducido al crear, restaurarlo
            const stockRestaurado = (dispositivo.stockActual || 0) + cantidadReservada;
            await Dispositivo.update(
              { stockActual: stockRestaurado },
              { where: { id: dispositivo.id }, transaction }
            );
            await MovimientoDispositivo.create({
              dispositivoId: dispositivo.id,
              tipoMovimiento: 'cancelacion' as any,
              estadoAnterior: `stock: ${dispositivo.stockActual}`,
              estadoNuevo: `stock: ${stockRestaurado}`,
              descripcion: `Cancelación de Acta ${acta.numeroActa} - Stock restaurado (${cantidadReservada} uds)`,
              actaId: acta.id,
              fecha: new Date(),
              Uid
            }, { transaction });
          }
        } else {
          await Dispositivo.update(
            { estado: 'disponible' },
            { where: { id: dispositivo.id }, transaction }
          );
          await MovimientoDispositivo.create({
            dispositivoId: dispositivo.id,
            tipoMovimiento: 'cancelacion' as any,
            estadoAnterior: 'reservado',
            estadoNuevo: 'disponible',
            descripcion: `Cancelación de Acta ${acta.numeroActa} - Dispositivo restaurado a disponible`,
            actaId: acta.id,
            fecha: new Date(),
            Uid
          }, { transaction });
        }
      } else if (['activa', 'devuelta_parcial', 'vencida'].includes(estadoAnterior)) {
        // FIRMADA: stock fue reducido, dispositivos individuales están 'entregado'
        // Solo restaurar items NO devueltos
        if (detalle.devuelto) continue;

        if (dispositivo.tipoRegistro === 'stock') {
          const cantidadEntregada = detalle.cantidad || 1;
          const stockRestaurado = (dispositivo.stockActual || 0) + cantidadEntregada;
          await Dispositivo.update(
            { stockActual: stockRestaurado, estado: 'disponible' },
            { where: { id: dispositivo.id }, transaction }
          );
          await MovimientoDispositivo.create({
            dispositivoId: dispositivo.id,
            tipoMovimiento: 'cancelacion' as any,
            estadoAnterior: `stock: ${dispositivo.stockActual}`,
            estadoNuevo: `stock: ${stockRestaurado}`,
            descripcion: `Cancelación post-firma de Acta ${acta.numeroActa} - Restaurado ${cantidadEntregada} uds`,
            actaId: acta.id,
            fecha: new Date(),
            Uid
          }, { transaction });
        } else {
          await Dispositivo.update(
            { estado: 'disponible' },
            { where: { id: dispositivo.id }, transaction }
          );
          await MovimientoDispositivo.create({
            dispositivoId: dispositivo.id,
            tipoMovimiento: 'cancelacion' as any,
            estadoAnterior: 'entregado',
            estadoNuevo: 'disponible',
            descripcion: `Cancelación post-firma de Acta ${acta.numeroActa} - Dispositivo restaurado a disponible`,
            actaId: acta.id,
            fecha: new Date(),
            Uid
          }, { transaction });
        }
      }
      // Para rechazada/devuelta_completa: inventario ya está restaurado, solo marcar cancelada
    }

    // Cancelar tokens de firma pendientes
    await TokenFirma.update(
      { estado: 'cancelado' },
      { where: { actaId: acta.id, estado: 'pendiente' }, transaction }
    );

    // Cambiar estado del acta a cancelada
    await acta.update({ estado: 'cancelada' }, { transaction });

    await transaction.commit();

    // Emitir eventos WebSocket
    const io = getIO();
    io.to('actas').emit('acta:cancelled', { actaId: acta.id });
    io.to('inventario').emit('dispositivo:updated', { multiple: true, ids: dispositivoIds });

    res.json({ msg: 'Acta cancelada exitosamente. El inventario ha sido restaurado.' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al cancelar acta:', error);
    res.status(500).json({ msg: 'Error al cancelar el acta' });
  }
};
