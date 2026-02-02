import { Router } from 'express';
import {
  obtenerConsumibles,
  obtenerConsumiblesPorTipo,
  obtenerConsumiblePorId,
  registrarConsumible,
  actualizarConsumible,
  agregarStock,
  retirarStock,
  ajustarStock,
  obtenerAlertasStock,
  obtenerEstadisticasConsumibles,
  desactivarConsumible,
  obtenerHistorialConsumible,
  obtenerConsumiblesDisponibles
} from '../controllers/consumible.js';
import validateToken from './validateToken.js';
import { upload } from '../config/multer.js';

const router = Router();

// Rutas GET
router.get('/', validateToken, obtenerConsumibles);
router.get('/disponibles', validateToken, obtenerConsumiblesDisponibles);
router.get('/alertas', validateToken, obtenerAlertasStock);
router.get('/estadisticas', validateToken, obtenerEstadisticasConsumibles);
router.get('/tipo/:codigo', validateToken, obtenerConsumiblesPorTipo); // /tipo/aseo o /tipo/papeleria
router.get('/:id', validateToken, obtenerConsumiblePorId);
router.get('/:id/historial', validateToken, obtenerHistorialConsumible);

// Rutas POST
router.post('/', validateToken, upload.single('foto'), registrarConsumible);

// Rutas PUT/PATCH
router.put('/:id', validateToken, actualizarConsumible);
router.patch('/:id/agregar-stock', validateToken, agregarStock);
router.patch('/:id/retirar-stock', validateToken, retirarStock);
router.patch('/:id/ajustar-stock', validateToken, ajustarStock);

// Rutas DELETE (desactivar)
router.delete('/:id', validateToken, desactivarConsumible);

export default router;
