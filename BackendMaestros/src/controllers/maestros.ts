import {
  Request,
  Response,
} from 'express';
import { Op } from 'sequelize';

import { maestroBorrado } from '../models/maestroBorrado.js';
import { Maestro } from '../models/maestros.js';
import { MovimientoMaestro } from '../models/movimientoMaestro.js';
import { User } from '../models/user.js';
import { Analista } from '../models/analista.js';
import { getIO } from '../models/server.js';

export const registrarMaestro = async (
  req: Request,
  res: Response
): Promise<any> => {
  const {
    nombre,
    analistaAsignado,
    Aid,
    firmaEntrega,
    descripcionEntrega,
    fotosEntrega,
    estado,
    almacen,
    marca,
    modelo,
    imei,
    stockMinimo,
    fechaIngreso,
    Uid,
  } = req.body;
  try {
    // Crear el nuevo celular en inventario
    const maestro = await Maestro.create({
      nombre,
      analistaAsignado,
      Aid,
      firmaEntrega,
      descripcionEntrega,
      fotosEntrega,
      estado: estado || 'disponible',
      almacen: almacen || 'Principal',
      marca,
      modelo,
      imei,
      stockMinimo: stockMinimo || 5,
      fechaIngreso: fechaIngreso || new Date(),
      Uid,
    });

    await MovimientoMaestro.create({
      Mid: maestro.Mid,
      tipoMovimiento: "CREACION",
    });

    // Emitir evento WebSocket
    try {
      const io = getIO();
      io.to('maestros').emit('maestro:created', { maestro });
    } catch (e) {
      console.log('WebSocket no disponible');
    }

    res.status(200).json({
      message: "Maestro registrado con éxito",
      maestro: maestro,
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({
      error: "Problemas al registrar el maestro",
      message: err.message || err,
    });
  }
};

export const ObtenerMaestros = async (
  req: Request,
  res: Response
): Promise<any> => {
  const listaMaestro = await Maestro.findAll();
  res.status(200).json({
    maestros: listaMaestro,
  });
};
export const ObtenerMaestrPorId = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Mid } = req.params;
  try {
    const maestro = await Maestro.findByPk(Number(Mid));
    if (!maestro) {
      return res.status(404).json({
        message: `No existe el maestro con el id: ${Mid}`,
      });
    }

    res.status(200).json({
      message: `Maestro con ID ${Mid} encontrado`,
      maestro,
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({
      error: "Problemas al obtener el maestro",
      message: err.message || err,
    });
  }
};

export const borrarMaestrosPorId = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Mid } = req.params;
  const { firmaRecibe, descripcionRecibe,maestroRecibido,fechaEntrega, nombreCompletoRecibe } = req.body;

  try {
    const maestro = await Maestro.findByPk(Number(Mid));

    if (!maestro) {
      return res.status(404).json({
        message: `No existe el maestro con el id: ${Mid}`,
      });
    }

    // Crear registro en la tabla maestroBorrado con los datos modificados
    await maestroBorrado.create({
      Mid: maestro.Mid,
      nombre: maestro.nombre,
      NombreMaestro: maestro.analistaAsignado,
      maestroRecibido: maestroRecibido,
      firmaEntrega: maestro.firmaEntrega,
      firmaRecibe: firmaRecibe, // Firma proporcionada por el usuario
      descripcionEntrega: maestro.descripcionEntrega,
      descripcionRecibe: descripcionRecibe, // Descripcion proporcionada por el usuario
      region: maestro.almacen, // Ahora se usa almacen en lugar de region
      marca: maestro.marca,
      modelo: maestro.modelo,
      imei: maestro.imei,
      fechaRecibe: maestro.fechaIngreso,
      fechaEntrega: fechaEntrega, // Fecha proporcionada por el usuario
      Uid: maestro.Uid,
      nombreCompletoRecibe: nombreCompletoRecibe, // Nombre completo proporcionado por el
      estado: "Entregado",
      deletedAt: new Date(),
    });

    // Crear registro en la tabla MovimientoMaestro
    await MovimientoMaestro.create({
      Mid: maestro.Mid,
      tipoMovimiento: "ELIMINACION",
    });

    // Eliminar el maestro de la tabla Maestro
     await Maestro.destroy({ where: { Mid } });

    // Emitir evento WebSocket
    try {
      const io = getIO();
      io.to('maestros').emit('maestro:entregado', { Mid, maestroRecibido });
    } catch (e) {
      console.log('WebSocket no disponible');
    }

    res.status(200).json({
      message: `Maestro con ID ${Mid} eliminado y datos actualizados`,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: 'Problemas al borrar el maestro',
      message: err.message || err,
    });
  }
};

export const actualizarMaestro = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Mid } = req.params;
  const { nombre, analistaAsignado, Aid, firma, descripcion, almacen, estado, marca, modelo, stockMinimo } =
    req.body;
  try {
    const maestro = await Maestro.findByPk(Number(Mid));
    if (!maestro) {
      return res.status(404).json({
        message: `No existe el maestro con el id: ${Mid}`,
      });
    }

    await Maestro.update(
      {
        nombre,
        analistaAsignado,
        Aid,
        firma,
        almacen,
        estado,
        descripcion,
        marca,
        modelo,
        stockMinimo,
      },
      { where: { Mid } }
    );

    // Emitir evento WebSocket
    try {
      const io = getIO();
      io.to('maestros').emit('maestro:updated', { Mid, nombre, estado });
    } catch (e) {
      console.log('WebSocket no disponible');
    }

    res.status(200).json({
      message: `Maestro con ID ${Mid} actualizado`,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: "Problemas al actualizar el maestro",
      message: err.message || err,
    });
  }
};

