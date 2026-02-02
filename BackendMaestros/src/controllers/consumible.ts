import { Request, Response } from 'express';
import { Op, literal, fn, col } from 'sequelize';
import { Consumible } from '../models/consumible.js';
import { MovimientoConsumible } from '../models/movimientoConsumible.js';
import { TipoInventario } from '../models/tipoInventario.js';
import { getIO } from '../models/server.js';

/**
 * Obtener todos los consumibles con filtros
 */
export const obtenerConsumibles = async (req: Request, res: Response) => {
  try {
    const { tipoInventarioId, categoria, stockBajo, busqueda, activo } = req.query;
    
    let where: any = {};
    
    if (tipoInventarioId) {
      where.tipoInventarioId = Number(tipoInventarioId);
    }
    
    if (categoria && categoria !== 'todas') {
      where.categoria = categoria;
    }
    
    if (stockBajo === 'true') {
      where.stockActual = {
        [Op.lte]: require('sequelize').literal('stock_minimo')
      };
    }
    
    if (activo !== undefined) {
      where.activo = activo === 'true';
    } else {
      where.activo = true; // Por defecto solo activos
    }
    
    if (busqueda) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${busqueda}%` } },
        { descripcion: { [Op.iLike]: `%${busqueda}%` } },
        { proveedor: { [Op.iLike]: `%${busqueda}%` } },
        { codigoInterno: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }
    
    const consumibles = await Consumible.findAll({
      where,
      include: [
        { model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] }
      ],
      order: [['nombre', 'ASC']]
    });
    
    res.json(consumibles);
  } catch (error) {
    console.error('Error al obtener consumibles:', error);
    res.status(500).json({ msg: 'Error al obtener los consumibles' });
  }
};

/**
 * Obtener consumibles por tipo de inventario (aseo o papeleria)
 */
export const obtenerConsumiblesPorTipo = async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params; // 'aseo' o 'papeleria'
    const { categoria, stockBajo, busqueda } = req.query;
    
    // Buscar el tipo de inventario por código
    const tipoInventario = await TipoInventario.findOne({
      where: { codigo, activo: true }
    });
    
    if (!tipoInventario) {
      res.status(404).json({ msg: 'Tipo de inventario no encontrado' });
      return;
    }
    
    let where: any = {
      tipoInventarioId: tipoInventario.id,
      activo: true
    };
    
    if (categoria && categoria !== 'todas') {
      where.categoria = categoria;
    }
    
    if (stockBajo === 'true') {
      where.stockActual = {
        [Op.lte]: require('sequelize').literal('"stock_minimo"')
      };
    }
    
    if (busqueda) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${busqueda}%` } },
        { descripcion: { [Op.iLike]: `%${busqueda}%` } },
        { proveedor: { [Op.iLike]: `%${busqueda}%` } },
        { codigoInterno: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }
    
    const consumibles = await Consumible.findAll({
      where,
      include: [
        { model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] }
      ],
      order: [['nombre', 'ASC']]
    });
    
    res.json(consumibles);
  } catch (error) {
    console.error('Error al obtener consumibles por tipo:', error);
    res.status(500).json({ msg: 'Error al obtener los consumibles' });
  }
};

/**
 * Obtener un consumible por ID con su historial
 */
export const obtenerConsumiblePorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const consumible = await Consumible.findByPk(Number(id), {
      include: [
        { model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] },
        {
          model: MovimientoConsumible,
          as: 'movimientos',
          order: [['fecha', 'DESC']],
          limit: 50
        }
      ]
    });
    
    if (!consumible) {
      res.status(404).json({ msg: 'Consumible no encontrado' });
      return;
    }
    
    res.json(consumible);
  } catch (error) {
    console.error('Error al obtener consumible:', error);
    res.status(500).json({ msg: 'Error al obtener el consumible' });
  }
};

/**
 * Registrar nuevo consumible
 */
