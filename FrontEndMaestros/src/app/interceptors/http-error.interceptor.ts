import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpInterceptorFn,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { Observable, throwError, timer, BehaviorSubject, Subject } from 'rxjs';
import { catchError, retry, tap, finalize, switchMap, filter, take } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

export interface HttpError {
  status: number;
  message: string;
  timestamp: Date;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HttpErrorInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  
  // Subject para emitir errores globales
  private errorSubject = new Subject<HttpError>();
  public errors$ = this.errorSubject.asObservable();

  // Configuración de retry
  private readonly maxRetries = 2;
  private readonly retryDelay = 1000;
  private readonly retryableStatuses = [408, 500, 502, 503, 504];

  constructor(private toastr: ToastrService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = Date.now();

    // Agregar headers de autorización si existe token
    request = this.addAuthHeader(request);

    return next.handle(request).pipe(
      // Log de respuestas exitosas
      tap(event => {
        if (event instanceof HttpResponse) {
          const duration = Date.now() - startTime;
          console.log(`✅ ${request.method} ${request.url} - ${event.status} (${duration}ms)`);
        }
      }),

      // Retry automático SOLO para peticiones GET con errores recuperables
      retry({
        count: this.maxRetries,
        delay: (error, retryCount) => {
          // NUNCA reintentar POST, PUT, PATCH, DELETE
          if (request.method !== 'GET') {
            return throwError(() => error);
          }
          if (this.shouldRetry(error)) {
            console.log(`🔄 Reintentando ${request.url} (${retryCount}/${this.maxRetries})`);
            return timer(this.retryDelay * retryCount);
          }
          return throwError(() => error);
        }
      }),

      // Manejo centralizado de errores
      catchError((error: HttpErrorResponse) => {
        return this.handleError(error, request);
      }),

      // Log final
      finalize(() => {
        const duration = Date.now() - startTime;
        if (duration > 5000) {
          console.warn(`⚠️ Solicitud lenta: ${request.url} (${duration}ms)`);
        }
      })
    );
  }

  /**
   * Agregar header de autorización
   */
  private addAuthHeader(request: HttpRequest<any>): HttpRequest<any> {
    const token = localStorage.getItem('token');
    
    if (token && !request.headers.has('Authorization')) {
      return request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return request;
  }

  /**
   * Determinar si el error es retryable
   */
  private shouldRetry(error: HttpErrorResponse): boolean {
    // No reintentar errores de autenticación/autorización
    if (error.status === 401 || error.status === 403) {
      return false;
    }
    
    // No reintentar errores de validación
    if (error.status === 400 || error.status === 422) {
      return false;
    }

    // NUNCA reintentar peticiones que modifican datos (POST, PUT, PATCH, DELETE)
    // Solo reintentar GET para evitar duplicar operaciones de escritura
    const method = (error as any)?.url ? 'UNKNOWN' : 'UNKNOWN';
    // No podemos acceder al method desde el error, así que solo reintentamos 502/503/504 (errores de gateway)
    // NO reintentar 500 ya que indica error de lógica del servidor y reintentar causa datos duplicados
    if (error.status === 500) {
      return false;
    }
    
    // Reintentar solo errores de gateway/timeout (no errores internos del servidor)
    const safeRetryStatuses = [408, 502, 503, 504];
    return safeRetryStatuses.includes(error.status) || error.status === 0;
  }

  /**
   * Manejar errores HTTP
   */
  private handleError(error: HttpErrorResponse, request: HttpRequest<any>): Observable<never> {
    const httpError: HttpError = {
      status: error.status,
      message: this.getErrorMessage(error),
      timestamp: new Date(),
      url: request.url
    };

    // Emitir error para listeners globales
    this.errorSubject.next(httpError);

    // Log del error
    console.error(`❌ ${request.method} ${request.url} - ${error.status}`, error);

    // Mostrar notificación según el tipo de error
    this.showErrorNotification(httpError);

    // Manejar casos especiales
    if (error.status === 401) {
      this.handle401Error(request);
    }

    return throwError(() => error);
  }

  /**
   * Obtener mensaje de error legible
   */
  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'No se pudo conectar al servidor. Verifique su conexión a internet.';
    }

