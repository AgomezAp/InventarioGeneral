import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ActaMobiliario {
  id: number;
  numeroActa: string;
  nombreReceptor: string;
  cedulaReceptor?: string;
  cargoReceptor: string;
  telefonoReceptor?: string;
  correoReceptor?: string;
  firmaReceptor?: string;
  fechaEntrega: Date;
  fechaFirma?: Date;
  fechaDevolucionEsperada?: string;
  fechaDevolucionReal?: Date;
  estado: 'pendiente_firma' | 'activa' | 'devuelta_parcial' | 'devuelta_completa' | 'vencida' | 'rechazada' | 'cancelada';
  observacionesEntrega?: string;
  observacionesDevolucion?: string;
  Uid?: number;
  usuario?: {
    Uid: number;
    nombre: string;
    apellido: string;
  };
  detalles?: DetalleActaMobiliario[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DetalleActaMobiliario {
  id: number;
  actaMobiliarioId: number;
  mobiliarioId: number;
  cantidad: number;
  condicionEntrega: string;
  fotosEntrega?: string;
  observacionesEntrega?: string;
  cantidadDevuelta: number;
  fechaUltimaDevolucion?: Date;
  estadoDevolucion?: string;
  condicionDevolucion?: string;
  fotosDevolucion?: string;
  observacionesDevolucion?: string;
  mobiliario?: {
    id: number;
    nombre: string;
    categoria: string;
    descripcion?: string;
    unidadMedida: string;
    stockActual?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ActaMobiliarioService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  obtenerActas(estado?: string, busqueda?: string): Observable<ActaMobiliario[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    if (busqueda) params = params.set('busqueda', busqueda);
    return this.http.get<ActaMobiliario[]>(`${this.apiUrl}api/actas-mobiliario`, { params });
  }

  obtenerActaPorId(id: number): Observable<ActaMobiliario> {
    return this.http.get<ActaMobiliario>(`${this.apiUrl}api/actas-mobiliario/${id}`);
  }

  obtenerActasActivas(): Observable<ActaMobiliario[]> {
    return this.http.get<ActaMobiliario[]>(`${this.apiUrl}api/actas-mobiliario/activas`);
  }

  crearActa(formData: FormData): Observable<{ msg: string; acta: ActaMobiliario }> {
    return this.http.post<{ msg: string; acta: ActaMobiliario }>(
      `${this.apiUrl}api/actas-mobiliario`, formData
    );
  }

  registrarDevolucion(id: number, formData: FormData): Observable<{ msg: string; acta: ActaMobiliario }> {
    return this.http.post<{ msg: string; acta: ActaMobiliario }>(
      `${this.apiUrl}api/actas-mobiliario/${id}/devolucion`, formData
    );
  }

  cancelarActa(id: number): Observable<{ msg: string }> {
    return this.http.request<{ msg: string }>(
      'DELETE',
      `${this.apiUrl}api/actas-mobiliario/${id}`,
      { body: { Uid: localStorage.getItem('userId') } }
    );
  }

  eliminarActa(id: number): Observable<{ msg: string }> {
    return this.http.delete<{ msg: string }>(
      `${this.apiUrl}api/actas-mobiliario/${id}/eliminar`
    );
  }

  // Firma
  enviarSolicitudFirma(id: number): Observable<{ msg: string; correo: string }> {
    return this.http.post<{ msg: string; correo: string }>(
      `${this.apiUrl}api/firma-mobiliario/enviar/${id}`, {}
    );
  }

  reenviarCorreoFirma(id: number): Observable<{ msg: string }> {
    return this.http.post<{ msg: string }>(
      `${this.apiUrl}api/firma-mobiliario/reenviar/${id}`, {}
    );
  }

  obtenerEstadoFirma(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}api/firma-mobiliario/estado/${id}`);
  }

  // Publico (sin token)
  obtenerActaPorToken(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}api/firma-mobiliario/publica/${token}`);
  }

  firmarActa(token: string, firma: string): Observable<{ msg: string; fechaFirma: Date }> {
    return this.http.post<{ msg: string; fechaFirma: Date }>(
      `${this.apiUrl}api/firma-mobiliario/publica/${token}/firmar`, { firma }
    );
  }

  rechazarActa(token: string, motivo: string): Observable<{ msg: string }> {
    return this.http.post<{ msg: string }>(
      `${this.apiUrl}api/firma-mobiliario/publica/${token}/rechazar`, { motivo }
    );
  }

  obtenerHistorialMobiliario(mobiliarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}api/actas-mobiliario/historial/${mobiliarioId}`);
  }
}
