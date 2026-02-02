import { Router } from 'express';

import {
  eliminarUsuarioId,
  login,
  obtenerMaestrosPorIdUsuario,
  register,
  restablecerContrasena,
} from '../controllers/user.js';
import validateToken from './validateToken.js';

const router = Router();

router.post( "/api/user/register",register)
router.post("/api/user/login",login)
router.patch("/api/user/reestablecer-contrasena",restablecerContrasena)

router.delete("/api/user/eliminar-usuario/:Uid",eliminarUsuarioId)
router.get("/api/user/:Uid/maestros",validateToken,obtenerMaestrosPorIdUsuario)
export default router;  