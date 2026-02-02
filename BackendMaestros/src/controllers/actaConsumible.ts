import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { ActaConsumible } from '../models/actaConsumible.js';
import { DetalleActaConsumible } from '../models/detalleActaConsumible.js';
import { TokenFirmaConsumible } from '../models/tokenFirmaConsumible.js';
import { Consumible } from '../models/consumible.js';
import { MovimientoConsumible } from '../models/movimientoConsumible.js';
import { TipoInventario } from '../models/tipoInventario.js';
import { User } from '../models/user.js';
import { getIO } from '../models/server.js';
import { enviarCorreoFirmaConsumible } from '../config/email.js';

/**
 * Generar número de acta único
 */
const generarNumeroActa = async (tipoInventarioCodigo: string): Promise<string> => {
  const prefijo = tipoInventarioCodigo.toUpperCase();
  const año = new Date().getFullYear();
  
  // Buscar el último número del año para ese tipo
  const ultimaActa = await ActaConsumible.findOne({
    where: {
      numeroActa: {
        [Op.like]: `ACTA-${prefijo}-${año}-%`
      }
    },
    order: [['numeroActa', 'DESC']]
  });
  
  let siguiente = 1;
  if (ultimaActa) {
    const partes = ultimaActa.numeroActa.split('-');
    siguiente = parseInt(partes[partes.length - 1]) + 1;
  }
  
  return `ACTA-${prefijo}-${año}-${String(siguiente).padStart(4, '0')}`;
};

/**
 * Obtener todas las actas de consumibles
 */
