import { Router } from 'express';
import validateToken from './validateToken.js';
import {
  enviarSolicitudFirma,
  obtenerActaPorToken,
  firmarActaConToken,
  rechazarActaConToken,
  reenviarCorreoFirma,
  obtenerEstadoFirma
} from '../controllers/firmaExterna.js';

const router = Router();

// ==========================================
// RUTAS PÚBLICAS (sin autenticación)
// Estas rutas son accedidas por el receptor desde el correo
// ==========================================

// Obtener datos del acta por token (para mostrar al receptor)
router.get('/publica/:token', obtenerActaPorToken);

// Firmar acta con token
router.post('/publica/:token/firmar', firmarActaConToken);

// Rechazar/Devolver acta para corrección
router.post('/publica/:token/rechazar', rechazarActaConToken);

// ==========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// Estas rutas son usadas por el sistema interno
// ==========================================

// Enviar solicitud de firma por correo
router.post('/enviar/:id', validateToken, enviarSolicitudFirma);

// Reenviar correo de firma
router.post('/reenviar/:id', validateToken, reenviarCorreoFirma);

// Obtener estado de firma de un acta
router.get('/estado/:id', validateToken, obtenerEstadoFirma);

export default router;
