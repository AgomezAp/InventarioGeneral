import { Request, Response } from 'express';
import { TipoInventario } from '../models/tipoInventario.js';

/**
 * Obtener todos los tipos de inventario activos
 */
export const obtenerTiposInventario = async (req: Request, res: Response) => {
  try {
    const tipos = await TipoInventario.findAll({
      where: { activo: true },
      order: [['orden', 'ASC']]
    });
    
    res.json(tipos);
  } catch (error) {
    console.error('Error al obtener tipos de inventario:', error);
    res.status(500).json({ msg: 'Error al obtener los tipos de inventario' });
  }
};

/**
 * Obtener un tipo de inventario por ID
 */
export const obtenerTipoPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const tipo = await TipoInventario.findByPk(Number(id));
    
    if (!tipo) {
      res.status(404).json({ msg: 'Tipo de inventario no encontrado' });
      return;
    }
    
    res.json(tipo);
  } catch (error) {
    console.error('Error al obtener tipo de inventario:', error);
    res.status(500).json({ msg: 'Error al obtener el tipo de inventario' });
  }
};

/**
 * Obtener un tipo de inventario por código
 */
export const obtenerTipoPorCodigo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo } = req.params;
    
    const tipo = await TipoInventario.findOne({
      where: { codigo, activo: true }
    });
    
    if (!tipo) {
      res.status(404).json({ msg: 'Tipo de inventario no encontrado' });
      return;
    }
    
    res.json(tipo);
  } catch (error) {
    console.error('Error al obtener tipo de inventario:', error);
    res.status(500).json({ msg: 'Error al obtener el tipo de inventario' });
  }
};

/**
 * Crear nuevo tipo de inventario
 */
export const crearTipoInventario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, codigo, descripcion, icono, color, orden } = req.body;
    
    // Verificar que no exista el código
    const existente = await TipoInventario.findOne({ where: { codigo } });
    if (existente) {
      res.status(400).json({ msg: 'Ya existe un tipo de inventario con ese código' });
      return;
    }
    
    const nuevoTipo = await TipoInventario.create({
      nombre,
      codigo,
      descripcion,
      icono: icono || 'fa-box',
      color: color || '#6c757d',
      orden: orden || 99,
      activo: true
    });
    
    res.status(201).json({
      msg: 'Tipo de inventario creado exitosamente',
      tipo: nuevoTipo
    });
  } catch (error) {
    console.error('Error al crear tipo de inventario:', error);
    res.status(500).json({ msg: 'Error al crear el tipo de inventario' });
  }
};

/**
 * Actualizar tipo de inventario
 */
export const actualizarTipoInventario = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, icono, color, orden, activo } = req.body;
    
    const tipo = await TipoInventario.findByPk(Number(id));
    
    if (!tipo) {
      res.status(404).json({ msg: 'Tipo de inventario no encontrado' });
      return;
    }
    
    await tipo.update({
      nombre: nombre || tipo.nombre,
      descripcion: descripcion !== undefined ? descripcion : tipo.descripcion,
      icono: icono || tipo.icono,
      color: color || tipo.color,
      orden: orden !== undefined ? orden : tipo.orden,
      activo: activo !== undefined ? activo : tipo.activo
    });
    
    res.json({
      msg: 'Tipo de inventario actualizado exitosamente',
      tipo
    });
  } catch (error) {
    console.error('Error al actualizar tipo de inventario:', error);
    res.status(500).json({ msg: 'Error al actualizar el tipo de inventario' });
  }
};
