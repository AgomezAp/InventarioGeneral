import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../database/connection.js';
import { TokenFirmaMobiliario } from '../models/tokenFirmaMobiliario.js';
import { ActaMobiliario } from '../models/actaMobiliario.js';
import { DetalleActaMobiliario } from '../models/detalleActaMobiliario.js';
import { Mobiliario } from '../models/mobiliario.js';
import { MovimientoMobiliario } from '../models/movimientoMobiliario.js';
import { enviarCorreoFirmaMobiliario, enviarActaMobiliarioFirmada } from '../config/email.js';
import { getIO } from '../models/server.js';

/**
 * Enviar correo de solicitud de firma para un acta de mobiliario
 */
export const enviarSolicitudFirmaMobiliario = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const acta = await ActaMobiliario.findByPk(Number(id), {
      include: [
        {
          model: DetalleActaMobiliario,
          as: 'detalles',
          include: [{ model: Mobiliario, as: 'mobiliario' }]
        }
      ],
      transaction
    });

    if (!acta) {
      await transaction.rollback();
      res.status(404).json({ msg: 'Acta no encontrada' });
      return;
    }

    if (!acta.correoReceptor) {
      await transaction.rollback();
      res.status(400).json({ msg: 'El acta no tiene correo de receptor' });
      return;
    }

    // Cancelar tokens anteriores pendientes
    await TokenFirmaMobiliario.update(
      { estado: 'cancelado' },
      { where: { actaMobiliarioId: acta.id, estado: 'pendiente' }, transaction }
    );

    // Generar nuevo token
    const token = uuidv4();

    await TokenFirmaMobiliario.create({
      token,
      actaMobiliarioId: acta.id,
      correoReceptor: acta.correoReceptor,
      estado: 'pendiente',
      fechaEnvio: new Date()
    }, { transaction });

    await acta.update({ estado: 'pendiente_firma' }, { transaction });

    // Preparar lista de muebles para el correo
    const muebles = acta.detalles?.map((d: any) => ({
      nombre: d.mobiliario?.nombre || 'Mueble',
      categoria: d.mobiliario?.categoria || '',
      cantidad: d.cantidad,
      unidad: d.mobiliario?.unidadMedida || 'und.'
    })) || [];

    // Enviar correo
    await enviarCorreoFirmaMobiliario(
      acta.correoReceptor,
      acta.nombreReceptor,
      token,
      muebles,
      acta.observacionesEntrega
    );

    await transaction.commit();

    res.json({
      msg: 'Solicitud de firma enviada correctamente',
      correo: acta.correoReceptor
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Error al enviar solicitud de firma mobiliario:', error);
    res.status(500).json({ msg: error.message || 'Error al enviar la solicitud de firma' });
  }
};

/**
 * Obtener datos del acta por token (PUBLICO - sin autenticacion)
 */
export const obtenerActaMobiliarioPorToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const tokenFirma = await TokenFirmaMobiliario.findOne({
      where: { token },
      include: [
        {
          model: ActaMobiliario,
          as: 'acta',
          include: [
            {
              model: DetalleActaMobiliario,
              as: 'detalles',
              include: [
                {
                  model: Mobiliario,
                  as: 'mobiliario',
                  attributes: ['id', 'nombre', 'categoria', 'descripcion', 'unidadMedida']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!tokenFirma) {
      res.status(404).json({ msg: 'Token invalido o no encontrado' });
      return;
    }

    if (tokenFirma.estado === 'firmado') {
      res.status(400).json({ msg: 'Este acta ya ha sido firmada', fechaFirma: tokenFirma.fechaFirma });
      return;
    }

    if (tokenFirma.estado === 'cancelado') {
      res.status(400).json({ msg: 'Este enlace ha sido cancelado. Solicite un nuevo enlace.' });
      return;
    }

    if (tokenFirma.estado === 'rechazado') {
      res.status(400).json({ msg: 'Este acta fue devuelta para correccion', motivo: tokenFirma.motivoRechazo });
      return;
    }

    const acta = tokenFirma.acta as any;

    const datosActa = {
      numeroActa: acta?.numeroActa,
      nombreReceptor: acta?.nombreReceptor,
      cargoReceptor: acta?.cargoReceptor,
      correoReceptor: acta?.correoReceptor,
      fechaEntrega: acta?.fechaEntrega,
      observaciones: acta?.observacionesEntrega,
      muebles: acta?.detalles?.map((d: any) => ({
        nombre: d.mobiliario?.nombre,
        categoria: d.mobiliario?.categoria,
        descripcion: d.mobiliario?.descripcion,
        cantidad: d.cantidad,
        unidadMedida: d.mobiliario?.unidadMedida,
        condicion: d.condicionEntrega
      })) || []
    };

    res.json(datosActa);
  } catch (error) {
    console.error('Error al obtener acta mobiliario por token:', error);
    res.status(500).json({ msg: 'Error al obtener los datos del acta' });
  }
};

/**
 * Firmar acta de mobiliario con token (PUBLICO)
 */
export const firmarActaMobiliarioConToken = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const { token } = req.params;
    const { firma, correosNotificacion } = req.body;

    if (!firma) {
      await transaction.rollback();
      res.status(400).json({ msg: 'La firma es requerida' });
      return;
    }

    const tokenFirma = await TokenFirmaMobiliario.findOne({
      where: { token },
      include: [
        {
          model: ActaMobiliario,
          as: 'acta',
          include: [
            {
              model: DetalleActaMobiliario,
              as: 'detalles',
              include: [{ model: Mobiliario, as: 'mobiliario' }]
            }
          ]
        }
      ],
      transaction
    });

    if (!tokenFirma) {
      await transaction.rollback();
      res.status(404).json({ msg: 'Token invalido' });
      return;
    }

    if (tokenFirma.estado !== 'pendiente') {
      await transaction.rollback();
      res.status(400).json({ msg: `Este token ya no es valido. Estado: ${tokenFirma.estado}` });
      return;
    }

    const acta = tokenFirma.acta as any;
    const ahora = new Date();

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Actualizar token
    await tokenFirma.update({
      estado: 'firmado',
      fechaFirma: ahora,
      ipFirma: ip,
      userAgent: userAgent.substring(0, 500)
    }, { transaction });

    // Actualizar acta con la firma
    await ActaMobiliario.update({
      firmaReceptor: firma,
      estado: 'activa',
      fechaFirma: ahora
    }, {
      where: { id: acta.id },
      transaction
    });

    // Reducir stock ahora que se confirma la entrega
    for (const detalle of acta.detalles) {
      const mueble = detalle.mobiliario;
      if (!mueble) continue;

      const cantidadEntregada = detalle.cantidad || 1;
      const stockAnterior = mueble.stockActual || 0;
      const nuevoStock = Math.max(0, stockAnterior - cantidadEntregada);

      await Mobiliario.update(
        { stockActual: nuevoStock },
        { where: { id: detalle.mobiliarioId }, transaction }
      );

      await MovimientoMobiliario.create({
        mobiliarioId: detalle.mobiliarioId,
        tipoMovimiento: 'firma_entrega' as any,
        cantidad: cantidadEntregada,
        stockAnterior,
        stockNuevo: nuevoStock,
        motivo: 'firma_entrega',
        descripcion: `Confirmado por firma digital de ${acta.nombreReceptor} - ${acta.numeroActa} (${cantidadEntregada} ${mueble.unidadMedida || 'und.'}) - Stock reducido`,
        actaEntregaId: acta.id,
        fecha: ahora
      }, { transaction });
    }

    await transaction.commit();

    // Emitir WebSocket
    const io = getIO();
    io.to('actas-mobiliario').emit('actaMobiliario:signed', { actaId: acta.id, estado: 'activa' });

    // Enviar correo de confirmacion
    try {
      const muebles = acta.detalles?.map((d: any) => ({
        nombre: d.mobiliario?.nombre || 'Mueble',
        categoria: d.mobiliario?.categoria || '',
        cantidad: d.cantidad
      })) || [];

      const destinatarios = [acta.correoReceptor];
      if (correosNotificacion && Array.isArray(correosNotificacion)) {
        destinatarios.push(...correosNotificacion);
      }

      await enviarActaMobiliarioFirmada(destinatarios, acta.nombreReceptor, muebles, ahora);
    } catch (emailError) {
      console.error('Error enviando confirmacion por correo:', emailError);
    }

    res.json({ msg: 'Acta firmada exitosamente', fechaFirma: ahora });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al firmar acta de mobiliario:', error);
    res.status(500).json({ msg: 'Error al procesar la firma' });
  }
};

/**
 * Rechazar acta de mobiliario con token (PUBLICO)
 */
export const rechazarActaMobiliarioConToken = async (req: Request, res: Response): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const { token } = req.params;
    const { motivo } = req.body;

    if (!motivo || motivo.trim().length === 0) {
      await transaction.rollback();
      res.status(400).json({ msg: 'Debe indicar el motivo del rechazo' });
      return;
    }

    const tokenFirma = await TokenFirmaMobiliario.findOne({
      where: { token },
      include: [
        {
          model: ActaMobiliario,
          as: 'acta',
          include: [
            {
              model: DetalleActaMobiliario,
              as: 'detalles',
              include: [{ model: Mobiliario, as: 'mobiliario' }]
            }
          ]
        }
      ],
      transaction
    });

    if (!tokenFirma) {
      await transaction.rollback();
      res.status(404).json({ msg: 'Token invalido' });
      return;
    }

    if (tokenFirma.estado !== 'pendiente') {
      await transaction.rollback();
      res.status(400).json({ msg: 'Este enlace ya no es valido' });
      return;
    }

    const acta = tokenFirma.acta as any;

    // Actualizar token
    await tokenFirma.update({
      estado: 'rechazado',
      motivoRechazo: motivo
    }, { transaction });

    // Actualizar estado del acta
    await ActaMobiliario.update({
      estado: 'rechazada',
      observacionesDevolucion: `Rechazada por el receptor: ${motivo}`
    }, {
      where: { id: acta.id },
      transaction
    });

    await transaction.commit();

    const io = getIO();
    io.to('actas-mobiliario').emit('actaMobiliario:rejected', { actaId: acta.id, motivo });

    res.json({ msg: 'Acta devuelta para correccion', motivo });
  } catch (error) {
    await transaction.rollback();
    console.error('Error al rechazar acta de mobiliario:', error);
    res.status(500).json({ msg: 'Error al procesar el rechazo' });
  }
};

/**
 * Reenviar correo de firma de mobiliario
 */
export const reenviarCorreoFirmaMobiliario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tokenFirma = await TokenFirmaMobiliario.findOne({
      where: { actaMobiliarioId: Number(id), estado: 'pendiente' },
      include: [
        {
          model: ActaMobiliario,
          as: 'acta',
          include: [
            {
              model: DetalleActaMobiliario,
              as: 'detalles',
              include: [{ model: Mobiliario, as: 'mobiliario' }]
            }
          ]
        }
      ]
    });

    if (!tokenFirma) {
      res.status(404).json({ msg: 'No hay solicitud de firma pendiente para esta acta' });
      return;
    }

    const acta = tokenFirma.acta as any;

    const muebles = acta?.detalles?.map((d: any) => ({
      nombre: d.mobiliario?.nombre || 'Mueble',
      categoria: d.mobiliario?.categoria || '',
      cantidad: d.cantidad,
      unidad: d.mobiliario?.unidadMedida || 'und.'
    })) || [];

    await enviarCorreoFirmaMobiliario(
      acta.correoReceptor,
      acta.nombreReceptor,
      tokenFirma.token,
      muebles,
      acta.observacionesEntrega
    );

    await tokenFirma.update({ fechaEnvio: new Date() });

    res.json({ msg: 'Correo reenviado correctamente', correo: acta.correoReceptor });
  } catch (error: any) {
    console.error('Error al reenviar correo mobiliario:', error);
    res.status(500).json({ msg: error.message || 'Error al reenviar el correo' });
  }
};