export const registrarConsumible = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre,
      tipoInventarioId,
      tipoInventarioCodigo, // Soportar también el código (aseo, papeleria)
      categoria,
      descripcion,
      unidadMedida,
      stockActual,
      stockMinimo,
      stockMaximo,
      proveedor,
      precioUnitario,
      ubicacionAlmacen,
      codigoInterno,
      observaciones,
      Uid
    } = req.body;
    
    // Obtener el tipo de inventario por ID o por código
    let tipoInventario = null;
    
    if (tipoInventarioId) {
      tipoInventario = await TipoInventario.findByPk(tipoInventarioId);
    } else if (tipoInventarioCodigo) {
      tipoInventario = await TipoInventario.findOne({
        where: { codigo: tipoInventarioCodigo, activo: true }
      });
    }
    
    if (!tipoInventario) {
      res.status(400).json({ msg: 'Tipo de inventario no válido' });
      return;
    }
    
    // Verificar código interno único si se proporciona
    if (codigoInterno) {
      const existente = await Consumible.findOne({ where: { codigoInterno } });
      if (existente) {
        res.status(400).json({ msg: 'Ya existe un producto con ese código interno' });
        return;
      }
    }
    
    // Procesar foto si se subió
    let foto = null;
    if (req.file) {
      foto = req.file.filename;
    }
    
    const nuevoConsumible = await Consumible.create({
      nombre,
      tipoInventarioId: tipoInventario.id, // Usar el ID obtenido
      categoria,
      descripcion,
      unidadMedida: unidadMedida || 'unidad',
      stockActual: stockActual || 0,
      stockMinimo: stockMinimo || 5,
      stockMaximo,
      proveedor,
      precioUnitario: precioUnitario || 0,
      ubicacionAlmacen,
      codigoInterno,
      foto,
      activo: true,
      observaciones,
      Uid
    });
    
    // Registrar movimiento de ingreso inicial si hay stock
    if (stockActual && stockActual > 0) {
      await MovimientoConsumible.create({
        consumibleId: nuevoConsumible.id,
        tipoMovimiento: 'entrada',
        cantidad: stockActual,
        stockAnterior: 0,
        stockNuevo: stockActual,
        motivo: 'ingreso_inicial',
        descripcion: 'Stock inicial al registrar el producto',
        fecha: new Date(),
        Uid
      });
    }
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('consumibles').emit('consumible:created', nuevoConsumible);
    
    res.status(201).json({
      msg: 'Producto registrado exitosamente',
      consumible: nuevoConsumible
    });
  } catch (error) {
    console.error('Error al registrar consumible:', error);
    res.status(500).json({ msg: 'Error al registrar el producto' });
  }
};

/**
 * Actualizar consumible (datos básicos, no stock)
 */
export const actualizarConsumible = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      nombre,
      categoria,
      descripcion,
      unidadMedida,
      stockMinimo,
      stockMaximo,
      proveedor,
      precioUnitario,
      ubicacionAlmacen,
      codigoInterno,
      observaciones
    } = req.body;
    
    const consumible = await Consumible.findByPk(Number(id));
    
    if (!consumible) {
      res.status(404).json({ msg: 'Producto no encontrado' });
      return;
    }
    
    // Verificar código interno único si se cambia
    if (codigoInterno && codigoInterno !== consumible.codigoInterno) {
      const existente = await Consumible.findOne({ where: { codigoInterno } });
      if (existente) {
        res.status(400).json({ msg: 'Ya existe un producto con ese código interno' });
        return;
      }
    }
    
    await consumible.update({
      nombre: nombre || consumible.nombre,
      categoria: categoria !== undefined ? categoria : consumible.categoria,
      descripcion: descripcion !== undefined ? descripcion : consumible.descripcion,
      unidadMedida: unidadMedida || consumible.unidadMedida,
      stockMinimo: stockMinimo !== undefined ? stockMinimo : consumible.stockMinimo,
      stockMaximo: stockMaximo !== undefined ? stockMaximo : consumible.stockMaximo,
      proveedor: proveedor !== undefined ? proveedor : consumible.proveedor,
      precioUnitario: precioUnitario !== undefined ? precioUnitario : consumible.precioUnitario,
      ubicacionAlmacen: ubicacionAlmacen !== undefined ? ubicacionAlmacen : consumible.ubicacionAlmacen,
      codigoInterno: codigoInterno !== undefined ? codigoInterno : consumible.codigoInterno,
      observaciones: observaciones !== undefined ? observaciones : consumible.observaciones
    });
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('consumibles').emit('consumible:updated', consumible);
    
    res.json({
      msg: 'Producto actualizado exitosamente',
      consumible
    });
  } catch (error) {
    console.error('Error al actualizar consumible:', error);
    res.status(500).json({ msg: 'Error al actualizar el producto' });
  }
};

