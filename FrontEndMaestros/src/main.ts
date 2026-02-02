import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  BrowserAnimationsModule,
  provideAnimations,
} from '@angular/platform-browser/animations';


import { provideToastr } from 'ngx-toastr';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { tokenInterceptor } from './app/utils/token.interceptor';

bootstrapApplication(AppComponent, {
  ...appConfig, 
  providers: [
    ...appConfig.providers, 
    provideAnimations(), 
    BrowserAnimationsModule,
    FontAwesomeModule,
    provideHttpClient(),  
    provideHttpClient(withInterceptors([tokenInterceptor])),   // Agrega el proveedor de animaciones
    provideToastr({
      timeOut: 1200,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
    }),          // Agrega el proveedor de Toastr
  ]
})
  .catch((err) => console.error(err));
