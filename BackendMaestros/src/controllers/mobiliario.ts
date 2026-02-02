import { Request, Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import { Mobiliario } from '../models/mobiliario.js';
import { MovimientoMobiliario } from '../models/movimientoMobiliario.js';
import { User } from '../models/user.js';
import { getIO } from '../models/server.js';

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
  } catch (error) {
    console.error('Error al registrar mobiliario:', error);
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
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, numeroDocumento, Uid } = req.body;
    
    if (!cantidad || cantidad <= 0) {
      res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' });
      return;
    }
    
    const mueble = await Mobiliario.findByPk(Number(id));
    
    if (!mueble) {
      res.status(404).json({ msg: 'Mobiliario no encontrado' });
      return;
    }
    
    const stockAnterior = mueble.stockActual;
    const stockNuevo = stockAnterior + cantidad;
    
    await mueble.update({ stockActual: stockNuevo });
    
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
    });
    
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
    console.error('Error al agregar stock:', error);
    res.status(500).json({ msg: 'Error al agregar stock' });
  }
};

/**
 * Retirar stock (salida)
 */
export const retirarStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, actaEntregaId, Uid } = req.body;
    
    if (!cantidad || cantidad <= 0) {
      res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' });
      return;
    }
    
    const mueble = await Mobiliario.findByPk(Number(id));
    
    if (!mueble) {
      res.status(404).json({ msg: 'Mobiliario no encontrado' });
      return;
    }
    
    if (mueble.stockActual < cantidad) {
      res.status(400).json({ 
        msg: `Stock insuficiente. Disponible: ${mueble.stockActual} ${mueble.unidadMedida}(s)` 
      });
      return;
    }
    
    const stockAnterior = mueble.stockActual;
    const stockNuevo = stockAnterior - cantidad;
    
    await mueble.update({ stockActual: stockNuevo });
    
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
    });
    
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
    console.error('Error al retirar stock:', error);
    res.status(500).json({ msg: 'Error al retirar stock' });
  }
};

/**
 * Ajustar stock (corrección de inventario)
 */
export const ajustarStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nuevoStock, motivo, descripcion, Uid } = req.body;
    
    if (nuevoStock === undefined || nuevoStock < 0) {
      res.status(400).json({ msg: 'El nuevo stock debe ser un número válido mayor o igual a 0' });
      return;
    }
    
    const mueble = await Mobiliario.findByPk(Number(id));
    
    if (!mueble) {
      res.status(404).json({ msg: 'Mobiliario no encontrado' });
      return;
    }
    
    const stockAnterior = mueble.stockActual;
    
    await mueble.update({ stockActual: nuevoStock });
    
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
    });
    
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
  try {
    const { id } = req.params;
    const { motivo, Uid } = req.body;
    
    const mueble = await Mobiliario.findByPk(Number(id));
    
    if (!mueble) {
      res.status(404).json({ msg: 'Mobiliario no encontrado' });
      return;
    }
    
    await mueble.update({ activo: false });
    
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
    });
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('mobiliario').emit('mobiliario:deleted', { id: mueble.id });
    
    res.json({
      msg: 'Mobiliario dado de baja exitosamente',
      mobiliario: mueble
    });
  } catch (error) {
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