export const obtenerActasConsumibles = async (req: Request, res: Response) => {
  try {
    const { tipoInventarioCodigo, estado } = req.query;
    
    let where: any = {};
    
    if (tipoInventarioCodigo) {
      const tipo = await TipoInventario.findOne({
        where: { codigo: tipoInventarioCodigo, activo: true }
      });
      if (tipo) {
        where.tipoInventarioId = tipo.id;
      }
    }
    
    if (estado) {
      where.estado = estado;
    }
    
    const actas = await ActaConsumible.findAll({
      where,
      include: [
        { model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] },
        { model: User, as: 'creador', attributes: ['Uid', 'nombre', 'apellido'] },
        {
          model: DetalleActaConsumible,
          as: 'detalles',
          include: [
            { model: Consumible, as: 'consumible', attributes: ['id', 'nombre', 'categoria', 'unidadMedida'] }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(actas);
  } catch (error) {
    console.error('Error al obtener actas de consumibles:', error);
    res.status(500).json({ msg: 'Error al obtener las actas' });
  }
};

/**
 * Obtener actas por tipo de inventario (aseo o papeleria)
 */
export const obtenerActasPorTipo = async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params; // 'aseo' o 'papeleria'
    const { estado } = req.query;
    
    const tipoInventario = await TipoInventario.findOne({
      where: { codigo, activo: true }
    });
    
    if (!tipoInventario) {
      res.status(404).json({ msg: 'Tipo de inventario no encontrado' });
      return;
    }
    
    let where: any = { tipoInventarioId: tipoInventario.id };
    
    if (estado) {
      where.estado = estado;
    }
    
    const actas = await ActaConsumible.findAll({
      where,
      include: [
        { model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] },
        { model: User, as: 'creador', attributes: ['Uid', 'nombre', 'apellido'] },
        {
          model: DetalleActaConsumible,
          as: 'detalles',
          include: [
            { model: Consumible, as: 'consumible', attributes: ['id', 'nombre', 'categoria', 'unidadMedida'] }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(actas);
  } catch (error) {
    console.error('Error al obtener actas por tipo:', error);
    res.status(500).json({ msg: 'Error al obtener las actas' });
  }
};

/**
 * Obtener un acta por ID
 */
export const obtenerActaPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const acta = await ActaConsumible.findByPk(Number(id), {
      include: [
        { model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] },
        { model: User, as: 'creador', attributes: ['Uid', 'nombre', 'apellido'] },
        {
          model: DetalleActaConsumible,
          as: 'detalles',
          include: [
            { model: Consumible, as: 'consumible', attributes: ['id', 'nombre', 'categoria', 'unidadMedida', 'descripcion'] }
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
 * Crear nueva acta de entrega de consumibles
 */
export const crearActaConsumible = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      tipoInventarioCodigo,
      nombreReceptor,
      cedulaReceptor,
      cargoReceptor,
      areaReceptor,
      correoReceptor,
      observaciones,
      articulos, // Array de { consumibleId, cantidad, observaciones }
      Uid
    } = req.body;
    
    // Validar tipo de inventario
    const tipoInventario = await TipoInventario.findOne({
      where: { codigo: tipoInventarioCodigo, activo: true }
    });
    
    if (!tipoInventario) {
      res.status(400).json({ msg: 'Tipo de inventario no válido' });
      return;
    }
    
    // Validar que haya artículos
    if (!articulos || articulos.length === 0) {
      res.status(400).json({ msg: 'Debe incluir al menos un artículo' });
      return;
    }
    
    // Validar stock disponible para cada artículo
    for (const art of articulos) {
      const consumible = await Consumible.findByPk(art.consumibleId);
      if (!consumible) {
        res.status(400).json({ msg: `Artículo con ID ${art.consumibleId} no encontrado` });
        return;
      }
      if (consumible.stockActual < art.cantidad) {
        res.status(400).json({ 
          msg: `Stock insuficiente para "${consumible.nombre}". Disponible: ${consumible.stockActual}, Solicitado: ${art.cantidad}` 
        });
        return;
      }
    }
    
    // Generar número de acta
    const numeroActa = await generarNumeroActa(tipoInventarioCodigo);
    
    // Crear el acta
    const acta = await ActaConsumible.create({
      numeroActa,
      tipoInventarioId: tipoInventario.id,
      nombreReceptor,
      cedulaReceptor,
      cargoReceptor,
      areaReceptor,
      correoReceptor,
      observaciones,
      estado: 'pendiente_firma',
      fechaEntrega: new Date(),
      Uid
    });
    
    // Crear los detalles y descontar stock
    for (const art of articulos) {
      const consumible = await Consumible.findByPk(art.consumibleId);
      if (!consumible) continue;
      
      // Crear detalle
      await DetalleActaConsumible.create({
        actaConsumibleId: acta.id,
        consumibleId: art.consumibleId,
        cantidad: art.cantidad,
        unidadMedida: consumible.unidadMedida,
        observaciones: art.observaciones
      });
      
      // Descontar stock
      const stockAnterior = consumible.stockActual;
      const stockNuevo = stockAnterior - art.cantidad;
      
      await consumible.update({ stockActual: stockNuevo });
      
      // Registrar movimiento
      await MovimientoConsumible.create({
        consumibleId: art.consumibleId,
        tipoMovimiento: 'salida',
        cantidad: art.cantidad,
        stockAnterior,
        stockNuevo,
        motivo: 'entrega',
        descripcion: `Entrega por Acta ${numeroActa} a ${nombreReceptor}`,
        actaEntregaId: acta.id,
        fecha: new Date(),
        Uid
      });
    }
    
    // Generar token de firma
    const token = uuidv4();
    const fechaExpiracion = new Date();
    fechaExpiracion.setDate(fechaExpiracion.getDate() + 7); // 7 días de validez
    
    await TokenFirmaConsumible.create({
      actaConsumibleId: acta.id,
      token,
      fechaExpiracion
    });
    
    // Enviar correo con enlace de firma
    if (correoReceptor) {
      try {
        await enviarCorreoFirmaConsumible(
          correoReceptor,
          nombreReceptor,
          numeroActa,
          token,
          tipoInventarioCodigo
        );
      } catch (emailError) {
        console.error('Error al enviar correo:', emailError);
        // No fallar la operación si el correo falla
      }
    }
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('actas-consumibles').emit('acta:created', {
      acta,
      tipoInventarioCodigo
    });
    
    // Obtener acta completa para respuesta
    const actaCompleta = await ActaConsumible.findByPk(acta.id, {
      include: [
        { model: TipoInventario, as: 'tipoInventario' },
        {
          model: DetalleActaConsumible,
          as: 'detalles',
          include: [{ model: Consumible, as: 'consumible' }]
        }
      ]
    });
    
    res.status(201).json({
      msg: 'Acta creada exitosamente',
      acta: actaCompleta,
      token
    });
  } catch (error) {
    console.error('Error al crear acta de consumibles:', error);
    res.status(500).json({ msg: 'Error al crear el acta' });
  }
};

/**
 * Obtener acta por token de firma
 */
export const obtenerActaPorToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    
    const tokenFirma = await TokenFirmaConsumible.findOne({
      where: { token },
      include: [
        {
          model: ActaConsumible,
          as: 'acta',
          include: [
            { model: TipoInventario, as: 'tipoInventario' },
            {
              model: DetalleActaConsumible,
              as: 'detalles',
              include: [{ model: Consumible, as: 'consumible' }]
            }
          ]
        }
      ]
    });
    
    if (!tokenFirma) {
      res.status(404).json({ msg: 'Token no válido o expirado' });
      return;
    }
    
    if (tokenFirma.usado) {
      res.status(400).json({ msg: 'Este enlace ya fue utilizado' });
      return;
    }
    
    if (new Date() > tokenFirma.fechaExpiracion) {
      res.status(400).json({ msg: 'Este enlace ha expirado' });
      return;
    }
    
    res.json(tokenFirma.acta);
  } catch (error) {
    console.error('Error al obtener acta por token:', error);
    res.status(500).json({ msg: 'Error al obtener el acta' });
  }
};

/**
 * Firmar acta de consumibles
 */
export const firmarActa = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { firma, cedulaReceptor } = req.body;
    
    if (!firma) {
      res.status(400).json({ msg: 'La firma es requerida' });
      return;
    }
    
    const tokenFirma = await TokenFirmaConsumible.findOne({
      where: { token },
      include: [{ model: ActaConsumible, as: 'acta' }]
    });
    
    if (!tokenFirma) {
      res.status(404).json({ msg: 'Token no válido' });
      return;
    }
    
    if (tokenFirma.usado) {
      res.status(400).json({ msg: 'Este enlace ya fue utilizado' });
      return;
    }
    
    if (new Date() > tokenFirma.fechaExpiracion) {
      res.status(400).json({ msg: 'Este enlace ha expirado' });
      return;
    }
    
    const acta = tokenFirma.acta;
    if (!acta) {
      res.status(404).json({ msg: 'Acta no encontrada' });
      return;
    }
    
    // Actualizar acta
    await acta.update({
      firmaReceptor: firma,
      cedulaReceptor: cedulaReceptor || acta.cedulaReceptor,
      fechaFirma: new Date(),
      estado: 'firmada'
    });
    
    // Marcar token como usado
    await tokenFirma.update({ usado: true });
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('actas-consumibles').emit('acta:signed', { actaId: acta.id });
    
    res.json({
      msg: 'Acta firmada exitosamente',
      acta
    });
  } catch (error) {
    console.error('Error al firmar acta:', error);
    res.status(500).json({ msg: 'Error al firmar el acta' });
  }
};

/**
 * Rechazar acta de consumibles
 */
export const rechazarActa = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { motivoRechazo } = req.body;
    
    if (!motivoRechazo) {
      res.status(400).json({ msg: 'El motivo de rechazo es requerido' });
      return;
    }
    
    const tokenFirma = await TokenFirmaConsumible.findOne({
      where: { token },
      include: [
        {
          model: ActaConsumible,
          as: 'acta',
          include: [
            {
              model: DetalleActaConsumible,
              as: 'detalles'
            }
          ]
        }
      ]
    });
    
    if (!tokenFirma || !tokenFirma.acta) {
      res.status(404).json({ msg: 'Token no válido' });
      return;
    }
    
    if (tokenFirma.usado) {
      res.status(400).json({ msg: 'Este enlace ya fue utilizado' });
      return;
    }
    
    const acta = tokenFirma.acta;
    
    // Revertir el stock
    for (const detalle of acta.detalles || []) {
      const consumible = await Consumible.findByPk(detalle.consumibleId);
      if (consumible) {
        const stockAnterior = consumible.stockActual;
        const stockNuevo = stockAnterior + detalle.cantidad;
        
        await consumible.update({ stockActual: stockNuevo });
        
        // Registrar movimiento de devolución
        await MovimientoConsumible.create({
          consumibleId: detalle.consumibleId,
          tipoMovimiento: 'devolucion',
          cantidad: detalle.cantidad,
          stockAnterior,
          stockNuevo,
          motivo: 'rechazo_acta',
          descripcion: `Devolución por rechazo del Acta ${acta.numeroActa}. Motivo: ${motivoRechazo}`,
          actaEntregaId: acta.id,
          fecha: new Date()
        });
      }
    }
    
    // Actualizar acta
    await acta.update({
      estado: 'rechazada',
      motivoRechazo
    });
    
    // Marcar token como usado
    await tokenFirma.update({ usado: true });
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('actas-consumibles').emit('acta:rejected', { actaId: acta.id, motivoRechazo });
    
    res.json({
      msg: 'Acta rechazada. El stock ha sido devuelto.',
      acta
    });
  } catch (error) {
    console.error('Error al rechazar acta:', error);
    res.status(500).json({ msg: 'Error al rechazar el acta' });
  }
};

/**
 * Estadísticas de actas de consumibles
 */
export const obtenerEstadisticas = async (req: Request, res: Response) => {
  try {
    const { tipoInventarioCodigo } = req.query;
    
    let where: any = {};
    
    if (tipoInventarioCodigo) {
      const tipo = await TipoInventario.findOne({
        where: { codigo: tipoInventarioCodigo, activo: true }
      });
      if (tipo) {
        where.tipoInventarioId = tipo.id;
      }
    }
    
    const total = await ActaConsumible.count({ where });
    const pendientes = await ActaConsumible.count({ where: { ...where, estado: 'pendiente_firma' } });
    const firmadas = await ActaConsumible.count({ where: { ...where, estado: 'firmada' } });
    const rechazadas = await ActaConsumible.count({ where: { ...where, estado: 'rechazada' } });
    
    res.json({
      total,
      pendientes,
      firmadas,
      rechazadas
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ msg: 'Error al obtener estadísticas' });
  }
};

/**
 * Reenviar correo de firma
 */
export const reenviarCorreoFirma = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const acta = await ActaConsumible.findByPk(Number(id), {
      include: [
        { model: TipoInventario, as: 'tipoInventario' },
        { model: TokenFirmaConsumible, as: 'tokenFirma' }
      ]
    });
    
    if (!acta) {
      res.status(404).json({ msg: 'Acta no encontrada' });
      return;
    }
    
    if (acta.estado !== 'pendiente_firma') {
      res.status(400).json({ msg: 'El acta ya fue procesada' });
      return;
    }
    
    // Generar nuevo token si el anterior expiró
    let token = (acta as any).tokenFirma?.token;
    const tokenExpirado = (acta as any).tokenFirma?.fechaExpiracion && 
                          new Date() > new Date((acta as any).tokenFirma.fechaExpiracion);
    
    if (!token || tokenExpirado) {
      token = uuidv4();
      const fechaExpiracion = new Date();
      fechaExpiracion.setDate(fechaExpiracion.getDate() + 7);
      
      if ((acta as any).tokenFirma) {
        await (acta as any).tokenFirma.update({
          token,
          fechaExpiracion,
          usado: false
        });
      } else {
        await TokenFirmaConsumible.create({
          actaConsumibleId: acta.id,
          token,
          fechaExpiracion
        });
      }
    }
    
    // Enviar correo
    await enviarCorreoFirmaConsumible(
      acta.correoReceptor,
      acta.nombreReceptor,
      acta.numeroActa,
      token,
      (acta as any).tipoInventario?.codigo || 'consumible'
    );
    
    res.json({ msg: 'Correo reenviado exitosamente' });
  } catch (error) {
    console.error('Error al reenviar correo:', error);
    res.status(500).json({ msg: 'Error al reenviar el correo' });
  }
};
