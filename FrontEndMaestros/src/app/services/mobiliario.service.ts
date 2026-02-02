import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  TipoInventario,
  Mobiliario,
  EstadisticasMobiliario,
  MovimientoMobiliario
} from '../interfaces/mobiliario-consumible';

// Interfaces para requests
export interface CrearMobiliarioRequest {
  nombre: string;
  categoria: string;
  descripcion?: string;
  unidadMedida?: string;
  stockActual?: number;
  ubicacionAlmacen?: string;
  proveedor?: string;
  precioUnitario?: number;
  observaciones?: string;
  Uid?: number;
}

export interface MovimientoStockRequest {
  cantidad: number;
  motivo?: string;
  descripcion?: string;
  numeroDocumento?: string;
  actaEntregaId?: number;
  Uid?: number;
}

export interface AjustarStockRequest {
  nuevoStock: number;
  motivo?: string;
  descripcion?: string;
  Uid?: number;
}

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
    categoria?: string;
    busqueda?: string;
    activo?: boolean;
  }): Observable<Mobiliario[]> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.categoria) params = params.set('categoria', filtros.categoria);
      if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
      if (filtros.activo !== undefined) params = params.set('activo', String(filtros.activo));
    }
    
    return this.http.get<Mobiliario[]>(`${this.apiUrl}api/mobiliario`, { params });
  }

  /**
   * Obtener mobiliario disponible (con stock > 0)
   */
  obtenerMobiliarioDisponible(): Observable<Mobiliario[]> {
    return this.http.get<Mobiliario[]>(`${this.apiUrl}api/mobiliario/disponibles`);
  }

  /**
   * Obtener un mobiliario por ID con historial
   */
  obtenerMobiliarioPorId(id: number): Observable<Mobiliario> {
    return this.http.get<Mobiliario>(`${this.apiUrl}api/mobiliario/${id}`);
  }

  /**
   * Registrar nuevo mobiliario (con FormData para foto)
   */
  registrarMobiliario(formData: FormData): Observable<{ msg: string; mobiliario: Mobiliario }> {
    return this.http.post<{ msg: string; mobiliario: Mobiliario }>(
      `${this.apiUrl}api/mobiliario`,
      formData
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
   * Actualizar mobiliario
   */
  actualizarMobiliario(id: number, mobiliario: Partial<CrearMobiliarioRequest>): Observable<{ msg: string; mobiliario: Mobiliario }> {
    return this.http.put<{ msg: string; mobiliario: Mobiliario }>(
      `${this.apiUrl}api/mobiliario/${id}`,
      mobiliario
    );
  }

  /**
   * Actualizar mobiliario con foto (FormData)
   */
  actualizarConFoto(id: number, formData: FormData): Observable<{ msg: string; mobiliario: Mobiliario }> {
    return this.http.put<{ msg: string; mobiliario: Mobiliario }>(
      `${this.apiUrl}api/mobiliario/${id}`,
      formData
    );
  }

  // ==================== OPERACIONES DE STOCK ====================

  /**
   * Agregar stock (entrada)
   */
  agregarStock(id: number, request: MovimientoStockRequest): Observable<{
    msg: string;
    mobiliario: Mobiliario;
    stockAnterior: number;
    stockNuevo: number;
  }> {
    return this.http.post<{
      msg: string;
      mobiliario: Mobiliario;
      stockAnterior: number;
      stockNuevo: number;
    }>(`${this.apiUrl}api/mobiliario/${id}/agregar-stock`, request);
  }

  /**
   * Retirar stock (salida)
   */
  retirarStock(id: number, request: MovimientoStockRequest): Observable<{
    msg: string;
    mobiliario: Mobiliario;
    stockAnterior: number;
    stockNuevo: number;
  }> {
    return this.http.post<{
      msg: string;
      mobiliario: Mobiliario;
      stockAnterior: number;
      stockNuevo: number;
    }>(`${this.apiUrl}api/mobiliario/${id}/retirar-stock`, request);
  }

  /**
   * Ajustar stock (corrección de inventario)
   */
  ajustarStock(id: number, request: AjustarStockRequest): Observable<{
    msg: string;
    mobiliario: Mobiliario;
    stockAnterior: number;
    stockNuevo: number;
  }> {
    return this.http.post<{
      msg: string;
      mobiliario: Mobiliario;
      stockAnterior: number;
      stockNuevo: number;
    }>(`${this.apiUrl}api/mobiliario/${id}/ajustar-stock`, request);
  }

  // ==================== ESTADÍSTICAS E HISTORIAL ====================

  /**
   * Desactivar/dar de baja mobiliario
   */
  desactivar(id: number, motivo: string, Uid: number): Observable<{ msg: string; mobiliario: Mobiliario }> {
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
   * Obtener historial de movimientos de un mobiliario
   */
  obtenerHistorial(id: number): Observable<MovimientoMobiliario[]> {
    return this.http.get<MovimientoMobiliario[]>(`${this.apiUrl}api/mobiliario/${id}/historial`);
  }
}
