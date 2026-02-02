import { Router } from 'express';
import {
  obtenerMobiliario,
  obtenerMobiliarioDisponible,
  obtenerMobiliarioPorId,
  registrarMobiliario,
  actualizarMobiliario,
  cambiarEstadoMobiliario,
  obtenerEstadisticasMobiliario,
  eliminarMobiliario,
  obtenerHistorialMobiliario
} from '../controllers/mobiliario.js';
import validateToken from './validateToken.js';
import { upload } from '../config/multer.js';

const router = Router();

// Rutas GET
router.get('/', validateToken, obtenerMobiliario);
router.get('/disponibles', validateToken, obtenerMobiliarioDisponible);
router.get('/estadisticas', validateToken, obtenerEstadisticasMobiliario);
router.get('/:id', validateToken, obtenerMobiliarioPorId);
router.get('/:id/historial', validateToken, obtenerHistorialMobiliario);

// Rutas POST
router.post('/', validateToken, upload.array('fotos', 5), registrarMobiliario);

// Rutas PUT/PATCH
router.put('/:id', validateToken, actualizarMobiliario);
router.patch('/:id/estado', validateToken, cambiarEstadoMobiliario);

// Rutas DELETE (dar de baja)
router.delete('/:id', validateToken, eliminarMobiliario);

export default router;
