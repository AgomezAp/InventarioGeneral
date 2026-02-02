import { Router } from 'express';
import {
  obtenerTiposInventario,
  obtenerTipoPorId,
  obtenerTipoPorCodigo,
  crearTipoInventario,
  actualizarTipoInventario
} from '../controllers/tipoInventario.js';
import validateToken from './validateToken.js';

const router = Router();

// Rutas públicas
router.get('/', obtenerTiposInventario);
router.get('/codigo/:codigo', obtenerTipoPorCodigo);
router.get('/:id', obtenerTipoPorId);

// Rutas protegidas
router.post('/', validateToken, crearTipoInventario);
router.put('/:id', validateToken, actualizarTipoInventario);

export default router;