    // Si el servidor envía un mensaje de error
    if (error.error?.msg) {
      return error.error.msg;
    }
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.error?.error) {
      return error.error.error;
    }

    // Mensajes por defecto según el código de estado
    const errorMessages: { [key: number]: string } = {
      400: 'Solicitud incorrecta. Verifique los datos ingresados.',
      401: 'Sesión expirada. Por favor, inicie sesión nuevamente.',
      403: 'No tiene permisos para realizar esta acción.',
      404: 'El recurso solicitado no fue encontrado.',
      408: 'La solicitud tardó demasiado. Intente nuevamente.',
      409: 'Conflicto con el estado actual del recurso.',
      422: 'Los datos proporcionados no son válidos.',
      429: 'Demasiadas solicitudes. Espere un momento e intente nuevamente.',
      500: 'Error interno del servidor. Intente más tarde.',
      502: 'El servidor no está disponible temporalmente.',
      503: 'Servicio no disponible. Intente más tarde.',
      504: 'Tiempo de espera agotado. Intente nuevamente.'
    };

    return errorMessages[error.status] || `Error ${error.status}: ${error.statusText}`;
  }

  /**
   * Mostrar notificación de error
   */
  private showErrorNotification(error: HttpError): void {
    // No mostrar notificaciones para ciertos errores
    const silentErrors = [401]; // El 401 se maneja con redirección
    
    if (silentErrors.includes(error.status)) {
      return;
    }

    // Usar diferentes tipos de toast según la severidad
    if (error.status >= 500 || error.status === 0) {
      this.toastr.error(error.message, 'Error del servidor', {
        timeOut: 5000,
        progressBar: true
      });
    } else if (error.status === 429) {
      this.toastr.warning(error.message, 'Límite excedido', {
        timeOut: 3000,
        progressBar: true
      });
    } else {
      this.toastr.error(error.message, 'Error', {
        timeOut: 4000,
        progressBar: true
      });
    }
  }

  /**
   * Manejar error 401 (no autorizado)
   */
  private handle401Error(request: HttpRequest<any>): void {
    // Limpiar token y redirigir al login
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    
    // Evitar redirigir si ya está en la página de login
    if (!window.location.pathname.includes('/login')) {
      this.toastr.warning('Su sesión ha expirado. Por favor, inicie sesión nuevamente.', 'Sesión expirada');
      window.location.href = '/login';
    }
  }
}

/**
 * Functional interceptor para usar con withInterceptors() en Angular 19+
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);
  const startTime = Date.now();
  
  // Agregar header de autorización si existe token
  const token = localStorage.getItem('token');
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        const duration = Date.now() - startTime;
        console.log(`✅ ${req.method} ${req.url} - ${event.status} (${duration}ms)`);
      }
    }),
    retry({
      count: 2,
      delay: (error, retryCount) => {
        const retryableStatuses = [408, 500, 502, 503, 504];
        if (error instanceof HttpErrorResponse && retryableStatuses.includes(error.status)) {
          console.log(`🔄 Reintentando ${req.url} (${retryCount}/2)`);
          return timer(1000 * retryCount);
        }
        return throwError(() => error);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      console.error(`❌ ${req.method} ${req.url} - Error ${error.status}:`, error.message);
      
      // Manejar error 401
      if (error.status === 401 && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        toastr.warning('Su sesión ha expirado. Por favor, inicie sesión nuevamente.', 'Sesión expirada');
        window.location.href = '/login';
      } else if (error.status === 0) {
        toastr.error('No se puede conectar al servidor. Verifique su conexión a internet.', 'Error de conexión');
      } else if (error.status === 403) {
        toastr.error('No tiene permisos para realizar esta acción.', 'Acceso denegado');
      } else if (error.status === 404) {
        toastr.error('El recurso solicitado no fue encontrado.', 'No encontrado');
      } else if (error.status >= 500) {
        toastr.error('Error interno del servidor. Intente más tarde.', 'Error del servidor');
      }
      
      return throwError(() => error);
    })
  );
};
