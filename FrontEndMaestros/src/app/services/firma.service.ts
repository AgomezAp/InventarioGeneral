import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EstadoFirma {
  tieneTokenPendiente: boolean;
  firmado: boolean;
  rechazado: boolean;
  tokenActivo: {
    fechaEnvio: Date;
    correo: string;
  } | null;
  fechaFirma?: Date;
  motivoRechazo?: string;
  historial: {
    estado: string;
    fechaEnvio: Date;
    fechaFirma?: Date;
    correo: string;
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class FirmaService {
  private apiUrl: string;

  constructor(private http: HttpClient) {
    this.apiUrl = environment.apiUrl;
  }

  /**
   * Enviar solicitud de firma por correo
   */
  enviarSolicitudFirma(actaId: number, correoNotificacion?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}api/firma/enviar/${actaId}`, {
      correoNotificacion
    });
  }

  /**
   * Reenviar correo de firma
   */
  reenviarCorreoFirma(actaId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}api/firma/reenviar/${actaId}`, {});
  }

  /**
   * Obtener estado de firma de un acta
   */
  obtenerEstadoFirma(actaId: number): Observable<EstadoFirma> {
    return this.http.get<EstadoFirma>(`${this.apiUrl}api/firma/estado/${actaId}`);
  }
}
