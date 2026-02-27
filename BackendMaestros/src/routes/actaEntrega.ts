import { Router } from 'express';
import { upload } from '../config/multer.js';
import {
  obtenerActas,
  obtenerActaPorId,
  crearActaEntrega,
  registrarDevolucion,
  obtenerActasActivas,
  obtenerHistorialDispositivo,
  cancelarActaEntrega
} from '../controllers/actaEntrega.js';
import validateToken from './validateToken.js';

const router = Router();

// Obtener actas
router.get('/', validateToken, obtenerActas);
router.get('/activas', validateToken, obtenerActasActivas);
router.get('/:id', validateToken, obtenerActaPorId);
router.get('/historial/:dispositivoId', validateToken, obtenerHistorialDispositivo);

// Crear acta de entrega con fotos
router.post('/', validateToken, upload.any(), crearActaEntrega);

// Registrar devolución
router.post('/:id/devolucion', validateToken, upload.any(), registrarDevolucion);

// Cancelar acta pendiente de firma
router.delete('/:id', validateToken, cancelarActaEntrega);

export default router;
