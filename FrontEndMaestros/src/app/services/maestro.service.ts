import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../environments/environment.prod';
import {
  Maestro,
  MaestroEdicion,
} from '../interfaces/maestro';

@Injectable({
  providedIn: 'root',
})
export class MaestroService {
  private appUrl: string;
  private apiUrl: string;
  constructor(private http: HttpClient) {
    this.appUrl = environment.apiUrl;
    this.apiUrl = 'api/maestros';
  }

  getProduct(): Observable<Maestro[]> {
    return this.http.get<Maestro[]>(
      `${this.appUrl}${this.apiUrl}/obtener-maestros`
    );
  }

  registrarMaestro(maestro: Maestro): Observable<Maestro> {
    return this.http.post<Maestro>(
      `${this.appUrl}${this.apiUrl}/registrar-maestro`,
      maestro
    );
  }

  reactivarMaestro(Mid: number): Observable<Maestro> {
    return this.http.delete<Maestro>(
      `${this.appUrl}${this.apiUrl}/reactivar-maestro/${Mid}`
    );
  }

  actualizarMaestro(Mid: number, maestro: MaestroEdicion): Observable<Maestro> {
    return this.http.patch<Maestro>(
      `${this.appUrl}${this.apiUrl}/actualizar-maestro/${Mid}`,
      maestro
    );
  }
  BorrarMaestroId(Mid: number, maestro: Partial<Maestro>): Observable<Maestro> {
    return this.http.post<Maestro>(
      `${this.appUrl}${this.apiUrl}/borrar-maestro/${Mid}`,
      maestro
    );
  }

  ObtenerHistoricoMaestros(): Observable<Maestro[]> {
    return this.http.get<Maestro[]>(
      `${this.appUrl}${this.apiUrl}/obtenerRecordMaestros`
    );
  }

  ObtenerMaestrosActivos(): Observable<Maestro[]> {
    return this.http.get<Maestro[]>(`${this.appUrl}${this.apiUrl}/activos`);
  }
}
