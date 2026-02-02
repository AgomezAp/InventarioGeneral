import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { environment } from '../../environments/environment.prod';
import { User } from '../interfaces/user';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private appUrl: string;
  private apiUrl: string;
  constructor(private http: HttpClient) {
    this.appUrl = environment.apiUrl;
    this.apiUrl = 'api/user';
  }
  signIn(user: User): Observable<any> {
    return this.http.post(`${this.appUrl}${this.apiUrl}/register`, user);
  }
  logIn(user: User): Observable<string> {
    return this.http.post<string>(`${this.appUrl}${this.apiUrl}/login`, user);
  }
  resetPassword(data: {
    correo: string;
    nuevaContrasena: string;
  }): Observable<string> {
    return this.http.patch<string>(
      `${this.appUrl}${this.apiUrl}/reestablecer-contrasena`,
      data
    );
  }
  obtenerMaestrosPorIdUsuario(Uid: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.appUrl}${this.apiUrl}/${Uid}/maestros`);
  }
}
