import { Router } from 'express';
import { upload } from '../config/multer.js';
import {
  obtenerDispositivos,
  obtenerDisponibles,
  obtenerDispositivoPorId,
  registrarDispositivo,
  actualizarDispositivo,
  cambiarEstadoDispositivo,
  obtenerEstadisticas,
  obtenerTrazabilidad,
  darDeBajaDispositivo,
  agregarStockDispositivo,
  retirarStockDispositivo,
  convertirAStock
} from '../controllers/dispositivo.js';
import validateToken from './validateToken.js';

const router = Router();

// Rutas específicas primero (antes de las rutas con parámetros dinámicos)
router.get('/disponibles', validateToken, obtenerDisponibles);
router.get('/estadisticas', validateToken, obtenerEstadisticas);

// Rutas con parámetros dinámicos
router.get('/', validateToken, obtenerDispositivos);
router.get('/:id/trazabilidad', validateToken, obtenerTrazabilidad);
router.get('/:id', validateToken, obtenerDispositivoPorId);

// Rutas de escritura
router.post('/', validateToken, upload.array('fotos', 10), registrarDispositivo);
router.put('/:id', validateToken, actualizarDispositivo);
router.patch('/:id/estado', validateToken, cambiarEstadoDispositivo);
router.patch('/:id/baja', validateToken, darDeBajaDispositivo);

// Rutas para gestión de stock
router.post('/:id/agregar-stock', validateToken, agregarStockDispositivo);
router.post('/:id/retirar-stock', validateToken, retirarStockDispositivo);
router.post('/:id/convertir-stock', validateToken, convertirAStock);

export default router;
