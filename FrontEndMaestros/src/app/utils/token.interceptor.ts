import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import {
  catchError,
  throwError,
} from 'rxjs';

import { ErrorsService } from '../services/errors.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ErrorsService); 
  const router = inject(Router); 

  const token = localStorage.getItem('token'); 
  const clonedRequest = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(clonedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        errorService.messageError(error); 
        router.navigate(['/logIn']); // Redirige al login
      }
      return throwError(() => error);
    })
  );
};
