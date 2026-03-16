import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database/connection.js';
import { ActaDevolucion } from '../models/actaDevolucion.js';
import { DetalleDevolucion } from '../models/detalleDevolucion.js';
import { TokenDevolucion } from '../models/tokenDevolucion.js';
import { Dispositivo } from '../models/dispositivo.js';
import { MovimientoDispositivo } from '../models/movimientoDispositivo.js';
import { enviarCorreoDevolucion, enviarConfirmacionDevolucion } from '../config/email.js';
import { getPhotoUrl } from '../config/multer.js';
import { getIO } from '../models/server.js';

/**
 * Generar número de acta de devolución único
 */
const generarNumeroActaDevolucion = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const ultimaActa = await ActaDevolucion.findOne({
    where: {
      numeroActa: {
        [Op.like]: `DEV-${year}-%`
      }
    },
    order: [['id', 'DESC']]
  });
  
  let numero = 1;
  if (ultimaActa) {
    const partes = ultimaActa.numeroActa.split('-');
    numero = parseInt(partes[2]) + 1;
  }
  
  return `DEV-${year}-${numero.toString().padStart(4, '0')}`;
};

/**
 * Obtener dispositivos entregados (disponibles para devolución)
 * Si viene ?actaId=X, trae los dispositivos de esa acta específica
 * Si no, trae todos los dispositivos entregados no devueltos
 */
export const obtenerDispositivosEntregados = async (req: Request, res: Response) => {
  try {
    const { actaId } = req.query;

    // Buscar directamente desde detalles_acta + dispositivos
    // Esto funciona tanto para dispositivos individuales como stock
    let whereClause = `da.devuelto = false AND ae.estado IN ('activa', 'devuelta_parcial')`;
    const replacements: any = {};

    if (actaId) {
      whereClause += ` AND da."actaId" = :actaId`;
      replacements.actaId = Number(actaId);
    }

    const resultados = await sequelize.query(`
      SELECT
        d.id,
        d.nombre,
        d.categoria,
        d.marca,
        d.modelo,
        d.serial,
        d.imei,
        d.descripcion,
        d.condicion,
        d."tipoRegistro",
        da."actaId" as "actaId",
        da.cantidad,
        ae."nombreReceptor" as receptor
      FROM detalles_acta da
      INNER JOIN dispositivos d ON da."dispositivoId" = d.id
      INNER JOIN actas_entrega ae ON da."actaId" = ae.id
      WHERE ${whereClause}
      ORDER BY d.nombre ASC
    `, {
      replacements,
      type: 'SELECT' as any
    }) as any[];

    res.json(resultados);
  } catch (error) {
    console.error('Error al obtener dispositivos entregados:', error);
    res.status(500).json({ msg: 'Error al obtener los dispositivos entregados' });
  }
};

/**
 * Obtener todas las actas de devolución
 */
