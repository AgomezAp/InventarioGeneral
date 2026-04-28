import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ConnectionIndicatorComponent } from '../connection-indicator/connection-indicator.component';

@Component({
  selector: 'app-navbar',
  imports: [FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  constructor(private router: Router) {}
  mobileMenuOpen = false;
  mobileGroups: Record<string, boolean> = {};

  logOut() {
    localStorage.removeItem('token');
    localStorage.clear();
    this.router.navigate(['/logIn']);
  }
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.nav-main__item--dropdown')) {
      document
        .querySelectorAll('.nav-main__item--dropdown.is-open')
        .forEach((el) => {
          el.classList.remove('is-open');
        });
    }
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

  // ==================== DOTACIÓN ====================
  irDotacion() {
    this.router.navigate(['/inventario-dotacion']);
  }

  agregarDotacion() {
    this.router.navigate(['/agregar-consumible/dotacion']);
  }

  crearActaDotacion() {
    this.router.navigate(['/crear-acta-consumible/dotacion']);
  }

  verActasDotacion() {
    this.router.navigate(['/actas-dotacion']);
  }
  toggleDropdown(event: Event): void {
    const btn = event.currentTarget as HTMLElement;
    const parent = btn.closest('.nav-main__item--dropdown');

    // Cerrar otros dropdowns abiertos
    document
      .querySelectorAll('.nav-main__item--dropdown.is-open')
      .forEach((el) => {
        if (el !== parent) el.classList.remove('is-open');
      });

    parent?.classList.toggle('is-open');
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    document.body.style.overflow = this.mobileMenuOpen ? 'hidden' : '';
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  toggleMobileGroup(group: string): void {
    this.mobileGroups[group] = !this.mobileGroups[group];
  }
}
