import bcrypt from 'bcrypt';
import {
  Request,
  Response,
} from 'express';
import jwt from 'jsonwebtoken';

import { Maestro } from '../models/maestros.js';
import { User } from '../models/user.js';

export const register = async (req: Request, res: Response): Promise<any> => {
  const { nombre, apellido, correo, contrasena } = req.body;
  const emailDomain = correo.split('@')[1];
  if (emailDomain !== 'andrespublicidadtg.com') {
    return res.status(400).json({
      msg: 'Correo no valido',
    });
  }
  // Verificar si el usuario ya existe
  const userOne = await User.findOne({ where: { correo: correo } });
  if (userOne) {
    return res.status(400).json({
      msg: `El usuario ya existe con el email: ${correo}`,
    });
  }
  const passwordHash = await bcrypt.hash(contrasena, 10);

  try {
    const newUser = await User.create({
      nombre,
      apellido,
      correo,
      contrasena: passwordHash,
    });

    res.status(200).json({
      message: "Usuario registrado con éxito",
      user: newUser,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: "Problemas al registrar el usuario",
      message: err.message || err,
    });
  }
};
export const login = async (req: Request, res: Response): Promise<any> => {
  const { correo, contrasena } = req.body;
  const user: any = await User.findOne({
    where: { correo },
  });
  if (!user) {
    return res.status(400).json({
      msg: `El usuario no existe con el email: ${correo}`,
    });
  }
  const contrasenaValida = await bcrypt.compare(contrasena, user.contrasena);
  if (!contrasenaValida) {
    return res.status(400).json({
      msg: "Contraseña incorrecta",
    });
  }

  const token = jwt.sign(
    {
      Uid: user.Uid,
      correo: user.correo,
    },
    process.env.SECRET_KEY || "DxVj971V5CxBQGB7hDqwOenbRbbH4mrS",
    {
      expiresIn: "365d", // 1 año
    }
  );
  res.json({
    msg: "Usuario logeado con éxito",
    Uid : user.Uid,
    nombre: user.nombre,
    apellido: user.apellido,
    token,
  });
};

export const restablecerContrasena = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { correo, nuevaContrasena } = req.body;
  try {
    const user = await User.findOne({ where: { correo } });
    if (!user) {
      return res.status(404).json({ msg: "Usario no encontrado" });
    }
    const passwordHash = await bcrypt.hash(nuevaContrasena, 10);
    user.contrasena = passwordHash;
    await user.save();
    res.status(200).json({
      msg: "Contraseña restablecida con éxito",
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      error: "Problemas al restablecer la contraseña",
      message: err.message || err,
    });
  }
};
export const eliminarUsuarioId = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { Uid } = req.params;

  try {
    const user = await User.findByPk(Number(Uid));

    if (!user) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    await user.destroy();
    res.status(200).json({ msg: "Usuario eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ msg: "Error al eliminar el usuario", error });
  }
};
export const obtenerMaestrosPorIdUsuario = async (req: Request, res: Response): Promise<any> => {
  const { Uid } = req.params;

  try {
    const user = await User.findByPk(Number(Uid), {
      include: [{ model: Maestro, as: 'maestros' }]
    });

    if (!user) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    res.status(200).json({ maestros: user.maestros });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al obtener los maestros del usuario', error });
  }
};