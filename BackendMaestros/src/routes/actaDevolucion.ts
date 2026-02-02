import { Router } from 'express';
import validateToken from './validateToken.js';
import { upload } from '../config/multer.js';
import {
  obtenerDispositivosEntregados,
  obtenerActasDevolucion,
  obtenerActaDevolucionPorId,
  crearActaDevolucion,
  enviarSolicitudFirmaDevolucion,
  obtenerActaDevolucionPorToken,
  firmarActaDevolucionConToken,
  rechazarActaDevolucionConToken,
  reenviarCorreoDevolucion
} from '../controllers/actaDevolucion.js';

const router = Router();

// ==========================================
// RUTAS PÚBLICAS (sin autenticación)
// Accedidas por el receptor desde el correo
// ==========================================

// Obtener datos del acta por token (para mostrar al receptor)
router.get('/publica/:token', obtenerActaDevolucionPorToken);

// Firmar acta con token
router.post('/publica/:token/firmar', firmarActaDevolucionConToken);

// Rechazar acta con token
router.post('/publica/:token/rechazar', rechazarActaDevolucionConToken);

// ==========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ==========================================

// Obtener dispositivos entregados (disponibles para devolución)
router.get('/dispositivos-entregados', validateToken, obtenerDispositivosEntregados);

// Obtener todas las actas de devolución
router.get('/', validateToken, obtenerActasDevolucion);

// Obtener acta por ID
router.get('/:id', validateToken, obtenerActaDevolucionPorId);

// Crear nueva acta de devolución
router.post('/', validateToken, upload.any(), crearActaDevolucion);

// Enviar solicitud de firma por correo
router.post('/enviar-firma/:id', validateToken, enviarSolicitudFirmaDevolucion);

// Reenviar correo de firma
router.post('/reenviar-firma/:id', validateToken, reenviarCorreoDevolucion);

export default router;