export const obtenerActasDevolucion = async (req: Request, res: Response) => {
  try {
    const { estado, busqueda } = req.query;
    
    let where: any = {};
    
    if (estado && estado !== 'todas') {
      where.estado = estado;
    }
    
    if (busqueda) {
      where[Op.or] = [
        { numeroActa: { [Op.iLike]: `%${busqueda}%` } },
        { nombreEntrega: { [Op.iLike]: `%${busqueda}%` } },
        { nombreReceptor: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }
    
    const actas = await ActaDevolucion.findAll({
      where,
      include: [
        {
          model: DetalleDevolucion,
          as: 'detalles',
          include: [
            {
              model: Dispositivo,
              as: 'dispositivo',
              attributes: ['id', 'nombre', 'categoria', 'marca', 'modelo', 'serial', 'imei']
            }
          ]
        }
      ],
      order: [['fechaDevolucion', 'DESC']]
    });
    
    console.log('📋 Actas de devolución encontradas:', actas.length);
    
    res.json({ actas });
  } catch (error) {
    console.error('Error al obtener actas de devolución:', error);
    res.status(500).json({ msg: 'Error al obtener las actas de devolución' });
  }
};

/**
 * Obtener acta de devolución por ID
 */
export const obtenerActaDevolucionPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const acta = await ActaDevolucion.findByPk(Number(id), {
      include: [
        {
          model: DetalleDevolucion,
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
      res.status(404).json({ msg: 'Acta de devolución no encontrada' });
      return;
    }
    
    res.json(acta);
  } catch (error) {
    console.error('Error al obtener acta de devolución:', error);
    res.status(500).json({ msg: 'Error al obtener el acta de devolución' });
  }
};

/**
 * Crear nueva acta de devolución
 */
export const crearActaDevolucion = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      nombreReceptor,
      cargoReceptor,
      correoReceptor,
      firmaReceptor,  // Firma del receptor (sistemas) al crear el acta
      nombreEntrega,
      cargoEntrega,
      correoEntrega,
      observaciones,
      dispositivos: dispositivosRaw,
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
    
    console.log('📦 Creando acta de devolución...');
    console.log('   Quien devuelve:', nombreEntrega, '- Correo:', correoEntrega);
    console.log('   Quien recibe:', nombreReceptor);
    console.log('   Dispositivos:', dispositivos?.length || 0);
    console.log('   Firma receptor incluida:', !!firmaReceptor);
    
    // Validar que haya dispositivos
    if (!dispositivos || !Array.isArray(dispositivos) || dispositivos.length === 0) {
      await transaction.rollback();
      res.status(400).json({ msg: 'Debe seleccionar al menos un dispositivo para devolver' });
      return;
    }
    
    // Validar correo del empleado (para enviar solicitud de firma)
    if (!correoEntrega) {
      await transaction.rollback();
      res.status(400).json({ msg: 'El correo del empleado que devuelve es requerido' });
      return;
    }
    
    // Verificar que todos los dispositivos existan
    const dispositivosIds = dispositivos.map((d: any) => d.dispositivoId);
    const dispositivosDB = await Dispositivo.findAll({
      where: { id: dispositivosIds },
      transaction
    });

    // Validar: individuales deben estar en estado 'entregado', stock solo deben existir
    const noValidos = dispositivosDB.filter(d => {
      if (d.tipoRegistro === 'stock') return false; // Stock siempre se puede devolver
      return d.estado !== 'entregado';
    });
    if (noValidos.length > 0) {
      await transaction.rollback();
      res.status(400).json({
        msg: 'Algunos dispositivos no están en estado entregado',
        dispositivos: noValidos.map(d => d.nombre)
      });
      return;
    }
    
    // Generar número de acta
    const numeroActa = await generarNumeroActaDevolucion();
    
    // Crear el acta con la firma del receptor (sistemas)
    const acta = await ActaDevolucion.create({
      numeroActa,
      nombreReceptor,
      cargoReceptor,
      correoReceptor,
      nombreEntrega,
      cargoEntrega,
      correoEntrega,
      firmaEntrega: null,  // Se firmará por correo
      firmaReceptor: firmaReceptor || null,  // Firma del de sistemas al crear
      fechaDevolucion: new Date(),
      estado: 'pendiente_firma',
      observaciones,
      Uid
    }, { transaction });
    
    console.log('   Acta creada:', numeroActa);
    
    // Procesar fotos si se subieron
    let fotosMap: { [key: string]: string[] } = {};
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        const dispositivoId = file.fieldname.replace('fotos_', '');
        if (!fotosMap[dispositivoId]) {
          fotosMap[dispositivoId] = [];
        }
        fotosMap[dispositivoId].push(getPhotoUrl(file.filename, 'devoluciones'));
      }
    }
    
    // Crear detalles del acta y reservar dispositivos
    for (const item of dispositivos) {
      const dispositivo = dispositivosDB.find(d => d.id === item.dispositivoId);

      // Crear detalle
      await DetalleDevolucion.create({
        actaDevolucionId: acta.id,
        dispositivoId: item.dispositivoId,
        estadoDevolucion: item.estadoDevolucion || 'disponible',
        condicionDevolucion: item.condicionDevolucion || dispositivo?.condicion,
        fotosDevolucion: JSON.stringify(fotosMap[item.dispositivoId] || []),
        observaciones: item.observaciones
      }, { transaction });

      // Stock: no cambiar estado. Individual: cambiar a 'reservado'
      if (dispositivo?.tipoRegistro !== 'stock') {
        await Dispositivo.update(
          { estado: 'reservado' },
          { where: { id: item.dispositivoId }, transaction }
        );
      }

      // Registrar movimiento
      await MovimientoDispositivo.create({
        dispositivoId: item.dispositivoId,
        tipoMovimiento: 'reserva' as any,
        estadoAnterior: dispositivo?.tipoRegistro === 'stock' ? 'stock' : 'entregado',
        estadoNuevo: dispositivo?.tipoRegistro === 'stock' ? 'stock' : 'reservado',
        descripcion: `Reservado para devolución por ${nombreEntrega} - Acta ${numeroActa} pendiente de firma`,
        fecha: new Date(),
        Uid
      }, { transaction });
    }
    
    await transaction.commit();
    console.log('   ✅ Acta de devolución creada exitosamente');
    
    // Obtener acta completa con detalles
    const actaCompleta = await ActaDevolucion.findByPk(acta.id, {
      include: [
        {
          model: DetalleDevolucion,
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
    
    // Emitir evento WebSocket para actualización en tiempo real
    const io = getIO();
    io.to('devoluciones').emit('devolucion:created', actaCompleta);
    io.to('inventario').emit('dispositivo:updated', { multiple: true, ids: dispositivosIds });
    
    res.status(201).json({
      msg: 'Acta de devolución creada exitosamente',
      acta: actaCompleta
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al crear acta de devolución:', error);
    res.status(500).json({ msg: 'Error al crear el acta de devolución' });
  }
};

/**
 * Enviar correo de solicitud de firma para acta de devolución
 * Se envía al EMPLEADO que devuelve para que firme
 */
export const enviarSolicitudFirmaDevolucion = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();
  
  console.log('📧 [enviarSolicitudFirmaDevolucion] Iniciando proceso...');
  
  try {
    const { id } = req.params;
    
    const acta = await ActaDevolucion.findByPk(Number(id), {
      include: [
        {
          model: DetalleDevolucion,
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
      res.status(404).json({ msg: 'Acta de devolución no encontrada' });
      return;
    }
    
    // El correo se envía al EMPLEADO que devuelve (correoEntrega)
    if (!acta.correoEntrega) {
      await transaction.rollback();
      res.status(400).json({ msg: 'El acta no tiene correo del empleado que devuelve' });
      return;
    }
    
    console.log('   Acta encontrada:', acta.numeroActa);
    console.log('   Correo empleado (quien devuelve):', acta.correoEntrega);
    
    // Cancelar tokens anteriores pendientes
    await TokenDevolucion.update(
      { estado: 'cancelado' },
      { 
        where: { 
          actaDevolucionId: acta.id, 
          estado: 'pendiente' 
        },
        transaction 
      }
    );
    
    // Generar nuevo token
    const token = uuidv4();
    
    // Crear registro del token - se envía al empleado
    await TokenDevolucion.create({
      token,
      actaDevolucionId: acta.id,
      correoDestinatario: acta.correoEntrega,
      estado: 'pendiente',
      fechaEnvio: new Date()
    }, { transaction });
    
    console.log('   Token generado:', token.substring(0, 8) + '...');
    
    // Preparar lista de dispositivos para el correo
    const dispositivos = acta.detalles?.map((d: any) => ({
      tipo: d.dispositivo?.categoria || 'Dispositivo',
      marca: d.dispositivo?.marca || '',
      modelo: d.dispositivo?.modelo || '',
      serial: d.dispositivo?.serial || 'N/A',
      imei: d.dispositivo?.imei || 'N/A',
      nombre: d.dispositivo?.nombre
    })) || [];
    
    // Enviar correo al EMPLEADO (nombreEntrega)
    console.log('   Enviando correo a:', acta.correoEntrega);
    await enviarCorreoDevolucion(
      acta.correoEntrega,
      acta.nombreEntrega,  // Nombre del empleado
      token,
      dispositivos,
      acta.observaciones
    );
    
    await transaction.commit();
    console.log('   ✅ Correo enviado exitosamente');
    
    res.json({
      msg: 'Solicitud de firma enviada correctamente',
      correo: acta.correoEntrega
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('❌ Error al enviar solicitud de firma:', error);
    res.status(500).json({ msg: error.message || 'Error al enviar la solicitud de firma' });
  }
};

/**
 * Obtener datos del acta de devolución por token (PÚBLICO)
 */
export const obtenerActaDevolucionPorToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    
    const tokenFirma = await TokenDevolucion.findOne({
      where: { token },
      include: [
        {
          model: ActaDevolucion,
          as: 'actaDevolucion',
          include: [
            {
              model: DetalleDevolucion,
              as: 'detalles',
              include: [
                {
                  model: Dispositivo,
                  as: 'dispositivo',
                  attributes: ['id', 'nombre', 'categoria', 'marca', 'modelo', 'serial', 'imei', 'descripcion']
                }
              ]
            }
          ]
        }
      ]
    });
    
    if (!tokenFirma) {
      res.status(404).json({ msg: 'Token inválido o no encontrado' });
      return;
    }
    
    if (tokenFirma.estado === 'firmado') {
      res.status(400).json({ 
        msg: 'Este acta ya ha sido firmada',
        fechaFirma: tokenFirma.fechaFirma
      });
      return;
    }
    
    if (tokenFirma.estado === 'rechazado') {
      res.status(400).json({ 
        msg: 'Este acta fue rechazada',
        motivo: tokenFirma.motivoRechazo
      });
      return;
    }
    
    if (tokenFirma.estado === 'cancelado') {
      res.status(400).json({ msg: 'Este enlace ha sido cancelado' });
      return;
    }
    
    const acta = tokenFirma.actaDevolucion as any;
    
    // Formatear respuesta - IMPORTANTE: envolver en "acta" para el frontend
    const actaResponse = {
      id: acta.id,
      numeroActa: acta.numeroActa,
      nombreReceptor: acta.nombreReceptor,
      cargoReceptor: acta.cargoReceptor,
      correoReceptor: acta.correoReceptor,
      nombreEntrega: acta.nombreEntrega,
      cargoEntrega: acta.cargoEntrega,
      correoEntrega: acta.correoEntrega,
      firmaReceptor: acta.firmaReceptor,
      firmaEntrega: acta.firmaEntrega,
      fechaDevolucion: acta.fechaDevolucion,
      estado: acta.estado,
      observaciones: acta.observaciones,
      createdAt: acta.createdAt,
      DetallesDevolucion: acta.detalles?.map((d: any) => ({
        id: d.id,
        estadoDevolucion: d.estadoDevolucion,
        condicionDevolucion: d.condicionDevolucion,
        observaciones: d.observaciones,
        Maestro: d.dispositivo ? {
          id: d.dispositivo.id,
          nombre: d.dispositivo.nombre,
          tipo: d.dispositivo.categoria,
          categoria: d.dispositivo.categoria,
          marca: d.dispositivo.marca,
          modelo: d.dispositivo.modelo,
          serial: d.dispositivo.serial,
          imei: d.dispositivo.imei,
          descripcion: d.dispositivo.descripcion
        } : null
      })) || []
    };
    
    res.json({ acta: actaResponse });
  } catch (error) {
    console.error('Error al obtener acta por token:', error);
    res.status(500).json({ msg: 'Error al obtener los datos del acta' });
  }
};

/**
 * Firmar acta de devolución con token (PÚBLICO)
 * El EMPLEADO que devuelve firma desde el correo
 */
export const firmarActaDevolucionConToken = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();
  
  try {
    const { token } = req.params;
    const { firma } = req.body;
    
    if (!firma) {
      res.status(400).json({ msg: 'La firma es requerida' });
      return;
    }
    
    const tokenFirma = await TokenDevolucion.findOne({
      where: { token, estado: 'pendiente' },
      include: [
        {
          model: ActaDevolucion,
          as: 'actaDevolucion',
          include: [
            {
              model: DetalleDevolucion,
              as: 'detalles',
              include: [
                {
                  model: Dispositivo,
                  as: 'dispositivo'
                }
              ]
            }
          ]
        }
      ],
      transaction
    });
    
    if (!tokenFirma) {
      await transaction.rollback();
      res.status(404).json({ msg: 'Token inválido o ya utilizado' });
      return;
    }
    
    const acta = tokenFirma.actaDevolucion as any;
    
    console.log('✍️ Firmando acta de devolución:', acta.numeroActa);
    console.log('   Empleado que firma:', acta.nombreEntrega);
    
    // Actualizar acta con la firma del EMPLEADO (firmaEntrega)
    await acta.update({
      firmaEntrega: firma,  // Firma del empleado que devuelve
      estado: 'completada',
      fechaFirma: new Date()
    }, { transaction });
    
    // Actualizar token
    await tokenFirma.update({
      estado: 'firmado',
      fechaFirma: new Date(),
      ipFirma: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent']
    }, { transaction });
    
    // Cambiar estado de dispositivos a disponible (o dañado/perdido según corresponda)
    for (const detalle of acta.detalles || []) {
      const dispositivo = detalle.dispositivo;
      const esStock = dispositivo?.tipoRegistro === 'stock';

      let nuevoEstado = 'disponible';
      if (detalle.estadoDevolucion === 'dañado') {
        nuevoEstado = 'dañado';
      } else if (detalle.estadoDevolucion === 'perdido') {
        nuevoEstado = 'perdido';
      }

      if (esStock) {
        // Stock: devolver cantidad al stockActual, NO cambiar estado
        const cantidadDevuelta = detalle.cantidad || 1;
        await sequelize.query(`
          UPDATE dispositivos
          SET "stockActual" = "stockActual" + :cantidad
          WHERE id = :id
        `, {
          replacements: { cantidad: cantidadDevuelta, id: detalle.dispositivoId },
          transaction
        });
      } else {
        // Individual: cambiar estado
        await Dispositivo.update(
          {
            estado: nuevoEstado as any,
            condicion: detalle.condicionDevolucion
          },
          { where: { id: detalle.dispositivoId }, transaction }
        );
      }

      // Registrar movimiento
      await MovimientoDispositivo.create({
        dispositivoId: detalle.dispositivoId,
        tipoMovimiento: 'devolucion',
        estadoAnterior: esStock ? 'stock' : 'reservado',
        estadoNuevo: esStock ? 'stock' : nuevoEstado,
        descripcion: `Devolución firmada - ${acta.numeroActa} - Devuelto por ${acta.nombreEntrega}`,
        fecha: new Date()
      }, { transaction });

      console.log(`   Dispositivo ${detalle.dispositivoId} -> ${esStock ? 'stock +cantidad' : nuevoEstado}`);
    }
    
    await transaction.commit();
    console.log('   ✅ Acta de devolución firmada exitosamente');
    
    // Emitir evento WebSocket para actualización en tiempo real
    const io = getIO();
    const dispositivosIds = acta.detalles.map((d: any) => d.dispositivoId);
    io.to('devoluciones').emit('devolucion:signed', { actaId: acta.id, estado: 'completada' });
    io.to('inventario').emit('dispositivo:updated', { multiple: true, ids: dispositivosIds });
    
    // Enviar confirmación por correo (async, no bloqueante)
    const dispositivos = acta.detalles?.map((d: any) => ({
      tipo: d.dispositivo?.categoria || 'Dispositivo',
      marca: d.dispositivo?.marca || '',
      modelo: d.dispositivo?.modelo || '',
      serial: d.dispositivo?.serial || 'N/A',
      estadoDevolucion: d.estadoDevolucion
    })) || [];
    
    const destinatarios = [acta.correoReceptor];
    if (acta.correoEntrega) {
      destinatarios.push(acta.correoEntrega);
    }
    
    enviarConfirmacionDevolucion(
      destinatarios,
      acta.nombreEntrega,
      dispositivos,
      new Date()
    ).catch(err => console.error('Error enviando confirmación:', err));
    
    res.json({
      msg: 'Acta de devolución firmada correctamente',
      numeroActa: acta.numeroActa
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al firmar acta de devolución:', error);
    res.status(500).json({ msg: 'Error al procesar la firma' });
  }
};

/**
 * Rechazar acta de devolución con token (PÚBLICO)
 */
export const rechazarActaDevolucionConToken = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();
  
  try {
    const { token } = req.params;
    const { motivo } = req.body;
    
    if (!motivo || !motivo.trim()) {
      res.status(400).json({ msg: 'Debe indicar el motivo del rechazo' });
      return;
    }
    
    const tokenFirma = await TokenDevolucion.findOne({
      where: { token, estado: 'pendiente' },
      include: [
        {
          model: ActaDevolucion,
          as: 'actaDevolucion',
          include: [
            {
              model: DetalleDevolucion,
              as: 'detalles'
            }
          ]
        }
      ],
      transaction
    });
    
    if (!tokenFirma) {
      await transaction.rollback();
      res.status(404).json({ msg: 'Token inválido o ya utilizado' });
      return;
    }
    
    const acta = tokenFirma.actaDevolucion as any;
    
    // Actualizar acta
    await acta.update({
      estado: 'rechazada'
    }, { transaction });
    
    // Actualizar token
    await tokenFirma.update({
      estado: 'rechazado',
      motivoRechazo: motivo
    }, { transaction });
    
    // Revertir estado de dispositivos individuales a "entregado" (stock no cambia)
    for (const detalle of acta.detalles || []) {
      // Necesitamos saber si es stock - cargar el dispositivo
      const dispositivo = await Dispositivo.findByPk(detalle.dispositivoId, { transaction });
      const esStock = dispositivo?.tipoRegistro === 'stock';

      if (!esStock) {
        await Dispositivo.update(
          { estado: 'entregado' },
          { where: { id: detalle.dispositivoId }, transaction }
        );
      }

      // Registrar movimiento
      await MovimientoDispositivo.create({
        dispositivoId: detalle.dispositivoId,
        tipoMovimiento: 'cambio_estado',
        estadoAnterior: esStock ? 'stock' : 'reservado',
        estadoNuevo: esStock ? 'stock' : 'entregado',
        descripcion: `Devolución rechazada - ${acta.numeroActa} - Motivo: ${motivo}`,
        fecha: new Date()
      }, { transaction });
    }
    
    await transaction.commit();
    
    // Emitir evento WebSocket para actualización en tiempo real
    const io = getIO();
    const dispositivosIds = (acta.detalles || []).map((d: any) => d.dispositivoId);
    io.to('devoluciones').emit('devolucion:rejected', { actaId: acta.id, estado: 'rechazada', motivo });
    io.to('inventario').emit('dispositivo:updated', { multiple: true, ids: dispositivosIds });
    
    res.json({
      msg: 'Acta de devolución rechazada',
      numeroActa: acta.numeroActa
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al rechazar acta de devolución:', error);
    res.status(500).json({ msg: 'Error al procesar el rechazo' });
  }
};

/**
 * Reenviar correo de firma para acta de devolución
 */
export const reenviarCorreoDevolucion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const tokenFirma = await TokenDevolucion.findOne({
      where: { 
        actaDevolucionId: Number(id),
        estado: 'pendiente'
      },
      include: [
        {
          model: ActaDevolucion,
          as: 'actaDevolucion',
          include: [
            {
              model: DetalleDevolucion,
              as: 'detalles',
              include: [
                {
                  model: Dispositivo,
                  as: 'dispositivo'
                }
              ]
            }
          ]
        }
      ]
    });
    
    if (!tokenFirma) {
      res.status(404).json({ msg: 'No hay solicitud de firma pendiente para esta acta' });
      return;
    }
    
    const acta = tokenFirma.actaDevolucion as any;
    
    const dispositivos = acta?.detalles?.map((d: any) => ({
      tipo: d.dispositivo?.categoria || 'Dispositivo',
      marca: d.dispositivo?.marca || '',
      modelo: d.dispositivo?.modelo || '',
      serial: d.dispositivo?.serial || 'N/A',
      imei: d.dispositivo?.imei || 'N/A'
    })) || [];
    
    await enviarCorreoDevolucion(
      acta.correoReceptor,
      acta.nombreReceptor,
      tokenFirma.token,
      dispositivos,
      acta.observaciones
    );
    
    // Actualizar fecha de envío
    await tokenFirma.update({ fechaEnvio: new Date() });
    
    res.json({
      msg: 'Correo reenviado correctamente',
      correo: acta.correoReceptor
    });
  } catch (error: any) {
    console.error('Error al reenviar correo:', error);
    res.status(500).json({ msg: error.message || 'Error al reenviar el correo' });
  }
};
