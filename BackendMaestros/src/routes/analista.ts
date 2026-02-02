import { Router } from 'express';

import {
  actualizarAnalista,
  desactivarAnalista,
  eliminarAnalista,
  obtenerAnalistas,
  obtenerAnalistasActivos,
  obtenerAnalistaPorId,
  reactivarAnalista,
  registrarAnalista,
} from '../controllers/analista.js';
import validateToken from './validateToken.js';

const router = Router();

// Rutas de analistas
router.get("/api/analistas/obtener", validateToken, obtenerAnalistas);
router.get("/api/analistas/activos", validateToken, obtenerAnalistasActivos);
router.get("/api/analistas/obtener/:Aid", validateToken, obtenerAnalistaPorId);
router.post("/api/analistas/registrar", validateToken, registrarAnalista);
router.patch("/api/analistas/actualizar/:Aid", validateToken, actualizarAnalista);
router.patch("/api/analistas/desactivar/:Aid", validateToken, desactivarAnalista);
router.patch("/api/analistas/reactivar/:Aid", validateToken, reactivarAnalista);
router.delete("/api/analistas/eliminar/:Aid", validateToken, eliminarAnalista);

export default router;
