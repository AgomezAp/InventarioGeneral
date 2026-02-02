import { Router } from 'express';
import {
  obtenerMobiliario,
  obtenerMobiliarioDisponible,
  obtenerMobiliarioPorId,
  registrarMobiliario,
  actualizarMobiliario,
  agregarStock,
  retirarStock,
  ajustarStock,
  obtenerEstadisticasMobiliario,
  desactivarMobiliario,
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
router.post('/', validateToken, upload.single('foto'), registrarMobiliario);
router.post('/:id/agregar-stock', validateToken, agregarStock);
router.post('/:id/retirar-stock', validateToken, retirarStock);
router.post('/:id/ajustar-stock', validateToken, ajustarStock);

// Rutas PUT/PATCH
router.put('/:id', validateToken, upload.single('foto'), actualizarMobiliario);

// Rutas DELETE (dar de baja)
router.delete('/:id', validateToken, desactivarMobiliario);

export default router;
