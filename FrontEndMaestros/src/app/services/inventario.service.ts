import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  Dispositivo, 
  ActaEntrega, 
  MovimientoDispositivo, 
  EstadisticasInventario,
  CrearActaRequest,
  DevolucionRequest
} from '../interfaces/inventario';

@Injectable({
  providedIn: 'root'
})
export class InventarioService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ==================== DISPOSITIVOS ====================

  /**
   * Obtener todos los dispositivos con filtros opcionales
   */
  obtenerDispositivos(filtros?: {
    estado?: string;
    categoria?: string;
    ubicacion?: string;
    busqueda?: string;
  }): Observable<Dispositivo[]> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.estado) params = params.set('estado', filtros.estado);
      if (filtros.categoria) params = params.set('categoria', filtros.categoria);
      if (filtros.ubicacion) params = params.set('ubicacion', filtros.ubicacion);
      if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
    }
    
    return this.http.get<Dispositivo[]>(`${this.apiUrl}api/dispositivos`, { params });
  }

  /**
   * Obtener dispositivos disponibles para préstamo
   */
  obtenerDisponibles(): Observable<Dispositivo[]> {
    return this.http.get<Dispositivo[]>(`${this.apiUrl}api/dispositivos/disponibles`);
  }

  /**
   * Obtener un dispositivo por ID
   */
  obtenerDispositivoPorId(id: number): Observable<Dispositivo> {
    return this.http.get<Dispositivo>(`${this.apiUrl}api/dispositivos/${id}`);
  }

  /**
   * Registrar nuevo dispositivo
   */
  registrarDispositivo(dispositivo: FormData): Observable<{ msg: string; dispositivo: Dispositivo }> {
    return this.http.post<{ msg: string; dispositivo: Dispositivo }>(
      `${this.apiUrl}api/dispositivos`,
      dispositivo
    );
  }

  /**
   * Actualizar dispositivo
   */
  actualizarDispositivo(id: number, dispositivo: Partial<Dispositivo>): Observable<{ msg: string; dispositivo: Dispositivo }> {
    return this.http.put<{ msg: string; dispositivo: Dispositivo }>(
      `${this.apiUrl}api/dispositivos/${id}`,
      dispositivo
    );
  }

  /**
   * Cambiar estado del dispositivo
   */
  cambiarEstado(id: number, nuevoEstado: string, motivo: string): Observable<{ msg: string; dispositivo: Dispositivo }> {
    return this.http.patch<{ msg: string; dispositivo: Dispositivo }>(
      `${this.apiUrl}api/dispositivos/${id}/estado`,
      { nuevoEstado, motivo, Uid: localStorage.getItem('userId') }
    );
  }

  /**
   * Dar de baja un dispositivo
   */
  darDeBaja(id: number, nuevoEstado: string, motivo: string): Observable<{ msg: string; dispositivo: Dispositivo }> {
    return this.http.patch<{ msg: string; dispositivo: Dispositivo }>(
      `${this.apiUrl}api/dispositivos/${id}/baja`,
      { nuevoEstado, motivo, Uid: localStorage.getItem('userId') }
    );
  }

  /**
   * Eliminar un dispositivo del inventario
   */
  eliminarDispositivo(id: number, motivo?: string): Observable<{ msg: string; dispositivo: Dispositivo }> {
    return this.http.request<{ msg: string; dispositivo: Dispositivo }>(
      'DELETE',
      `${this.apiUrl}api/dispositivos/${id}`,
      { body: { motivo, Uid: localStorage.getItem('userId') } }
    );
  }

  /**
   * Agregar stock a un dispositivo
   */
  agregarStock(id: number, cantidad: number): Observable<{ msg: string; dispositivo: Dispositivo; stockActual: number }> {
    return this.http.post<{ msg: string; dispositivo: Dispositivo; stockActual: number }>(
      `${this.apiUrl}api/dispositivos/${id}/agregar-stock`,
      { cantidad, Uid: localStorage.getItem('userId') }
    );
  }

  /**
   * Retirar stock de un dispositivo
   */
  retirarStock(id: number, cantidad: number, motivo: string): Observable<{ msg: string; dispositivo: Dispositivo; stockActual: number }> {
    return this.http.post<{ msg: string; dispositivo: Dispositivo; stockActual: number }>(
      `${this.apiUrl}api/dispositivos/${id}/retirar-stock`,
      { cantidad, motivo, Uid: localStorage.getItem('userId') }
    );
  }

  /**
   * Obtener estadísticas del inventario
   */
  obtenerEstadisticas(): Observable<EstadisticasInventario> {
    return this.http.get<EstadisticasInventario>(`${this.apiUrl}api/dispositivos/estadisticas`);
  }

  /**
   * Obtener trazabilidad/historial de un dispositivo
   */
  obtenerTrazabilidad(id: number): Observable<MovimientoDispositivo[]> {
    return this.http.get<MovimientoDispositivo[]>(`${this.apiUrl}api/dispositivos/${id}/trazabilidad`);
  }

  // ==================== ACTAS DE ENTREGA ====================

  /**
   * Obtener todas las actas
   */
  obtenerActas(filtros?: {
    estado?: string;
    busqueda?: string;
    fechaInicio?: string;
    fechaFin?: string;
  }): Observable<ActaEntrega[]> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.estado) params = params.set('estado', filtros.estado);
      if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
      if (filtros.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
    }
    
    return this.http.get<ActaEntrega[]>(`${this.apiUrl}api/actas`, { params });
  }

  /**
   * Obtener actas activas (préstamos pendientes)
   */
  obtenerActasActivas(): Observable<ActaEntrega[]> {
    return this.http.get<ActaEntrega[]>(`${this.apiUrl}api/actas/activas`);
  }

  /**
   * Obtener un acta por ID
   */
  obtenerActaPorId(id: number): Observable<ActaEntrega> {
    return this.http.get<ActaEntrega>(`${this.apiUrl}api/actas/${id}`);
  }

  /**
   * Crear nueva acta de entrega
   */
  crearActaEntrega(formData: FormData): Observable<{ msg: string; acta: ActaEntrega }> {
    return this.http.post<{ msg: string; acta: ActaEntrega }>(
      `${this.apiUrl}api/actas`,
      formData
    );
  }

  /**
   * Registrar devolución de dispositivos
   */
  registrarDevolucion(actaId: number, formData: FormData): Observable<{ msg: string; acta: ActaEntrega }> {
    return this.http.post<{ msg: string; acta: ActaEntrega }>(
      `${this.apiUrl}api/actas/${actaId}/devolucion`,
      formData
    );
  }

  /**
   * Obtener historial de entregas de un dispositivo
   */
  obtenerHistorialDispositivo(dispositivoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}api/actas/historial/${dispositivoId}`);
  }

  /**
   * Cancelar acta pendiente de firma
   */
  cancelarActa(id: number): Observable<{ msg: string }> {
    return this.http.request<{ msg: string }>(
      'DELETE',
      `${this.apiUrl}api/actas/${id}`,
      { body: { Uid: localStorage.getItem('userId') } }
    );
  }
}
