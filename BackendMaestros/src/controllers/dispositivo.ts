import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Dispositivo } from '../models/dispositivo.js';
import { MovimientoDispositivo } from '../models/movimientoDispositivo.js';
import { getPhotoUrl, deletePhoto } from '../config/multer.js';
import { getIO } from '../models/server.js';

/**
 * Obtener todos los dispositivos con filtros
 */
export const obtenerDispositivos = async (req: Request, res: Response) => {
  try {
    const { estado, categoria, ubicacion, busqueda } = req.query;
    
    let where: any = {};
    
    if (estado && estado !== 'todos') {
      where.estado = estado;
    }
    
    if (categoria && categoria !== 'todas') {
      where.categoria = categoria;
    }
    
    if (ubicacion && ubicacion !== 'todas') {
      where.ubicacion = ubicacion;
    }
    
    if (busqueda) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${busqueda}%` } },
        { marca: { [Op.iLike]: `%${busqueda}%` } },
        { modelo: { [Op.iLike]: `%${busqueda}%` } },
        { serial: { [Op.iLike]: `%${busqueda}%` } },
        { imei: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }
    
    const dispositivos = await Dispositivo.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    
    res.json(dispositivos);
  } catch (error) {
    console.error('Error al obtener dispositivos:', error);
    res.status(500).json({ msg: 'Error al obtener los dispositivos' });
  }
};

/**
 * Obtener dispositivos disponibles para préstamo
 */
export const obtenerDisponibles = async (req: Request, res: Response) => {
  try {
    const dispositivos = await Dispositivo.findAll({
      where: { estado: 'disponible' },
      order: [['categoria', 'ASC'], ['nombre', 'ASC']]
    });
    
    res.json(dispositivos);
  } catch (error) {
    console.error('Error al obtener dispositivos disponibles:', error);
    res.status(500).json({ msg: 'Error al obtener los dispositivos disponibles' });
  }
};

/**
 * Obtener un dispositivo por ID con su historial
 */
export const obtenerDispositivoPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const dispositivo = await Dispositivo.findByPk(Number(id), {
      include: [
        {
          model: MovimientoDispositivo,
          as: 'movimientos',
          order: [['fecha', 'DESC']]
        }
      ]
    });
    
    if (!dispositivo) {
      res.status(404).json({ msg: 'Dispositivo no encontrado' });
      return;
    }
    
    res.json(dispositivo);
  } catch (error) {
    console.error('Error al obtener dispositivo:', error);
    res.status(500).json({ msg: 'Error al obtener el dispositivo' });
  }
};

/**
 * Registrar nuevo dispositivo en el inventario
 * Soporta dos modos:
 * - individual: Dispositivos únicos con serial (celulares, tablets, computadores)
 * - stock: Dispositivos por cantidad (cargadores, accesorios, cables)
 */
export const registrarDispositivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre,
      categoria,
      marca,
      modelo,
      serial,
      imei,
      color,
      descripcion,
      condicion,
      ubicacion,
      observaciones,
      Uid,
      tipoRegistro, // 'individual' o 'stock'
      cantidad, // Para tipo 'stock'
      stockMinimo
    } = req.body;
    
    const tipo = tipoRegistro || 'individual';
    
    // Verificar serial único si se proporciona y es tipo individual
    if (serial && tipo === 'individual') {
      const existeSerial = await Dispositivo.findOne({ where: { serial } });
      if (existeSerial) {
        res.status(400).json({ msg: 'Ya existe un dispositivo con ese número de serie' });
        return;
      }
    }
    
    // Procesar fotos si se subieron
    let fotos: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      fotos = (req.files as Express.Multer.File[]).map(file => 
        getPhotoUrl(file.filename, 'dispositivos')
      );
    }
    
    if (tipo === 'stock') {
      // Registrar dispositivo de stock (cargadores, accesorios)
      const cantidadStock = parseInt(cantidad) || 1;
      
      const dispositivo = await Dispositivo.create({
        nombre,
        categoria,
        marca,
        modelo,
        serial: null, // No se usa serial para items de stock
        imei: null,
        color,
        descripcion,
        estado: 'disponible',
        condicion: condicion || 'nuevo',
        ubicacion: ubicacion || 'Almacén Principal',
        fotos: JSON.stringify(fotos),
        fechaIngreso: new Date(),
        observaciones,
        Uid,
        tipoRegistro: 'stock',
        stockActual: cantidadStock,
        stockMinimo: stockMinimo || 0
      });
      
      // Registrar movimiento de ingreso
      await MovimientoDispositivo.create({
        dispositivoId: dispositivo.id,
        tipoMovimiento: 'ingreso',
        estadoAnterior: null,
        estadoNuevo: 'disponible',
        descripcion: `Ingreso inicial de ${cantidadStock} unidades de ${nombre}`,
        fecha: new Date(),
        Uid
      });
      
      // Emitir evento WebSocket
      try {
        const io = getIO();
        io.to('inventario').emit('dispositivo:created', { dispositivo });
      } catch (e) {
        console.log('WebSocket no disponible');
      }
      
      res.status(201).json({
        msg: `Se registraron ${cantidadStock} unidades exitosamente`,
        dispositivo
      });
      
    } else {
      // Registrar dispositivo individual (comportamiento original)
      const dispositivo = await Dispositivo.create({
        nombre,
        categoria,
        marca,
        modelo,
        serial,
        imei,
        color,
        descripcion,
        estado: 'disponible',
        condicion: condicion || 'bueno',
        ubicacion: ubicacion || 'Almacén Principal',
        fotos: JSON.stringify(fotos),
        fechaIngreso: new Date(),
        observaciones,
        Uid,
        tipoRegistro: 'individual',
        stockActual: 1,
        stockMinimo: 0
      });
      
      // Registrar movimiento de ingreso
      await MovimientoDispositivo.create({
        dispositivoId: dispositivo.id,
        tipoMovimiento: 'ingreso',
        estadoAnterior: null,
        estadoNuevo: 'disponible',
        descripcion: `Dispositivo ${nombre} ingresado al inventario`,
        fecha: new Date(),
        Uid
      });
      
      // Emitir evento WebSocket
      try {
        const io = getIO();
        io.to('inventario').emit('dispositivo:created', { dispositivo });
      } catch (e) {
        console.log('WebSocket no disponible');
      }
      
      res.status(201).json({
        msg: 'Dispositivo registrado exitosamente',
        dispositivo
      });
    }
    
  } catch (error: any) {
    console.error('Error al registrar dispositivo:', error);
    
    // Manejo específico de errores de constraint unique
    if (error.name === 'SequelizeUniqueConstraintError') {
      const field = error.errors?.[0]?.path || 'campo';
      res.status(400).json({ 
        msg: `Ya existe un dispositivo con ese ${field}. Por favor verifica los datos.`,
        error: 'duplicate_entry'
      });
      return;
    }
    
    res.status(500).json({ msg: 'Error al registrar el dispositivo' });
  }
};

/**
 * Actualizar dispositivo
 */
export const actualizarDispositivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      nombre,
      categoria,
      marca,
      modelo,
      serial,
      imei,
      color,
      descripcion,
      condicion,
      ubicacion,
      observaciones,
      Uid
    } = req.body;
    
    const dispositivo = await Dispositivo.findByPk(Number(id));
    
    if (!dispositivo) {
      res.status(404).json({ msg: 'Dispositivo no encontrado' });
      return;
    }
    
    // Actualizar campos
    await dispositivo.update({
      nombre,
      categoria,
      marca,
      modelo,
      serial,
      imei,
      color,
      descripcion,
      condicion,
      ubicacion,
      observaciones
    });
    
    // Registrar movimiento de actualización
    await MovimientoDispositivo.create({
      dispositivoId: dispositivo.id,
      tipoMovimiento: 'actualizacion',
      descripcion: `Dispositivo actualizado`,
      fecha: new Date(),
      Uid
    });
    
    // Emitir evento WebSocket
    try {
      const io = getIO();
      io.to('inventario').emit('dispositivo:updated', { dispositivo });
    } catch (e) {
      console.log('WebSocket no disponible');
    }
    
    res.json({
      msg: 'Dispositivo actualizado exitosamente',
      dispositivo
    });
  } catch (error) {
    console.error('Error al actualizar dispositivo:', error);
    res.status(500).json({ msg: 'Error al actualizar el dispositivo' });
  }
};

/**
 * Cambiar estado del dispositivo
 */
export const cambiarEstadoDispositivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nuevoEstado, motivo, Uid } = req.body;
    
    const dispositivo = await Dispositivo.findByPk(Number(id));
    
    if (!dispositivo) {
      res.status(404).json({ msg: 'Dispositivo no encontrado' });
      return;
    }
    
    const estadoAnterior = dispositivo.estado;
    
    await dispositivo.update({ estado: nuevoEstado });
    
    // Registrar movimiento de cambio de estado
    await MovimientoDispositivo.create({
      dispositivoId: dispositivo.id,
      tipoMovimiento: 'cambio_estado',
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      descripcion: motivo || `Estado cambiado de ${estadoAnterior} a ${nuevoEstado}`,
      fecha: new Date(),
      Uid
    });
    
    // Emitir evento WebSocket
    try {
      const io = getIO();
      io.to('inventario').emit('dispositivo:updated', { dispositivo, estadoAnterior, nuevoEstado });
    } catch (e) {
      console.log('WebSocket no disponible');
    }
    
    res.json({
      msg: 'Estado actualizado exitosamente',
      dispositivo
    });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ msg: 'Error al cambiar el estado del dispositivo' });
  }
};

/**
 * Obtener estadísticas del inventario
 */
export const obtenerEstadisticas = async (req: Request, res: Response) => {
  try {
    const stats = await Dispositivo.findAll({
      attributes: [
        'estado',
        [Dispositivo.sequelize!.fn('COUNT', Dispositivo.sequelize!.col('id')), 'cantidad']
      ],
      group: ['estado']
    });
    
    const categorias = await Dispositivo.findAll({
      attributes: [
        'categoria',
        [Dispositivo.sequelize!.fn('COUNT', Dispositivo.sequelize!.col('id')), 'cantidad']
      ],
      group: ['categoria']
    });
    
    const total = await Dispositivo.count();
    
    res.json({
      total,
      porEstado: stats,
      porCategoria: categorias
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ msg: 'Error al obtener las estadísticas' });
  }
};

/**
 * Obtener historial/trazabilidad de un dispositivo
 */
export const obtenerTrazabilidad = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const movimientos = await MovimientoDispositivo.findAll({
      where: { dispositivoId: id },
      order: [['fecha', 'DESC']],
      include: [
        {
          model: Dispositivo,
          as: 'dispositivo',
          attributes: ['nombre', 'categoria', 'marca', 'modelo']
        }
      ]
    });
    
    res.json(movimientos);
  } catch (error) {
    console.error('Error al obtener trazabilidad:', error);
    res.status(500).json({ msg: 'Error al obtener la trazabilidad' });
  }
};

/**
 * Dar de baja un dispositivo
 */
export const darDeBajaDispositivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { motivo, nuevoEstado, Uid } = req.body; // nuevoEstado: dañado, perdido, obsoleto
    
    const dispositivo = await Dispositivo.findByPk(Number(id));
    
    if (!dispositivo) {
      res.status(404).json({ msg: 'Dispositivo no encontrado' });
      return;
    }
    
    if (dispositivo.estado === 'entregado') {
      res.status(400).json({ msg: 'No se puede dar de baja un dispositivo que está entregado' });
      return;
    }
    
    const estadoAnterior = dispositivo.estado;
    
    await dispositivo.update({ estado: nuevoEstado });
    
    await MovimientoDispositivo.create({
      dispositivoId: dispositivo.id,
      tipoMovimiento: 'baja',
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      descripcion: `Dispositivo dado de baja: ${motivo}`,
      fecha: new Date(),
      Uid
    });
    
    res.json({
      msg: `Dispositivo marcado como ${nuevoEstado}`,
      dispositivo
    });
  } catch (error) {
    console.error('Error al dar de baja dispositivo:', error);
    res.status(500).json({ msg: 'Error al dar de baja el dispositivo' });
  }
};

/**
 * Agregar stock a dispositivos tipo 'stock' (cargadores, accesorios)
 */
export const agregarStockDispositivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, Uid } = req.body;
    
    const dispositivo = await Dispositivo.findByPk(Number(id));
    
    if (!dispositivo) {
      res.status(404).json({ msg: 'Dispositivo no encontrado' });
      return;
    }
    
    if (dispositivo.tipoRegistro !== 'stock') {
      res.status(400).json({ msg: 'Esta operación solo aplica para dispositivos de stock' });
      return;
    }
    
    const cantidadNum = parseInt(cantidad);
    if (!cantidadNum || cantidadNum <= 0) {
      res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' });
      return;
    }
    
    const stockAnterior = dispositivo.stockActual;
    const stockNuevo = stockAnterior + cantidadNum;
    
    await dispositivo.update({ stockActual: stockNuevo });
    
    await MovimientoDispositivo.create({
      dispositivoId: dispositivo.id,
      tipoMovimiento: 'entrada_stock',
      estadoAnterior: `stock: ${stockAnterior}`,
      estadoNuevo: `stock: ${stockNuevo}`,
      descripcion: descripcion || `Se agregaron ${cantidadNum} unidades. Motivo: ${motivo || 'compra'}`,
      fecha: new Date(),
      Uid
    });
    
    res.json({
      msg: `Se agregaron ${cantidadNum} unidades exitosamente`,
      dispositivo,
      stockAnterior,
      stockNuevo
    });
  } catch (error) {
    console.error('Error al agregar stock:', error);
    res.status(500).json({ msg: 'Error al agregar stock' });
  }
};

/**
 * Retirar stock a dispositivos tipo 'stock'
 */
export const retirarStockDispositivo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { cantidad, motivo, descripcion, Uid } = req.body;
    
    const dispositivo = await Dispositivo.findByPk(Number(id));
    
    if (!dispositivo) {
      res.status(404).json({ msg: 'Dispositivo no encontrado' });
      return;
    }
    
    if (dispositivo.tipoRegistro !== 'stock') {
      res.status(400).json({ msg: 'Esta operación solo aplica para dispositivos de stock' });
      return;
    }
    
    const cantidadNum = parseInt(cantidad);
    if (!cantidadNum || cantidadNum <= 0) {
      res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' });
      return;
    }
    
    if (dispositivo.stockActual < cantidadNum) {
      res.status(400).json({ 
        msg: `Stock insuficiente. Disponible: ${dispositivo.stockActual} unidades` 
      });
      return;
    }
    
    const stockAnterior = dispositivo.stockActual;
    const stockNuevo = stockAnterior - cantidadNum;
    
    await dispositivo.update({ stockActual: stockNuevo });
    
    await MovimientoDispositivo.create({
      dispositivoId: dispositivo.id,
      tipoMovimiento: 'salida_stock',
      estadoAnterior: `stock: ${stockAnterior}`,
      estadoNuevo: `stock: ${stockNuevo}`,
      descripcion: descripcion || `Se retiraron ${cantidadNum} unidades. Motivo: ${motivo || 'entrega'}`,
      fecha: new Date(),
      Uid
    });
    
    res.json({
      msg: `Se retiraron ${cantidadNum} unidades exitosamente`,
      dispositivo,
      stockAnterior,
      stockNuevo
    });
  } catch (error) {
    console.error('Error al retirar stock:', error);
    res.status(500).json({ msg: 'Error al retirar stock' });
  }
};

