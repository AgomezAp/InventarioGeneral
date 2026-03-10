import { Router } from 'express';
import validateToken from './validateToken.js';
import {
  enviarSolicitudFirmaMobiliario,
  obtenerActaMobiliarioPorToken,
  firmarActaMobiliarioConToken,
  rechazarActaMobiliarioConToken,
  reenviarCorreoFirmaMobiliario,
  obtenerEstadoFirmaMobiliario
} from '../controllers/firmaMobiliario.js';

const router = Router();

// ==========================================
// RUTAS PUBLICAS (sin autenticacion)
// Accedidas por el receptor desde el correo
// ==========================================
router.get('/publica/:token', obtenerActaMobiliarioPorToken);
router.post('/publica/:token/firmar', firmarActaMobiliarioConToken);
router.post('/publica/:token/rechazar', rechazarActaMobiliarioConToken);

// ==========================================
// RUTAS PROTEGIDAS (requieren autenticacion)
// ==========================================
router.post('/enviar/:id', validateToken, enviarSolicitudFirmaMobiliario);
router.post('/reenviar/:id', validateToken, reenviarCorreoFirmaMobiliario);
router.get('/estado/:id', validateToken, obtenerEstadoFirmaMobiliario);

export default router;