export const maestrosActivos = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const maestros = await Maestro.findAll({
      where: { estado: "activo" },
      include: [
        {
          model: User,
          as: "usuarios",
          attributes: ["nombre", "apellido"], // Ajusta los atributos según tus necesidades
        },
      ],
    });

    res.status(200).json(maestros);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: "Problemas al obtener los maestros activos",
      message: err.message || err,
    });
  }
};

export const generarReporte = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { fechaInicio, fechaFin } = req.body;

  // Validar que las fechas sean válidas
  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({
      error: "Problemas al generar el reporte",
      message: "Las fechas de inicio y fin son requeridas",
    });
  }

  const fechaInicioDate = new Date(fechaInicio);
  const fechaFinDate = new Date(fechaFin);

  if (isNaN(fechaInicioDate.getTime()) || isNaN(fechaFinDate.getTime())) {
    return res.status(400).json({
      error: "Problemas al generar el reporte",
      message: "Formato de fecha inválido",
    });
  }

  try {
    const movimientos = await MovimientoMaestro.findAll({
      where: {
        fechaMovimiento: {
          [Op.between]: [fechaInicioDate, fechaFinDate],
        },
      },
    });

    res.status(200).json({
      message: "Reporte generado con éxito",
      movimientos: movimientos,
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({
      error: "Problemas al generar el reporte",
      message: err.message || err,
    });
  }
};

export const generarReporteMensual = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const now = new Date();
    const mes = now.getMonth(); // Mes actual (0-11)
    const año = now.getFullYear(); // Año actual

    const fechaInicio = new Date(año, mes, 1);
    const fechaFin = new Date(año, mes + 1, 0);

    const movimientos = await MovimientoMaestro.findAll({
      where: {
        fechaMovimiento: {
          [Op.between]: [fechaInicio, fechaFin],
        },
      },
    });

    res.status(200).json({
      message: "Reporte mensual generado con éxito",
      movimientos: movimientos,
    });
  } catch (err: any) {
    console.log(err);
    res.status(500).json({
      error: "Problemas al generar el reporte mensual",
      message: err.message || err,
    });
  }
};
export const reactivarMaestro = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Mid } = req.params;

  try {
    // Buscar el maestro en la tabla maestros_borrados
    const maestroInactivo = await maestroBorrado.findOne({ where: { Mid } });

    if (!maestroInactivo) {
      return res.status(404).json({
        error: "Maestro no encontrado en la tabla de maestros inactivos",
      });
    }

    // Mover el maestro a la tabla maestros
    const maestroActivo = await Maestro.create({
      Mid: maestroInactivo.Mid,
      nombre: maestroInactivo.nombre,
      analistaAsignado: maestroInactivo.NombreMaestro,
      firmaEntrega: maestroInactivo.firmaEntrega,
      firmaRecibe: maestroInactivo.firmaRecibe,
      descripcionEntrega: maestroInactivo.descripcionEntrega,
      descripcionRecibe: maestroInactivo.descripcionRecibe,
      Uid: maestroInactivo.Uid,
      estado: "disponible",
      almacen: maestroInactivo.region || 'Principal',
      marca: maestroInactivo.marca,
      modelo: maestroInactivo.modelo,
      imei: maestroInactivo.imei,
      fechaIngreso: maestroInactivo.fechaRecibe,
      fechaSalida: maestroInactivo.fechaEntrega,
    });

    // Eliminar el maestro de la tabla maestros_borrados
    await maestroBorrado.destroy({ where: { Mid } });

    // Emitir evento WebSocket
    try {
      const io = getIO();
      io.to('maestros').emit('maestro:reactivado', { maestro: maestroActivo });
    } catch (e) {
      console.log('WebSocket no disponible');
    }

    res.status(200).json({
      message: "Maestro reactivado exitosamente",
      maestro: maestroActivo,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: "Problemas al reactivar el maestro",
      message: err.message || err,
    });
  }
};
export const obtenerTodosLosMaestros = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    // Obtener maestros activos
    const maestrosActivos = await Maestro.findAll({
      include: [
        {
          model: User,
          as: "usuarios",
          attributes: ["nombre", "apellido"], // Ajusta los atributos según tus necesidades
        },
      ],
    });

    // Obtener maestros inactivos
    const maestrosInactivos = await maestroBorrado.findAll({
      include: [
        {
          model: User,
          as: "usuarios",
          attributes: ["nombre", "apellido"], // Ajusta los atributos según tus necesidades
        },
      ],
    });

    // Combinar los resultados
    const todosLosMaestros = [...maestrosActivos, ...maestrosInactivos];

    res.status(200).json({
      message: "Lista de todos los maestros (activos e inactivos)",
      maestros: todosLosMaestros,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: "Problemas al obtener la lista de maestros",
      message: err.message || err,
    });
  }
};