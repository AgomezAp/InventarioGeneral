import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ActaConsumible {
  id: number;
  numeroActa: string;
  tipoInventarioId: number;
  nombreReceptor: string;
  cedulaReceptor?: string;
  cargoReceptor: string;
  areaReceptor?: string;
  correoReceptor?: string;
  firmaReceptor?: string;
  fechaEntrega: Date;
  fechaFirma?: Date;
  estado: 'pendiente_firma' | 'firmada' | 'rechazada';
  observaciones?: string;
  motivoRechazo?: string;
  Uid?: number;
  tipoInventario?: {
    id: number;
    nombre: string;
    codigo: string;
  };
  creador?: {
    Uid: number;
    nombre: string;
    apellido: string;
  };
  detalles?: DetalleActaConsumible[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DetalleActaConsumible {
  id: number;
  actaConsumibleId: number;
  consumibleId: number;
  cantidad: number;
  unidadMedida: string;
  observaciones?: string;
  consumible?: {
    id: number;
    nombre: string;
    categoria?: string;
    unidadMedida: string;
    descripcion?: string;
  };
}

export interface CrearActaConsumibleRequest {
  tipoInventarioCodigo: 'aseo' | 'papeleria';
  nombreReceptor: string;
  cedulaReceptor?: string;
  cargoReceptor: string;
  areaReceptor?: string;
  correoReceptor: string;
  observaciones?: string;
  articulos: {
    consumibleId: number;
    cantidad: number;
    observaciones?: string;
  }[];
  Uid?: number;
}

export interface EstadisticasActas {
  total: number;
  pendientes: number;
  firmadas: number;
  rechazadas: number;
}

@Injectable({
  providedIn: 'root'
})
export class ActaConsumibleService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtener todas las actas de consumibles
   */
  obtenerActas(tipoInventarioCodigo?: string, estado?: string): Observable<ActaConsumible[]> {
    let params = new HttpParams();
    if (tipoInventarioCodigo) params = params.set('tipoInventarioCodigo', tipoInventarioCodigo);
    if (estado) params = params.set('estado', estado);
    
    return this.http.get<ActaConsumible[]>(`${this.apiUrl}api/actas-consumibles`, { params });
  }

  /**
   * Obtener actas por tipo (aseo o papeleria)
   */
  obtenerActasPorTipo(codigo: 'aseo' | 'papeleria', estado?: string): Observable<ActaConsumible[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    
    return this.http.get<ActaConsumible[]>(`${this.apiUrl}api/actas-consumibles/tipo/${codigo}`, { params });
  }

  /**
   * Obtener un acta por ID
   */
  obtenerActaPorId(id: number): Observable<ActaConsumible> {
    return this.http.get<ActaConsumible>(`${this.apiUrl}api/actas-consumibles/${id}`);
  }

  /**
   * Crear nueva acta de consumibles
   */
  crearActa(request: CrearActaConsumibleRequest): Observable<{ msg: string; acta: ActaConsumible; token: string }> {
    return this.http.post<{ msg: string; acta: ActaConsumible; token: string }>(
      `${this.apiUrl}api/actas-consumibles`,
      request
    );
  }

  /**
   * Obtener acta por token (para firma)
   */
  obtenerActaPorToken(token: string): Observable<ActaConsumible> {
    return this.http.get<ActaConsumible>(`${this.apiUrl}api/actas-consumibles/firma/${token}`);
  }

  /**
   * Firmar acta
   */
  firmarActa(token: string, firma: string, cedulaReceptor?: string): Observable<{ msg: string; acta: ActaConsumible }> {
    return this.http.post<{ msg: string; acta: ActaConsumible }>(
      `${this.apiUrl}api/actas-consumibles/firma/${token}`,
      { firma, cedulaReceptor }
    );
  }

  /**
   * Rechazar acta
   */
  rechazarActa(token: string, motivoRechazo: string): Observable<{ msg: string; acta: ActaConsumible }> {
    return this.http.post<{ msg: string; acta: ActaConsumible }>(
      `${this.apiUrl}api/actas-consumibles/rechazar/${token}`,
      { motivoRechazo }
    );
  }

  /**
   * Reenviar correo de firma
   */
  reenviarCorreo(id: number): Observable<{ msg: string }> {
    return this.http.post<{ msg: string }>(
      `${this.apiUrl}api/actas-consumibles/${id}/reenviar`,
      {}
    );
  }

  /**
   * Obtener estadísticas
   */
  obtenerEstadisticas(tipoInventarioCodigo?: string): Observable<EstadisticasActas> {
    let params = new HttpParams();
    if (tipoInventarioCodigo) params = params.set('tipoInventarioCodigo', tipoInventarioCodigo);
    
    return this.http.get<EstadisticasActas>(`${this.apiUrl}api/actas-consumibles/estadisticas`, { params });
  }
}
