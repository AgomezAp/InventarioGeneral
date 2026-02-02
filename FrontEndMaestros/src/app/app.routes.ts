import { Routes } from '@angular/router';

import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { InventarioComponent } from './components/inventario/inventario.component';
import { AgregarDispositivoComponent } from './components/agregar-dispositivo/agregar-dispositivo.component';
import { CrearActaComponent } from './components/crear-acta/crear-acta.component';
import { ActasComponent } from './components/actas/actas.component';
import { TrazabilidadComponent } from './components/trazabilidad/trazabilidad.component';
import { DetalleDispositivoComponent } from './components/detalle-dispositivo/detalle-dispositivo.component';
import { ActaDevolucionComponent } from './components/acta-devolucion/acta-devolucion.component';
import { FirmaExternaComponent } from './components/firma-externa/firma-externa.component';
// Componentes de Devolución (proceso separado)
import { CrearDevolucionComponent } from './components/crear-devolucion/crear-devolucion.component';
import { ActasDevolucionComponent } from './components/actas-devolucion/actas-devolucion.component';
import { FirmaDevolucionComponent } from './components/firma-devolucion/firma-devolucion.component';
// Componentes de Mobiliario
import { InventarioMobiliarioComponent } from './components/inventario-mobiliario/inventario-mobiliario.component';
import { AgregarMobiliarioComponent } from './components/agregar-mobiliario/agregar-mobiliario.component';
// Componentes de Consumibles (Aseo y Papelería)
import { InventarioConsumiblesComponent } from './components/inventario-consumibles/inventario-consumibles.component';
import { AgregarConsumibleComponent } from './components/agregar-consumible/agregar-consumible.component';
// Componentes de Actas de Consumibles
import { CrearActaConsumibleComponent } from './components/crear-acta-consumible/crear-acta-consumible.component';
import { ActasConsumiblesComponent } from './components/actas-consumibles/actas-consumibles.component';
import { FirmaConsumibleComponent } from './components/firma-consumible/firma-consumible.component';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
  },
  {
    path: 'logIn',
    component: LoginComponent,
  },
  {
    path: 'signup',
    component: RegisterComponent,
  },
  {
    path: 'reestablecerContraseña',
    component: ResetPasswordComponent,
  },
  // ==================== TECNOLOGÍA ====================
  {
    path: 'inventario',
    component: InventarioComponent,
  },
  {
    path: 'agregar-dispositivo',
    component: AgregarDispositivoComponent,
  },
  {
    path: 'crear-acta',
    component: CrearActaComponent,
  },
  {
    path: 'actas',
    component: ActasComponent,
  },
  {
    path: 'trazabilidad/:id',
    component: TrazabilidadComponent,
  },
  {
    path: 'dispositivo/:id',
    component: DetalleDispositivoComponent,
  },
  {
    path: 'acta-devolucion',
    component: ActaDevolucionComponent,
  },
  {
    path: 'firmar/:token',
    component: FirmaExternaComponent,
  },
  // Rutas de Devolución (proceso separado)
  {
    path: 'crear-devolucion',
    component: CrearDevolucionComponent,
  },
  {
    path: 'actas-devolucion',
    component: ActasDevolucionComponent,
  },
  {
    path: 'firmar-devolucion/:token',
    component: FirmaDevolucionComponent,
  },
  // ==================== MOBILIARIO ====================
  {
    path: 'inventario-mobiliario',
    component: InventarioMobiliarioComponent,
  },
  {
    path: 'agregar-mobiliario',
    component: AgregarMobiliarioComponent,
  },
  {
    path: 'mobiliario/:id',
    component: InventarioMobiliarioComponent, // Temporal, se puede crear componente detalle
  },
  // ==================== ASEO ====================
  {
    path: 'inventario-aseo',
    component: InventarioConsumiblesComponent,
    data: { tipoInventario: 'aseo' }
  },
  {
    path: 'actas-aseo',
    component: ActasConsumiblesComponent,
    data: { tipo: 'aseo' }
  },
  // ==================== PAPELERÍA ====================
  {
    path: 'inventario-papeleria',
    component: InventarioConsumiblesComponent,
    data: { tipoInventario: 'papeleria' }
  },
  {
    path: 'actas-papeleria',
    component: ActasConsumiblesComponent,
    data: { tipo: 'papeleria' }
  },
  // ==================== CONSUMIBLES GENERALES ====================
  {
    path: 'agregar-consumible/:tipo',
    component: AgregarConsumibleComponent,
  },
  {
    path: 'crear-acta-consumible/:tipo',
    component: CrearActaConsumibleComponent,
  },
  {
    path: 'firmar-consumible/:token',
    component: FirmaConsumibleComponent,
  },
  {
    path: 'consumible/:id',
    component: InventarioConsumiblesComponent, // Temporal, se puede crear componente detalle
  },
  {
    path: 'historial-consumible/:id',
    component: InventarioConsumiblesComponent, // Temporal
  },
  {
    path: '**',
    redirectTo: 'inventario'
  }
];
