import { Router } from 'express';
import { upload } from '../config/multer.js';
import {
  obtenerActasMobiliario,
  obtenerActaMobiliarioPorId,
  crearActaMobiliario,
  registrarDevolucionMobiliario,
  obtenerActasMobiliarioActivas,
  obtenerHistorialMobiliarioActas,
  cancelarActaMobiliario,
  eliminarActaMobiliario
} from '../controllers/actaMobiliario.js';
import validateToken from './validateToken.js';

const router = Router();

// Obtener actas
router.get('/', validateToken, obtenerActasMobiliario);
router.get('/activas', validateToken, obtenerActasMobiliarioActivas);
router.get('/:id', validateToken, obtenerActaMobiliarioPorId);
router.get('/historial/:mobiliarioId', validateToken, obtenerHistorialMobiliarioActas);

// Crear acta de entrega con fotos
router.post('/', validateToken, upload.any(), crearActaMobiliario);

// Registrar devolucion
router.post('/:id/devolucion', validateToken, upload.any(), registrarDevolucionMobiliario);

// Cancelar acta
router.delete('/:id', validateToken, cancelarActaMobiliario);

// Eliminar acta cancelada/rechazada permanentemente
router.delete('/:id/eliminar', validateToken, eliminarActaMobiliario);

export default router;
