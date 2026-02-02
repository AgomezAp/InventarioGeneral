import {
  Request,
  Response,
} from 'express';

import { Analista } from '../models/analista.js';

// Obtener todos los analistas
export const obtenerAnalistas = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const analistas = await Analista.findAll({
      order: [['nombre', 'ASC']],
    });
    res.status(200).json({
      analistas,
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({
      error: "Problemas al obtener los analistas",
      message: err.message || err,
    });
  }
};

// Obtener analistas activos
export const obtenerAnalistasActivos = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const analistas = await Analista.findAll({
      where: { activo: true },
      order: [['nombre', 'ASC']],
    });
    res.status(200).json({
      analistas,
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({
      error: "Problemas al obtener los analistas activos",
      message: err.message || err,
    });
  }
};

// Obtener analista por ID
export const obtenerAnalistaPorId = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Aid } = req.params;
  try {
    const analista = await Analista.findByPk(Number(Aid));
    if (!analista) {
      return res.status(404).json({
        message: `No existe el analista con el id: ${Aid}`,
      });
    }

    res.status(200).json({
      message: `Analista con ID ${Aid} encontrado`,
      analista,
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({
      error: "Problemas al obtener el analista",
      message: err.message || err,
    });
  }
};

// Registrar nuevo analista
export const registrarAnalista = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { nombre, apellido, cedula, telefono, correo, cargo } = req.body;
  
  try {
    // Verificar si ya existe un analista con esa cédula
    const analistaExistente = await Analista.findOne({ where: { cedula } });
    if (analistaExistente) {
      return res.status(400).json({
        error: `Ya existe un analista con la cédula: ${cedula}`,
      });
    }

    const analista = await Analista.create({
      nombre,
      apellido,
      cedula,
      telefono,
      correo,
      cargo: cargo || 'Analista',
      activo: true,
    });

    res.status(200).json({
      message: "Analista registrado con éxito",
      analista,
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({
      error: "Problemas al registrar el analista",
      message: err.message || err,
    });
  }
};

// Actualizar analista
export const actualizarAnalista = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Aid } = req.params;
  const { nombre, apellido, cedula, telefono, correo, cargo, activo } = req.body;
  
  try {
    const analista = await Analista.findByPk(Number(Aid));
    if (!analista) {
      return res.status(404).json({
        message: `No existe el analista con el id: ${Aid}`,
      });
    }

    await Analista.update(
      {
        nombre,
        apellido,
        cedula,
        telefono,
        correo,
        cargo,
        activo,
      },
      { where: { Aid } }
    );
    
    res.status(200).json({
      message: `Analista con ID ${Aid} actualizado`,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: "Problemas al actualizar el analista",
      message: err.message || err,
    });
  }
};

// Desactivar analista
export const desactivarAnalista = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Aid } = req.params;
  
  try {
    const analista = await Analista.findByPk(Number(Aid));
    if (!analista) {
      return res.status(404).json({
        message: `No existe el analista con el id: ${Aid}`,
      });
    }

    await Analista.update(
      { activo: false },
      { where: { Aid } }
    );
    
    res.status(200).json({
      message: `Analista con ID ${Aid} desactivado`,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: "Problemas al desactivar el analista",
      message: err.message || err,
    });
  }
};

// Reactivar analista
export const reactivarAnalista = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Aid } = req.params;
  
  try {
    const analista = await Analista.findByPk(Number(Aid));
    if (!analista) {
      return res.status(404).json({
        message: `No existe el analista con el id: ${Aid}`,
      });
    }

    await Analista.update(
      { activo: true },
      { where: { Aid } }
    );
    
    res.status(200).json({
      message: `Analista con ID ${Aid} reactivado`,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: "Problemas al reactivar el analista",
      message: err.message || err,
    });
  }
};

// Eliminar analista (solo si no tiene celulares asignados)
export const eliminarAnalista = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Aid } = req.params;
  
  try {
    const analista = await Analista.findByPk(Number(Aid));
    if (!analista) {
      return res.status(404).json({
        message: `No existe el analista con el id: ${Aid}`,
      });
    }

    // Verificar si tiene celulares asignados
    const celularesAsignados = await Maestro.count({ where: { Aid, estado: 'en_uso' } });
    if (celularesAsignados > 0) {
      return res.status(400).json({
        error: `No se puede eliminar el analista porque tiene ${celularesAsignados} celular(es) asignado(s)`,
      });
    }

    await Analista.destroy({ where: { Aid } });
    
    res.status(200).json({
      message: `Analista con ID ${Aid} eliminado`,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: "Problemas al eliminar el analista",
      message: err.message || err,
    });
  }
};

// Importar Maestro para la verificación
import { Maestro } from '../models/maestros.js';