/**
 * Obtener estado de firma de un acta de mobiliario
 */
export const obtenerEstadoFirmaMobiliario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tokens = await TokenFirmaMobiliario.findAll({
      where: { actaMobiliarioId: Number(id) },
      order: [['fechaEnvio', 'DESC']]
    });

    const tokenActivo = tokens.find(t => t.estado === 'pendiente');
    const tokenFirmado = tokens.find(t => t.estado === 'firmado');
    const tokenRechazado = tokens.find(t => t.estado === 'rechazado');

    res.json({
      tieneTokenPendiente: !!tokenActivo,
      firmado: !!tokenFirmado,
      rechazado: !!tokenRechazado,
      tokenActivo: tokenActivo ? {
        fechaEnvio: tokenActivo.fechaEnvio,
        correo: tokenActivo.correoReceptor
      } : null,
      fechaFirma: tokenFirmado?.fechaFirma,
      motivoRechazo: tokenRechazado?.motivoRechazo,
      historial: tokens.map(t => ({
        estado: t.estado,
        fechaEnvio: t.fechaEnvio,
        fechaFirma: t.fechaFirma,
        correo: t.correoReceptor
      }))
    });
  } catch (error) {
    console.error('Error al obtener estado de firma mobiliario:', error);
    res.status(500).json({ msg: 'Error al obtener el estado de firma' });
  }
};
