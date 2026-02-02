import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DispositivoEntregado {
  id: number;
  nombre: string;
  categoria: string;
  marca: string;
  modelo: string;
  serial: string;
  imei?: string;
  descripcion?: string;
  condicion: string;
}

export interface DetalleDevolucion {
  id?: number;
  dispositivoId: number;
  dispositivo?: DispositivoEntregado;
  estadoDevolucion: 'disponible' | 'dañado' | 'perdido';
  condicionDevolucion: string;
  observaciones?: string;
}

export interface ActaDevolucion {
  id?: number;
  numeroActa: string;
  nombreReceptor: string;
  cargoReceptor: string;
  correoReceptor: string;
  nombreEntrega: string;
  cargoEntrega: string;
  correoEntrega?: string;
  fechaDevolucion: Date;
  estado: 'pendiente_firma' | 'completada' | 'rechazada';
  observaciones?: string;
  detalles?: DetalleDevolucion[];
}

@Injectable({
  providedIn: 'root'
})
export class DevolucionService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtener dispositivos entregados (disponibles para devolución)
   */
  obtenerDispositivosEntregados(): Observable<DispositivoEntregado[]> {
    return this.http.get<DispositivoEntregado[]>(`${this.apiUrl}api/actas-devolucion/dispositivos-entregados`);
  }

  /**
   * Obtener todas las actas de devolución
   */
  obtenerActasDevolucion(filtros?: { estado?: string; busqueda?: string }): Observable<ActaDevolucion[]> {
    let params = new HttpParams();
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    if (filtros?.busqueda) params = params.set('busqueda', filtros.busqueda);
    
    return this.http.get<ActaDevolucion[]>(`${this.apiUrl}api/actas-devolucion`, { params });
  }

  /**
   * Obtener acta de devolución por ID
   */
  obtenerActaDevolucionPorId(id: number): Observable<ActaDevolucion> {
    return this.http.get<ActaDevolucion>(`${this.apiUrl}api/actas-devolucion/${id}`);
  }

  /**
   * Crear nueva acta de devolución
   */
  crearActaDevolucion(formData: FormData): Observable<{ msg: string; acta: ActaDevolucion }> {
    return this.http.post<{ msg: string; acta: ActaDevolucion }>(`${this.apiUrl}api/actas-devolucion`, formData);
  }

  /**
   * Enviar solicitud de firma por correo
   */
  enviarSolicitudFirma(actaId: number): Observable<{ msg: string; correo: string }> {
    return this.http.post<{ msg: string; correo: string }>(`${this.apiUrl}api/actas-devolucion/enviar-firma/${actaId}`, {});
  }

  /**
   * Reenviar correo de firma
   */
  reenviarCorreoDevolucion(actaId: number): Observable<{ msg: string; correo: string }> {
    return this.http.post<{ msg: string; correo: string }>(`${this.apiUrl}api/actas-devolucion/reenviar-firma/${actaId}`, {});
  }

  // ==========================================
  // Métodos públicos (sin autenticación)
  // ==========================================

  /**
   * Obtener datos del acta por token (público)
   */
  obtenerActaPublica(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}api/actas-devolucion/publica/${token}`);
  }

  /**
   * Firmar acta con token (público)
   */
  firmarActa(token: string, firma: string): Observable<any> {
    return this.http.post(`${this.apiUrl}api/actas-devolucion/publica/${token}/firmar`, { firma });
  }

  /**
   * Rechazar acta con token (público)
   */
  rechazarActa(token: string, motivo?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}api/actas-devolucion/publica/${token}/rechazar`, { motivo });
  }
}