/**
 * Agregar stock (entrada de inventario)
 */
export const agregarStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, numeroDocumento, Uid } = req.body;
    
    if (!cantidad || cantidad <= 0) {
      res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' });
      return;
    }
    
    const consumible = await Consumible.findByPk(Number(id));
    
    if (!consumible) {
      res.status(404).json({ msg: 'Producto no encontrado' });
      return;
    }
    
    const stockAnterior = consumible.stockActual;
    const stockNuevo = stockAnterior + cantidad;
    
    await consumible.update({ stockActual: stockNuevo });
    
    // Registrar movimiento
    await MovimientoConsumible.create({
      consumibleId: consumible.id,
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
    io.to('consumibles').emit('consumible:stockUpdated', {
      id: consumible.id,
      stockActual: stockNuevo,
      stockMinimo: consumible.stockMinimo
    });
    
    res.json({
      msg: `Se agregaron ${cantidad} ${consumible.unidadMedida}(s) al inventario`,
      consumible,
      stockAnterior,
      stockNuevo
    });
  } catch (error) {
    console.error('Error al agregar stock:', error);
    res.status(500).json({ msg: 'Error al agregar stock' });
  }
};

/**
 * Retirar stock (salida de inventario)
 */
export const retirarStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, actaEntregaId, Uid } = req.body;
    
    if (!cantidad || cantidad <= 0) {
      res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' });
      return;
    }
    
    const consumible = await Consumible.findByPk(Number(id));
    
    if (!consumible) {
      res.status(404).json({ msg: 'Producto no encontrado' });
      return;
    }
    
    if (consumible.stockActual < cantidad) {
      res.status(400).json({ 
        msg: `Stock insuficiente. Disponible: ${consumible.stockActual} ${consumible.unidadMedida}(s)` 
      });
      return;
    }
    
    const stockAnterior = consumible.stockActual;
    const stockNuevo = stockAnterior - cantidad;
    
    await consumible.update({ stockActual: stockNuevo });
    
    // Registrar movimiento
    await MovimientoConsumible.create({
      consumibleId: consumible.id,
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
    io.to('consumibles').emit('consumible:stockUpdated', {
      id: consumible.id,
      stockActual: stockNuevo,
      stockMinimo: consumible.stockMinimo,
      alertaStockBajo: stockNuevo <= consumible.stockMinimo
    });
    
    res.json({
      msg: `Se retiraron ${cantidad} ${consumible.unidadMedida}(s) del inventario`,
      consumible,
      stockAnterior,
      stockNuevo,
      alertaStockBajo: stockNuevo <= consumible.stockMinimo
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
    
    const consumible = await Consumible.findByPk(Number(id));
    
    if (!consumible) {
      res.status(404).json({ msg: 'Producto no encontrado' });
      return;
    }
    
    const stockAnterior = consumible.stockActual;
    
    await consumible.update({ stockActual: nuevoStock });
    
    // Registrar movimiento
    await MovimientoConsumible.create({
      consumibleId: consumible.id,
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
    io.to('consumibles').emit('consumible:stockUpdated', {
      id: consumible.id,
      stockActual: nuevoStock,
      stockMinimo: consumible.stockMinimo
    });
    
    res.json({
      msg: 'Stock ajustado exitosamente',
      consumible,
      stockAnterior,
      stockNuevo: nuevoStock
    });
  } catch (error) {
    console.error('Error al ajustar stock:', error);
    res.status(500).json({ msg: 'Error al ajustar el stock' });
  }
};

/**
 * Obtener consumibles con stock bajo (alertas)
 */
export const obtenerAlertasStock = async (req: Request, res: Response) => {
  try {
    const { tipoInventarioId } = req.query;
    
    let where: any = {
      activo: true,
      stockActual: {
        [Op.lte]: literal('"stock_minimo"')
      }
    };
    
    if (tipoInventarioId) {
      where.tipoInventarioId = Number(tipoInventarioId);
    }
    
    const consumibles = await Consumible.findAll({
      where,
      include: [
        { model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] }
      ],
      order: [['stockActual', 'ASC']]
    });
    
    res.json(consumibles);
  } catch (error) {
    console.error('Error al obtener alertas de stock:', error);
    res.status(500).json({ msg: 'Error al obtener las alertas de stock' });
  }
};

/**
 * Obtener estadísticas de consumibles
 */
export const obtenerEstadisticasConsumibles = async (req: Request, res: Response) => {
  try {
    const { tipoInventarioId } = req.query;
    
    let where: any = { activo: true };
    if (tipoInventarioId) {
      where.tipoInventarioId = Number(tipoInventarioId);
    }
    
    const total = await Consumible.count({ where });
    
    // Productos con stock bajo
    const stockBajo = await Consumible.count({
      where: {
        ...where,
        stockActual: {
          [Op.lte]: literal('"stock_minimo"')
        }
      }
    });
    
    // Productos sin stock
    const sinStock = await Consumible.count({
      where: {
        ...where,
        stockActual: 0
      }
    });
    
    // Valor total del inventario
    const valorTotal = await Consumible.sum(
      literal('"stock_actual" * "precio_unitario"') as any,
      { where }
    );
    
    // Por categoría
    const porCategoria = await Consumible.findAll({
      where,
      attributes: [
        'categoria',
        [fn('COUNT', col('categoria')), 'cantidad'],
        [fn('SUM', col('stock_actual')), 'totalStock']
      ],
      group: ['categoria']
    });
    
    res.json({
      total,
      stockBajo,
      sinStock,
      valorTotal: valorTotal || 0,
      porCategoria: porCategoria.map((item: any) => ({
        categoria: item.categoria,
        cantidad: parseInt(item.getDataValue('cantidad')),
        totalStock: parseInt(item.getDataValue('totalStock')) || 0
      }))
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ msg: 'Error al obtener las estadísticas' });
  }
};

/**
 * Desactivar consumible (no eliminar)
 */
export const desactivarConsumible = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { motivo, Uid } = req.body;
    
    const consumible = await Consumible.findByPk(Number(id));
    
    if (!consumible) {
      res.status(404).json({ msg: 'Producto no encontrado' });
      return;
    }
    
    await consumible.update({ activo: false });
    
    // Registrar en observaciones
    const observacionAnterior = consumible.observaciones || '';
    await consumible.update({
      observaciones: `${observacionAnterior}\n[${new Date().toISOString()}] Desactivado: ${motivo || 'Sin motivo especificado'}`
    });
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('consumibles').emit('consumible:deleted', { id: consumible.id });
    
    res.json({
      msg: 'Producto desactivado exitosamente',
      consumible
    });
  } catch (error) {
    console.error('Error al desactivar consumible:', error);
    res.status(500).json({ msg: 'Error al desactivar el producto' });
  }
};

/**
 * Obtener historial de movimientos de un consumible
 */
export const obtenerHistorialConsumible = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;
    
    const movimientos = await MovimientoConsumible.findAll({
      where: { consumibleId: Number(id) },
      order: [['fecha', 'DESC']],
      limit: Number(limit),
      include: [
        { model: require('../models/user.js').User, as: 'realizadoPor', attributes: ['Uid', 'name'] }
      ]
    });
    
    res.json(movimientos);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ msg: 'Error al obtener el historial' });
  }
};

/**
 * Obtener consumibles disponibles para entrega (con stock > 0)
 */
export const obtenerConsumiblesDisponibles = async (req: Request, res: Response) => {
  try {
    const { tipoInventarioId } = req.query;
    
    let where: any = {
      activo: true,
      stockActual: { [Op.gt]: 0 }
    };
    
    if (tipoInventarioId) {
      where.tipoInventarioId = Number(tipoInventarioId);
    }
    
    const consumibles = await Consumible.findAll({
      where,
      include: [
        { model: TipoInventario, as: 'tipoInventario', attributes: ['id', 'nombre', 'codigo'] }
      ],
      order: [['nombre', 'ASC']]
    });
    
    res.json(consumibles);
  } catch (error) {
    console.error('Error al obtener consumibles disponibles:', error);
    res.status(500).json({ msg: 'Error al obtener los consumibles disponibles' });
  }
};
