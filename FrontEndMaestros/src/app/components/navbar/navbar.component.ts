import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConnectionIndicatorComponent } from '../connection-indicator/connection-indicator.component';

@Component({
  selector: 'app-navbar',
  imports: [FormsModule, ConnectionIndicatorComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  constructor(private router: Router) {}
  
  logOut() {
    localStorage.removeItem('token');
    localStorage.clear();
    this.router.navigate(['/logIn']);
  }
  
  // ==================== TECNOLOGÍA ====================
  irInventario() {
    this.router.navigate(['/inventario']);
  }

  agregarDispositivo() {
    this.router.navigate(['/agregar-dispositivo']);
  }

  crearActa() {
    this.router.navigate(['/crear-acta']);
  }

  verActas() {
    this.router.navigate(['/actas']);
  }

  // Funciones para Devolución (proceso separado)
  crearDevolucion() {
    this.router.navigate(['/crear-devolucion']);
  }

  verActasDevolucion() {
    this.router.navigate(['/actas-devolucion']);
  }

  // Método antiguo para compatibilidad
  registrarDevolucion() {
    this.router.navigate(['/acta-devolucion']);
  }

  // ==================== MOBILIARIO ====================
  irMobiliario() {
    this.router.navigate(['/inventario-mobiliario']);
  }

  agregarMobiliario() {
    this.router.navigate(['/agregar-mobiliario']);
  }

  crearActaMobiliario() {
    this.router.navigate(['/crear-acta-mobiliario']);
  }

  verActasMobiliario() {
    this.router.navigate(['/actas-mobiliario']);
  }

  // ==================== ASEO ====================
  irAseo() {
    this.router.navigate(['/inventario-aseo']);
  }

  agregarAseo() {
    this.router.navigate(['/agregar-consumible/aseo']);
  }

  crearActaAseo() {
    this.router.navigate(['/crear-acta-consumible/aseo']);
  }

  verActasAseo() {
    this.router.navigate(['/actas-aseo']);
  }

  // ==================== PAPELERÍA ====================
  irPapeleria() {
    this.router.navigate(['/inventario-papeleria']);
  }

  agregarPapeleria() {
    this.router.navigate(['/agregar-consumible/papeleria']);
  }

  crearActaPapeleria() {
    this.router.navigate(['/crear-acta-consumible/papeleria']);
  }

  verActasPapeleria() {
    this.router.navigate(['/actas-papeleria']);
  }

  // ==================== BOTIQUÍN ====================
  irBotiquin() {
    this.router.navigate(['/inventario-botiquin']);
  }

  agregarBotiquin() {
    this.router.navigate(['/agregar-consumible/botiquin']);
  }

  crearActaBotiquin() {
    this.router.navigate(['/crear-acta-consumible/botiquin']);
  }

  verActasBotiquin() {
    this.router.navigate(['/actas-botiquin']);
  }

  // ==================== DESECHABLES ====================
  irDesechables() {
    this.router.navigate(['/inventario-desechables']);
  }

  agregarDesechable() {
    this.router.navigate(['/agregar-consumible/desechables']);
  }

  crearActaDesechables() {
    this.router.navigate(['/crear-acta-consumible/desechables']);
  }

  verActasDesechables() {
    this.router.navigate(['/actas-desechables']);
  }
}
