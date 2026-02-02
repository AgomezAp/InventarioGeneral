import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Consumible,
  EstadisticasConsumibles,
  ConsumibleRequest,
  CrearConsumibleRequest,
  StockRequest,
  AjusteStockRequest,
  MovimientoConsumible
} from '../interfaces/mobiliario-consumible';

@Injectable({
  providedIn: 'root'
})
export class ConsumibleService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ==================== CONSUMIBLES ====================

  /**
   * Obtener todos los consumibles con filtros opcionales
   */
  obtenerConsumibles(filtros?: {
    tipoInventarioId?: number;
    categoria?: string;
    stockBajo?: boolean;
    busqueda?: string;
    activo?: boolean;
  }): Observable<Consumible[]> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.tipoInventarioId) params = params.set('tipoInventarioId', filtros.tipoInventarioId.toString());
      if (filtros.categoria) params = params.set('categoria', filtros.categoria);
      if (filtros.stockBajo !== undefined) params = params.set('stockBajo', filtros.stockBajo.toString());
      if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
      if (filtros.activo !== undefined) params = params.set('activo', filtros.activo.toString());
    }
    
    return this.http.get<Consumible[]>(`${this.apiUrl}api/consumibles`, { params });
  }

  /**
   * Obtener consumibles por tipo de inventario (aseo o papeleria)
   */
  obtenerConsumiblesPorTipo(codigo: 'aseo' | 'papeleria', filtros?: {
    categoria?: string;
    stockBajo?: boolean;
    busqueda?: string;
  }): Observable<Consumible[]> {
    let params = new HttpParams();
    
    if (filtros) {
      if (filtros.categoria) params = params.set('categoria', filtros.categoria);
      if (filtros.stockBajo !== undefined) params = params.set('stockBajo', filtros.stockBajo.toString());
      if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
    }
    
    return this.http.get<Consumible[]>(`${this.apiUrl}api/consumibles/tipo/${codigo}`, { params });
  }

  /**
   * Obtener consumibles disponibles (con stock > 0)
   */
  obtenerConsumiblesDisponibles(tipoInventarioId?: number): Observable<Consumible[]> {
    let params = new HttpParams();
    if (tipoInventarioId) {
      params = params.set('tipoInventarioId', tipoInventarioId.toString());
    }
    return this.http.get<Consumible[]>(`${this.apiUrl}api/consumibles/disponibles`, { params });
  }

  /**
   * Obtener un consumible por ID con historial
   */
  obtenerConsumiblePorId(id: number): Observable<Consumible> {
    return this.http.get<Consumible>(`${this.apiUrl}api/consumibles/${id}`);
  }

  /**
   * Registrar nuevo consumible
   */
  registrarConsumible(consumible: FormData): Observable<{ msg: string; consumible: Consumible }> {
    return this.http.post<{ msg: string; consumible: Consumible }>(
      `${this.apiUrl}api/consumibles`,
      consumible
    );
  }

  /**
   * Crear consumible (sin foto, usando objeto JSON)
   */
  crear(consumible: CrearConsumibleRequest): Observable<{ msg: string; consumible: Consumible }> {
    return this.http.post<{ msg: string; consumible: Consumible }>(
      `${this.apiUrl}api/consumibles`,
      consumible
    );
  }

  /**
   * Actualizar consumible (datos básicos, no stock)
   */
  actualizarConsumible(id: number, consumible: Partial<ConsumibleRequest>): Observable<{ msg: string; consumible: Consumible }> {
    return this.http.put<{ msg: string; consumible: Consumible }>(
      `${this.apiUrl}api/consumibles/${id}`,
      consumible
    );
  }

  /**
   * Agregar stock (entrada de inventario)
   */
  agregarStock(id: number, request: StockRequest): Observable<{ msg: string; consumible: Consumible; stockAnterior: number; stockNuevo: number }> {
    return this.http.patch<{ msg: string; consumible: Consumible; stockAnterior: number; stockNuevo: number }>(
      `${this.apiUrl}api/consumibles/${id}/agregar-stock`,
      request
    );
  }

  /**
   * Retirar stock (salida de inventario)
   */
  retirarStock(id: number, request: StockRequest): Observable<{ msg: string; consumible: Consumible; stockAnterior: number; stockNuevo: number; alertaStockBajo: boolean }> {
    return this.http.patch<{ msg: string; consumible: Consumible; stockAnterior: number; stockNuevo: number; alertaStockBajo: boolean }>(
      `${this.apiUrl}api/consumibles/${id}/retirar-stock`,
      request
    );
  }

  /**
   * Ajustar stock (corrección de inventario)
   */
  ajustarStock(id: number, request: AjusteStockRequest): Observable<{ msg: string; consumible: Consumible; stockAnterior: number; stockNuevo: number }> {
    return this.http.patch<{ msg: string; consumible: Consumible; stockAnterior: number; stockNuevo: number }>(
      `${this.apiUrl}api/consumibles/${id}/ajustar-stock`,
      request
    );
  }

  /**
   * Obtener alertas de stock bajo
   */
  obtenerAlertasStock(tipoInventarioId?: number): Observable<Consumible[]> {
    let params = new HttpParams();
    if (tipoInventarioId) {
      params = params.set('tipoInventarioId', tipoInventarioId.toString());
    }
    return this.http.get<Consumible[]>(`${this.apiUrl}api/consumibles/alertas`, { params });
  }

  /**
   * Obtener estadísticas de consumibles
   */
  obtenerEstadisticas(tipoInventarioId?: number): Observable<EstadisticasConsumibles> {
    let params = new HttpParams();
    if (tipoInventarioId) {
      params = params.set('tipoInventarioId', tipoInventarioId.toString());
    }
    return this.http.get<EstadisticasConsumibles>(`${this.apiUrl}api/consumibles/estadisticas`, { params });
  }

  /**
   * Desactivar consumible
   */
  desactivarConsumible(id: number, motivo: string, Uid: number): Observable<{ msg: string; consumible: Consumible }> {
    return this.http.delete<{ msg: string; consumible: Consumible }>(
      `${this.apiUrl}api/consumibles/${id}`,
      { body: { motivo, Uid } }
    );
  }

  /**
   * Obtener historial de movimientos de un consumible
   */
  obtenerHistorial(id: number, limit?: number): Observable<MovimientoConsumible[]> {
    let params = new HttpParams();
    if (limit) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get<MovimientoConsumible[]>(`${this.apiUrl}api/consumibles/${id}/historial`, { params });
  }
}
