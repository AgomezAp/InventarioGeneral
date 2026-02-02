import { Request, Response } from 'express';
import { Op, fn, col } from 'sequelize';
import { Mobiliario } from '../models/mobiliario.js';
import { MovimientoMobiliario } from '../models/movimientoMobiliario.js';
import { User } from '../models/user.js';
import { getIO } from '../models/server.js';

/**
 * Obtener todo el mobiliario con filtros
 */
export const obtenerMobiliario = async (req: Request, res: Response) => {
  try {
    const { estado, categoria, ubicacion, area, busqueda } = req.query;
    
    let where: any = {};
    
    if (estado && estado !== 'todos') {
      where.estado = estado;
    }
    
    if (categoria && categoria !== 'todas') {
      where.categoria = categoria;
    }
    
    if (ubicacion && ubicacion !== 'todas') {
      where.ubicacion = { [Op.iLike]: `%${ubicacion}%` };
    }
    
    if (area && area !== 'todas') {
      where.area = { [Op.iLike]: `%${area}%` };
    }
    
    if (busqueda) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${busqueda}%` } },
        { marca: { [Op.iLike]: `%${busqueda}%` } },
        { ubicacion: { [Op.iLike]: `%${busqueda}%` } },
        { area: { [Op.iLike]: `%${busqueda}%` } }
      ];
    }
    
    const mobiliario = await Mobiliario.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    
    res.json(mobiliario);
  } catch (error) {
    console.error('Error al obtener mobiliario:', error);
    res.status(500).json({ msg: 'Error al obtener el mobiliario' });
  }
};

/**
 * Obtener mobiliario disponible para asignación
 */
export const obtenerMobiliarioDisponible = async (req: Request, res: Response) => {
  try {
    const mobiliario = await Mobiliario.findAll({
      where: { estado: 'disponible' },
      order: [['categoria', 'ASC'], ['nombre', 'ASC']]
    });
    
    res.json(mobiliario);
  } catch (error) {
    console.error('Error al obtener mobiliario disponible:', error);
    res.status(500).json({ msg: 'Error al obtener el mobiliario disponible' });
  }
};

/**
 * Obtener un mueble por ID con su historial
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
      res.status(404).json({ msg: 'Mueble no encontrado' });
      return;
    }
    
    res.json(mueble);
  } catch (error) {
    console.error('Error al obtener mueble:', error);
    res.status(500).json({ msg: 'Error al obtener el mueble' });
  }
};

/**
 * Registrar nuevo mueble en el inventario
 */
export const registrarMobiliario = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nombre,
      categoria,
      marca,
      dimensiones,
      material,
      color,
      descripcion,
      condicion,
      ubicacion,
      area,
      observaciones,
      Uid
    } = req.body;
    
    // Procesar fotos si se subieron
    let fotos: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      fotos = (req.files as Express.Multer.File[]).map(file => file.filename);
    }
    
    const nuevoMueble = await Mobiliario.create({
      nombre,
      categoria,
      marca,
      dimensiones,
      material,
      color,
      descripcion,
      estado: 'disponible',
      condicion: condicion || 'bueno',
      ubicacion,
      area,
      fotos: JSON.stringify(fotos),
      fechaIngreso: new Date(),
      observaciones,
      Uid
    });
    
    // Registrar movimiento de ingreso
    await MovimientoMobiliario.create({
      mobiliarioId: nuevoMueble.id,
      tipoMovimiento: 'ingreso',
      estadoNuevo: 'disponible',
      ubicacionNueva: ubicacion,
      descripcion: 'Ingreso inicial al inventario',
      fecha: new Date(),
      Uid
    });
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('mobiliario').emit('mobiliario:created', nuevoMueble);
    
    res.status(201).json({
      msg: 'Mueble registrado exitosamente',
      mobiliario: nuevoMueble
    });
  } catch (error) {
    console.error('Error al registrar mueble:', error);
    res.status(500).json({ msg: 'Error al registrar el mueble' });
  }
};

/**
 * Actualizar mueble
 */
export const actualizarMobiliario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      nombre,
      categoria,
      marca,
      dimensiones,
      material,
      color,
      descripcion,
      condicion,
      ubicacion,
      area,
      observaciones,
      Uid
    } = req.body;
    
    const mueble = await Mobiliario.findByPk(Number(id));
    
    if (!mueble) {
      res.status(404).json({ msg: 'Mueble no encontrado' });
      return;
    }
    
    const ubicacionAnterior = mueble.ubicacion;
    
    await mueble.update({
      nombre: nombre || mueble.nombre,
      categoria: categoria || mueble.categoria,
      marca: marca !== undefined ? marca : mueble.marca,
      dimensiones: dimensiones !== undefined ? dimensiones : mueble.dimensiones,
      material: material !== undefined ? material : mueble.material,
      color: color !== undefined ? color : mueble.color,
      descripcion: descripcion !== undefined ? descripcion : mueble.descripcion,
      condicion: condicion || mueble.condicion,
      ubicacion: ubicacion !== undefined ? ubicacion : mueble.ubicacion,
      area: area !== undefined ? area : mueble.area,
      observaciones: observaciones !== undefined ? observaciones : mueble.observaciones
    });
    
    // Si cambió la ubicación, registrar movimiento
    if (ubicacion && ubicacion !== ubicacionAnterior) {
      await MovimientoMobiliario.create({
        mobiliarioId: mueble.id,
        tipoMovimiento: 'cambio_ubicacion',
        ubicacionAnterior,
        ubicacionNueva: ubicacion,
        descripcion: `Cambio de ubicación de "${ubicacionAnterior}" a "${ubicacion}"`,
        fecha: new Date(),
        Uid
      });
    }
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('mobiliario').emit('mobiliario:updated', mueble);
    
    res.json({
      msg: 'Mueble actualizado exitosamente',
      mobiliario: mueble
    });
  } catch (error) {
    console.error('Error al actualizar mueble:', error);
    res.status(500).json({ msg: 'Error al actualizar el mueble' });
  }
};

/**
 * Cambiar estado del mueble
 */
export const cambiarEstadoMobiliario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nuevoEstado, motivo, Uid } = req.body;
    
    const mueble = await Mobiliario.findByPk(Number(id));
    
    if (!mueble) {
      res.status(404).json({ msg: 'Mueble no encontrado' });
      return;
    }
    
    const estadoAnterior = mueble.estado;
    
    await mueble.update({ estado: nuevoEstado });
    
    // Registrar movimiento
    let tipoMovimiento = 'cambio_ubicacion';
    if (nuevoEstado === 'asignado') tipoMovimiento = 'asignacion';
    if (nuevoEstado === 'disponible' && estadoAnterior === 'asignado') tipoMovimiento = 'devolucion';
    if (nuevoEstado === 'dado_de_baja') tipoMovimiento = 'baja';
    if (nuevoEstado === 'dañado') tipoMovimiento = 'reparacion';
    
    await MovimientoMobiliario.create({
      mobiliarioId: mueble.id,
      tipoMovimiento,
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      descripcion: motivo || `Cambio de estado de "${estadoAnterior}" a "${nuevoEstado}"`,
      fecha: new Date(),
      Uid
    });
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('mobiliario').emit('mobiliario:updated', mueble);
    
    res.json({
      msg: 'Estado actualizado exitosamente',
      mobiliario: mueble
    });
  } catch (error) {
    console.error('Error al cambiar estado del mueble:', error);
    res.status(500).json({ msg: 'Error al cambiar el estado del mueble' });
  }
};

/**
 * Obtener estadísticas del mobiliario
 */
export const obtenerEstadisticasMobiliario = async (req: Request, res: Response) => {
  try {
    const total = await Mobiliario.count();
    
    const porEstado = await Mobiliario.findAll({
      attributes: [
        'estado',
        [fn('COUNT', col('estado')), 'cantidad']
      ],
      group: ['estado']
    });
    
    const porCategoria = await Mobiliario.findAll({
      attributes: [
        'categoria',
        [fn('COUNT', col('categoria')), 'cantidad']
      ],
      group: ['categoria']
    });
    
    const porUbicacion = await Mobiliario.findAll({
      attributes: [
        'ubicacion',
        [fn('COUNT', col('ubicacion')), 'cantidad']
      ],
      group: ['ubicacion']
    });
    
    res.json({
      total,
      porEstado: porEstado.map((item: any) => ({
        estado: item.estado,
        cantidad: parseInt(item.getDataValue('cantidad'))
      })),
      porCategoria: porCategoria.map((item: any) => ({
        categoria: item.categoria,
        cantidad: parseInt(item.getDataValue('cantidad'))
      })),
      porUbicacion: porUbicacion.map((item: any) => ({
        ubicacion: item.ubicacion,
        cantidad: parseInt(item.getDataValue('cantidad'))
      }))
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ msg: 'Error al obtener las estadísticas' });
  }
};

/**
 * Eliminar mueble (dar de baja)
 */
export const eliminarMobiliario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { motivo, Uid } = req.body;
    
    const mueble = await Mobiliario.findByPk(Number(id));
    
    if (!mueble) {
      res.status(404).json({ msg: 'Mueble no encontrado' });
      return;
    }
    
    const estadoAnterior = mueble.estado;
    
    // En lugar de eliminar, cambiar estado a dado_de_baja
    await mueble.update({ estado: 'dado_de_baja' });
    
    // Registrar movimiento
    await MovimientoMobiliario.create({
      mobiliarioId: mueble.id,
      tipoMovimiento: 'baja',
      estadoAnterior,
      estadoNuevo: 'dado_de_baja',
      descripcion: motivo || 'Dado de baja del inventario',
      fecha: new Date(),
      Uid
    });
    
    // Emitir evento WebSocket
    const io = getIO();
    io.to('mobiliario').emit('mobiliario:deleted', { id: mueble.id });
    
    res.json({
      msg: 'Mueble dado de baja exitosamente',
      mobiliario: mueble
    });
  } catch (error) {
    console.error('Error al dar de baja el mueble:', error);
    res.status(500).json({ msg: 'Error al dar de baja el mueble' });
  }
};

/**
 * Obtener historial de movimientos de un mueble
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
