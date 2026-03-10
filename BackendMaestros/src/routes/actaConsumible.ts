import { Router } from 'express';
import {
  obtenerActasConsumibles,
  obtenerActasPorTipo,
  obtenerActaPorId,
  crearActaConsumible,
  obtenerActaPorToken,
  firmarActa,
  rechazarActa,
  obtenerEstadisticas,
  reenviarCorreoFirma,
  cancelarActaConsumible,
  eliminarActaConsumible
} from '../controllers/actaConsumible.js';
import validateToken from './validateToken.js';

const router = Router();

// Rutas públicas (para firma por correo)
router.get('/firma/:token', obtenerActaPorToken);
router.post('/firma/:token', firmarActa);
router.post('/rechazar/:token', rechazarActa);

// Rutas protegidas
router.get('/', validateToken, obtenerActasConsumibles);
router.get('/tipo/:codigo', validateToken, obtenerActasPorTipo);
router.get('/estadisticas', validateToken, obtenerEstadisticas);
router.get('/:id', validateToken, obtenerActaPorId);
router.post('/', validateToken, crearActaConsumible);
router.post('/:id/reenviar', validateToken, reenviarCorreoFirma);

// Cancelar acta pendiente de firma
router.delete('/:id', validateToken, cancelarActaConsumible);

// Eliminar acta cancelada/rechazada permanentemente
router.delete('/:id/eliminar', validateToken, eliminarActaConsumible);

export default router;
