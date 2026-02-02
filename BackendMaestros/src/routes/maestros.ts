import { Router } from 'express';

import {
  actualizarMaestro,
  borrarMaestrosPorId,
  generarReporte,
  generarReporteMensual,
  maestrosActivos,
  ObtenerMaestros,
  obtenerTodosLosMaestros,
  reactivarMaestro,
  registrarMaestro,
} from '../controllers/maestros.js';
import validateToken from './validateToken.js';

const router = Router();

router.post( "/api/maestros/registrar-maestro",validateToken,registrarMaestro);
router.get("/api/maestros/obtener-maestros",validateToken,ObtenerMaestros);
router.post("/api/maestros/borrar-maestro/:Mid",validateToken,borrarMaestrosPorId);
router.patch("/api/maestros/actualizar-maestro/:Mid",validateToken,actualizarMaestro);
router.post('/api/maestros/reporte',validateToken ,generarReporte);
router.delete('/api/maestros/reactivar-maestro/:Mid',validateToken ,reactivarMaestro);
router.get('/api/maestros/reporte-mensual', validateToken,generarReporteMensual);
router.get('/api/maestros/obtenerRecordMaestros',validateToken ,obtenerTodosLosMaestros);
router.get('/api/maestros/activos',validateToken, maestrosActivos);
export default router;
