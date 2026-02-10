import { Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import jwt from 'jsonwebtoken';
import sequelize from '../database/connection.js';
import { Mobiliario } from '../models/mobiliario.js';
import { MovimientoMobiliario } from '../models/movimientoMobiliario.js';
import { User } from '../models/user.js';
import { getIO } from '../models/server.js';

/**
 * Helper para extraer Uid del token JWT
 */
const getUidFromToken = (req: Request): number | null => {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, process.env.SECRET_KEY || 'DxVj971V5CxBQGB7hDqwOenbRbbH4mrS') as any;
      return decoded.Uid || null;
    }
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Obtener todo el mobiliario con filtros
 */
export const obtenerMobiliario = async (req: Request, res: Response) => {
  try {
    const { categoria, busqueda, activo } = req.query;
    
    let where: any = {};
    
    // Por defecto solo mostrar activos
    where.activo = activo !== 'false';
    
    if (categoria && categoria !== 'todas') {
      where.categoria = categoria;
    }
    
    if (busqueda) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${busqueda}%` } },
        { descripcion: { [Op.iLike]: `%${busqueda}%` } },
        { proveedor: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }
    
    const mobiliario = await Mobiliario.findAll({
      where,
      order: [['nombre', 'ASC']]
    });
    
    res.json(mobiliario);
  } catch (error) {
    console.error('Error al obtener mobiliario:', error);
    res.status(500).json({ msg: 'Error al obtener el mobiliario' });
  }
};

/**
 * Obtener mobiliario disponible (con stock > 0)
 */
export const obtenerMobiliarioDisponible = async (req: Request, res: Response) => {
  try {
    const mobiliario = await Mobiliario.findAll({
      where: { 
        activo: true,
        stockActual: { [Op.gt]: 0 }
      },
      order: [['categoria', 'ASC'], ['nombre', 'ASC']]
    });
    
    res.json(mobiliario);
  } catch (error) {
    console.error('Error al obtener mobiliario disponible:', error);
    res.status(500).json({ msg: 'Error al obtener el mobiliario disponible' });
  }
};

/**
 * Obtener un mobiliario por ID con su historial
 */
export const obtenerMobiliarioPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const mueble = await Mobiliario.findByPk(Number(id), {
      include: [
        {
          model: MovimientoMobiliario,
          as: 'movimientos',
          order: [['fecha', 'DESC']]
        }
      ]
    });
    
    if (!mueble) {
      res.status(404).json({ msg: 'Mobiliario no encontrado' });
      return;
    }
    
    res.json(mueble);
  } catch (error) {
    console.error('Error al obtener mobiliario:', error);
    res.status(500).json({ msg: 'Error al obtener el mobiliario' });
  }
};

/**
 * Registrar nuevo mobiliario en el inventario
 */
export const registrarMobiliario = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre,
      categoria,
      descripcion,
      unidadMedida,
      stockActual,
      ubicacionAlmacen,
      proveedor,
      precioUnitario,
      observaciones,
      Uid
    } = req.body;
    
    // Procesar foto si se subió
    let foto = '';
    if (req.file) {
      foto = req.file.filename;
    }
    
    const nuevoMobiliario = await Mobiliario.create({
      nombre,
      categoria,
      descripcion,
      unidadMedida: unidadMedida || 'unidad',
      stockActual: stockActual || 0,
      ubicacionAlmacen,
      proveedor,
      precioUnitario,
      foto,
      activo: true,
      observaciones,
      Uid
    });
    
    // Registrar movimiento de ingreso inicial si hay stock
    if (stockActual && stockActual > 0) {
      await MovimientoMobiliario.create({
        mobiliarioId: nuevoMobiliario.id,
        tipoMovimiento: 'entrada',
        cantidad: stockActual,
        stockAnterior: 0,
        stockNuevo: stockActual,
        motivo: 'ingreso_inicial',
        descripcion: 'Stock inicial al registrar el mobiliario',
        fecha: new Date(),
        Uid
      });
    }
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('mobiliario').emit('mobiliario:created', nuevoMobiliario);
    
    res.status(201).json({
      msg: 'Mobiliario registrado exitosamente',
      mobiliario: nuevoMobiliario
    });
  } catch (error: any) {
    console.error('Error al registrar mobiliario:', error);
    
    // Manejo específico de errores de constraint unique
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || 'campo';
      res.status(400).json({ 
        msg: `Ya existe un mobiliario con ese ${field}. Por favor verifica los datos.`,
        error: 'duplicate_entry'
      });
      return;
    }
    
    res.status(500).json({ msg: 'Error al registrar el mobiliario' });
  }
};

/**
 * Actualizar mobiliario
 */
export const actualizarMobiliario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      nombre,
      categoria,
      descripcion,
      unidadMedida,
      ubicacionAlmacen,
      proveedor,
      precioUnitario,
      observaciones
    } = req.body;
    
    const mueble = await Mobiliario.findByPk(Number(id));
    
    if (!mueble) {
      res.status(404).json({ msg: 'Mobiliario no encontrado' });
      return;
    }
    
    // Procesar foto si se subió una nueva
    let foto = mueble.foto;
    if (req.file) {
      foto = req.file.filename;
    }
    
    await mueble.update({
      nombre: nombre || mueble.nombre,
      categoria: categoria || mueble.categoria,
      descripcion: descripcion !== undefined ? descripcion : mueble.descripcion,
      unidadMedida: unidadMedida || mueble.unidadMedida,
      ubicacionAlmacen: ubicacionAlmacen !== undefined ? ubicacionAlmacen : mueble.ubicacionAlmacen,
      proveedor: proveedor !== undefined ? proveedor : mueble.proveedor,
      precioUnitario: precioUnitario !== undefined ? precioUnitario : mueble.precioUnitario,
      foto,
      observaciones: observaciones !== undefined ? observaciones : mueble.observaciones
    });
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('mobiliario').emit('mobiliario:updated', mueble);
    
    res.json({
      msg: 'Mobiliario actualizado exitosamente',
      mobiliario: mueble
    });
  } catch (error) {
    console.error('Error al actualizar mobiliario:', error);
    res.status(500).json({ msg: 'Error al actualizar el mobiliario' });
  }
};

/**
 * Agregar stock (entrada)
 */
export const agregarStock = async (req: Request, res: Response): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, numeroDocumento } = req.body;
    
    // Obtener Uid del body o del token
    let Uid = req.body.Uid;
    if (!Uid || Uid === 0) {
      Uid = getUidFromToken(req);
    }
    
    if (!Uid) {
      await t.rollback();
      res.status(401).json({ msg: 'No se pudo identificar al usuario' });
      return;
    }
    
    if (!cantidad || cantidad <= 0) {
      await t.rollback();
      res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' });
      return;
    }
    
    const mueble = await Mobiliario.findByPk(Number(id), { transaction: t });
    
    if (!mueble) {
      await t.rollback();
      res.status(404).json({ msg: 'Mobiliario no encontrado' });
      return;
    }
    
    const stockAnterior = mueble.stockActual;
    const stockNuevo = stockAnterior + cantidad;
    
    await mueble.update({ stockActual: stockNuevo }, { transaction: t });
    
    // Registrar movimiento
    await MovimientoMobiliario.create({
      mobiliarioId: mueble.id,
      tipoMovimiento: 'entrada',
      cantidad,
      stockAnterior,
      stockNuevo,
      motivo: motivo || 'compra',
      descripcion,
      numeroDocumento,
      fecha: new Date(),
      Uid
    }, { transaction: t });
    
    await t.commit();
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('mobiliario').emit('mobiliario:stockUpdated', {
      id: mueble.id,
      stockActual: stockNuevo
    });
    
    res.json({
      msg: `Se agregaron ${cantidad} ${mueble.unidadMedida}(s) al inventario`,
      mobiliario: mueble,
      stockAnterior,
      stockNuevo
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al agregar stock:', error);
    res.status(500).json({ msg: 'Error al agregar stock' });
  }
};

/**
 * Retirar stock (salida)
 */
export const retirarStock = async (req: Request, res: Response): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, actaEntregaId } = req.body;
    
    // Obtener Uid del body o del token
    let Uid = req.body.Uid;
    if (!Uid || Uid === 0) {
      Uid = getUidFromToken(req);
    }
    
    if (!Uid) {
      await t.rollback();
      res.status(401).json({ msg: 'No se pudo identificar al usuario' });
      return;
    }
    
    if (!cantidad || cantidad <= 0) {
      await t.rollback();
      res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' });
      return;
    }
    
    const mueble = await Mobiliario.findByPk(Number(id), { transaction: t });
    
    if (!mueble) {
      await t.rollback();
      res.status(404).json({ msg: 'Mobiliario no encontrado' });
      return;
    }
    
    if (mueble.stockActual < cantidad) {
      await t.rollback();
      res.status(400).json({ 
        msg: `Stock insuficiente. Disponible: ${mueble.stockActual} ${mueble.unidadMedida}(s)` 
      });
      return;
    }
    
    const stockAnterior = mueble.stockActual;
    const stockNuevo = stockAnterior - cantidad;
    
    await mueble.update({ stockActual: stockNuevo }, { transaction: t });
    
    // Registrar movimiento
    await MovimientoMobiliario.create({
      mobiliarioId: mueble.id,
      tipoMovimiento: 'salida',
      cantidad,
      stockAnterior,
      stockNuevo,
      motivo: motivo || 'entrega',
      descripcion,
      actaEntregaId,
      fecha: new Date(),
      Uid
    }, { transaction: t });
    
    await t.commit();
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('mobiliario').emit('mobiliario:stockUpdated', {
      id: mueble.id,
      stockActual: stockNuevo
    });
    
    res.json({
      msg: `Se retiraron ${cantidad} ${mueble.unidadMedida}(s) del inventario`,
      mobiliario: mueble,
      stockAnterior,
      stockNuevo
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al retirar stock:', error);
    res.status(500).json({ msg: 'Error al retirar stock' });
  }
};

/**
 * Ajustar stock (corrección de inventario)
 */
export const ajustarStock = async (req: Request, res: Response): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { nuevoStock, motivo, descripcion } = req.body;
    
    // Obtener Uid del body o del token
    let Uid = req.body.Uid;
    if (!Uid || Uid === 0) {
      Uid = getUidFromToken(req);
    }
    
    if (!Uid) {
      await t.rollback();
      res.status(401).json({ msg: 'No se pudo identificar al usuario' });
      return;
    }
    
    if (nuevoStock === undefined || nuevoStock < 0) {
      await t.rollback();
      res.status(400).json({ msg: 'El nuevo stock debe ser un número válido mayor o igual a 0' });
      return;
    }
    
    const mueble = await Mobiliario.findByPk(Number(id), { transaction: t });
    
    if (!mueble) {
      await t.rollback();
      res.status(404).json({ msg: 'Mobiliario no encontrado' });
      return;
    }
    
    const stockAnterior = mueble.stockActual;
    
    await mueble.update({ stockActual: nuevoStock }, { transaction: t });
    
    // Registrar movimiento
    await MovimientoMobiliario.create({
      mobiliarioId: mueble.id,
      tipoMovimiento: 'ajuste',
      cantidad: Math.abs(nuevoStock - stockAnterior),
      stockAnterior,
      stockNuevo: nuevoStock,
      motivo: motivo || 'ajuste_inventario',
      descripcion: descripcion || `Ajuste de stock de ${stockAnterior} a ${nuevoStock}`,
      fecha: new Date(),
      Uid
    }, { transaction: t });
    
    await t.commit();
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('mobiliario').emit('mobiliario:stockUpdated', {
      id: mueble.id,
      stockActual: nuevoStock
    });
    
    res.json({
      msg: 'Stock ajustado exitosamente',
      mobiliario: mueble,
      stockAnterior,
      stockNuevo: nuevoStock
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al ajustar stock:', error);
    res.status(500).json({ msg: 'Error al ajustar el stock' });
  }
};

/**
 * Obtener estadísticas del mobiliario
 */
export const obtenerEstadisticasMobiliario = async (req: Request, res: Response) => {
  try {
    const where = { activo: true };
    
    const total = await Mobiliario.count({ where });
    
    // Stock total (suma de todos los items)
    const stockTotal = await Mobiliario.sum('stockActual', { where }) || 0;
    
    // Productos sin stock
    const sinStock = await Mobiliario.count({
      where: {
        ...where,
        stockActual: 0
      }
    });
    
    // Valor total del inventario - usar nombres de columna correctos (camelCase)
    const valorTotalResult = await Mobiliario.findAll({
      where,
      attributes: [
        [fn('SUM', literal('"stockActual" * COALESCE("precioUnitario", 0)')), 'valorTotal']
      ],
      raw: true
    }) as any[];
    const valorTotal = valorTotalResult[0]?.valorTotal || 0;
    
    // Por categoría - usar nombres de columna correctos (camelCase)
    const porCategoria = await Mobiliario.findAll({
      where,
      attributes: [
        'categoria',
        [fn('COUNT', literal('*')), 'cantidad'],
        [fn('SUM', literal('"stockActual"')), 'totalStock']
      ],
      group: ['categoria'],
      raw: true
    }) as any[];
    
    res.json({
      total,
      stockTotal,
      sinStock,
      valorTotal: parseFloat(valorTotal) || 0,
      porCategoria: porCategoria.map((item: any) => ({
        categoria: item.categoria,
        cantidad: parseInt(item.cantidad) || 0,
        totalStock: parseInt(item.totalStock) || 0
      }))
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ msg: 'Error al obtener las estadísticas' });
  }
};

/**
 * Desactivar mobiliario (no eliminar)
 */
export const desactivarMobiliario = async (req: Request, res: Response): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    
    // Obtener Uid del body o del token
    let Uid = req.body.Uid;
    if (!Uid || Uid === 0) {
      Uid = getUidFromToken(req);
    }
    
    if (!Uid) {
      await t.rollback();
      res.status(401).json({ msg: 'No se pudo identificar al usuario' });
      return;
    }
    
    const mueble = await Mobiliario.findByPk(Number(id), { transaction: t });
    
    if (!mueble) {
      await t.rollback();
      res.status(404).json({ msg: 'Mobiliario no encontrado' });
      return;
    }
    
    await mueble.update({ activo: false }, { transaction: t });
    
    // Registrar movimiento de baja
    await MovimientoMobiliario.create({
      mobiliarioId: mueble.id,
      tipoMovimiento: 'baja',
      cantidad: mueble.stockActual,
      stockAnterior: mueble.stockActual,
      stockNuevo: 0,
      motivo: motivo || 'baja',
      descripcion: 'Mobiliario dado de baja del inventario',
      fecha: new Date(),
      Uid
    }, { transaction: t });
    
    await t.commit();
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('mobiliario').emit('mobiliario:deleted', { id: mueble.id });
    
    res.json({
      msg: 'Mobiliario dado de baja exitosamente',
      mobiliario: mueble
    });
  } catch (error) {
    await t.rollback();
    console.error('Error al dar de baja el mobiliario:', error);
    res.status(500).json({ msg: 'Error al dar de baja el mobiliario' });
  }
};

/**
 * Obtener historial de movimientos de un mobiliario
 */
export const obtenerHistorialMobiliario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const movimientos = await MovimientoMobiliario.findAll({
      where: { mobiliarioId: Number(id) },
      order: [['fecha', 'DESC']],
      include: [
        { model: User, as: 'realizadoPor', attributes: ['Uid', 'name'] }
      ]
    });
    
    res.json(movimientos);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ msg: 'Error al obtener el historial' });
  }
};

/**
 * Convertir mobiliario individual a modo stock
 * Útil para consolidar múltiples items idénticos
 */
export const convertirMobiliarioAStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cantidad } = req.body;
    const Uid = req.body.Uid;
    
    const mueble = await Mobiliario.findByPk(Number(id));
    
    if (!mueble) {
      res.status(404).json({ msg: 'Mobiliario no encontrado' });
      return;
    }
    
    if (mueble.tipoRegistro === 'stock') {
      res.status(400).json({ msg: 'Este mobiliario ya está en modo stock' });
      return;
    }
    
    const cantidadNum = parseInt(cantidad) || 1;
    if (cantidadNum <= 0) {
      res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' });
      return;
    }
    
    const serialAnterior = mueble.serial;
    const stockAnterior = mueble.stockActual || 1;
    
    // Convertir a modo stock
    await mueble.update({
      tipoRegistro: 'stock',
      stockActual: cantidadNum,
      stockMinimo: 1,
      serial: null
    });
    
    // Registrar el movimiento de conversión
    await MovimientoMobiliario.create({
      mobiliarioId: mueble.id,
      tipoMovimiento: 'conversion_stock',
      cantidad: cantidadNum - stockAnterior,
      stockAnterior,
      stockNuevo: cantidadNum,
      motivo: 'conversion',
      descripcion: `Mobiliario convertido de individual (serial: ${serialAnterior}) a stock. Cantidad: ${cantidadNum}`,
      fecha: new Date(),
      Uid
    });
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('mobiliario').emit('mobiliario:updated', mueble);
    
    res.json({
      msg: `Mobiliario convertido a modo stock exitosamente`,
      mobiliario: mueble,
      stockActual: cantidadNum
    });
  } catch (error) {
    console.error('Error al convertir mobiliario a stock:', error);
    res.status(500).json({ msg: 'Error al convertir el mobiliario' });
  }
};
