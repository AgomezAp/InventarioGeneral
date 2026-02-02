import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  TipoInventario,
  Mobiliario,
  EstadisticasMobiliario,
  MobiliarioRequest,
  CrearMobiliarioRequest,
  CambiarEstadoMobiliarioRequest,
  MovimientoMobiliario
} from '../interfaces/mobiliario-consumible';

@Injectable({
  providedIn: 'root'
})
export class MobiliarioService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ==================== TIPOS DE INVENTARIO ====================

  /**
   * Obtener todos los tipos de inventario activos
   */
  obtenerTiposInventario(): Observable<TipoInventario[]> {
    return this.http.get<TipoInventario[]>(`${this.apiUrl}api/tipos-inventario`);
  }

  /**
   * Obtener tipo de inventario por código
   */
  obtenerTipoPorCodigo(codigo: string): Observable<TipoInventario> {
    return this.http.get<TipoInventario>(`${this.apiUrl}api/tipos-inventario/codigo/${codigo}`);
  }

  // ==================== MOBILIARIO ====================

  /**
   * Obtener todo el mobiliario con filtros opcionales
   */
  obtenerMobiliario(filtros?: {
    estado?: string;
    categoria?: string;
    ubicacion?: string;
    area?: string;
    busqueda?: string;
  }): Observable<Mobiliario[]> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.estado) params = params.set('estado', filtros.estado);
      if (filtros.categoria) params = params.set('categoria', filtros.categoria);
      if (filtros.ubicacion) params = params.set('ubicacion', filtros.ubicacion);
      if (filtros.area) params = params.set('area', filtros.area);
      if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
    }
    
    return this.http.get<Mobiliario[]>(`${this.apiUrl}api/mobiliario`, { params });
  }

  /**
   * Obtener mobiliario disponible para asignación
   */
  obtenerMobiliarioDisponible(): Observable<Mobiliario[]> {
    return this.http.get<Mobiliario[]>(`${this.apiUrl}api/mobiliario/disponibles`);
  }

  /**
   * Obtener un mueble por ID con historial
   */
  obtenerMobiliarioPorId(id: number): Observable<Mobiliario> {
    return this.http.get<Mobiliario>(`${this.apiUrl}api/mobiliario/${id}`);
  }

  /**
   * Registrar nuevo mueble
   */
  registrarMobiliario(mobiliario: FormData): Observable<{ msg: string; mobiliario: Mobiliario }> {
    return this.http.post<{ msg: string; mobiliario: Mobiliario }>(
      `${this.apiUrl}api/mobiliario`,
      mobiliario
    );
  }

  /**
   * Crear mobiliario sin foto
   */
  crear(mobiliario: CrearMobiliarioRequest): Observable<{ msg: string; mobiliario: Mobiliario }> {
    return this.http.post<{ msg: string; mobiliario: Mobiliario }>(
      `${this.apiUrl}api/mobiliario`,
      mobiliario
    );
  }

  /**
   * Crear mobiliario con foto (usando FormData)
   */
  crearConFoto(formData: FormData): Observable<{ msg: string; mobiliario: Mobiliario }> {
    return this.http.post<{ msg: string; mobiliario: Mobiliario }>(
      `${this.apiUrl}api/mobiliario`,
      formData
    );
  }

  /**
   * Actualizar mueble
   */
  actualizarMobiliario(id: number, mobiliario: Partial<MobiliarioRequest>): Observable<{ msg: string; mobiliario: Mobiliario }> {
    return this.http.put<{ msg: string; mobiliario: Mobiliario }>(
      `${this.apiUrl}api/mobiliario/${id}`,
      mobiliario
    );
  }

  /**
   * Cambiar estado del mueble
   */
  cambiarEstado(id: number, request: CambiarEstadoMobiliarioRequest): Observable<{ msg: string; mobiliario: Mobiliario }> {
    return this.http.patch<{ msg: string; mobiliario: Mobiliario }>(
      `${this.apiUrl}api/mobiliario/${id}/estado`,
      request
    );
  }

  /**
   * Dar de baja un mueble
   */
  darDeBaja(id: number, motivo: string, Uid: number): Observable<{ msg: string; mobiliario: Mobiliario }> {
    return this.http.delete<{ msg: string; mobiliario: Mobiliario }>(
      `${this.apiUrl}api/mobiliario/${id}`,
      { body: { motivo, Uid } }
    );
  }

  /**
   * Obtener estadísticas del mobiliario
   */
  obtenerEstadisticas(): Observable<EstadisticasMobiliario> {
    return this.http.get<EstadisticasMobiliario>(`${this.apiUrl}api/mobiliario/estadisticas`);
  }

  /**
   * Obtener historial de movimientos de un mueble
   */
  obtenerHistorial(id: number): Observable<MovimientoMobiliario[]> {
    return this.http.get<MovimientoMobiliario[]>(`${this.apiUrl}api/mobiliario/${id}/historial`);
  }
}
