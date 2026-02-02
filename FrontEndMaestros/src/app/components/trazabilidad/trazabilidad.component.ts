import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InventarioService } from '../../services/inventario.service';
import {
  Dispositivo,
  MovimientoDispositivo,
} from '../../interfaces/inventario';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-trazabilidad',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './trazabilidad.component.html',
  styleUrl: './trazabilidad.component.css',
})
export class TrazabilidadComponent implements OnInit {
  dispositivo: Dispositivo | null = null;
  movimientos: MovimientoDispositivo[] = [];
  loading = false;
  error = '';

  // ✅ Agregar esta propiedad para guardar el ID
  private dispositivoId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inventarioService: InventarioService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.dispositivoId = parseInt(id); // ✅ Guardar el ID
      this.cargarDatos(this.dispositivoId);
    }
  }

  // ✅ Agregar este método para reintentar
  reintentar(): void {
    if (this.dispositivoId) {
      this.error = ''; // Limpiar error previo
      this.cargarDatos(this.dispositivoId);
    }
  }

  cargarDatos(id: number): void {
    this.loading = true;

    // Cargar dispositivo
    this.inventarioService.obtenerDispositivoPorId(id).subscribe({
      next: (data) => {
        this.dispositivo = data;
      },
      error: (err) => {
        this.error = 'Error al cargar el dispositivo';
        console.error(err);
      },
    });

    // Cargar trazabilidad
    this.inventarioService.obtenerTrazabilidad(id).subscribe({
      next: (data) => {
        this.movimientos = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar la trazabilidad';
        this.loading = false;
        console.error(err);
      },
    });
  }

  // ... resto de métodos igual
  getMovimientoIcon(tipo: string): string {
    const iconos: { [key: string]: string } = {
      ingreso: 'fa-plus-circle',
      prestamo: 'fa-hand-holding',
      devolucion: 'fa-undo',
      cambio_estado: 'fa-exchange-alt',
      actualizacion: 'fa-edit',
      baja: 'fa-minus-circle',
    };
    return iconos[tipo] || 'fa-circle';
  }

  getMovimientoClass(tipo: string): string {
    const clases: { [key: string]: string } = {
      ingreso: 'mov-ingreso',
      prestamo: 'mov-prestamo',
      devolucion: 'mov-devolucion',
      cambio_estado: 'mov-cambio',
      actualizacion: 'mov-actualizacion',
      baja: 'mov-baja',
    };
    return clases[tipo] || '';
  }

  getMovimientoLabel(tipo: string): string {
    const labels: { [key: string]: string } = {
      ingreso: 'Ingreso al inventario',
      prestamo: 'Préstamo',
      devolucion: 'Devolución',
      cambio_estado: 'Cambio de estado',
      actualizacion: 'Actualización',
      baja: 'Baja del inventario',
    };
    return labels[tipo] || tipo;
  }

  getCategoriaIcon(categoria: string): string {
    const iconos: { [key: string]: string } = {
      celular: 'fa-mobile-alt',
      tablet: 'fa-tablet-alt',
      computador: 'fa-laptop',
      cargador: 'fa-plug',
      accesorio: 'fa-headphones',
      otro: 'fa-box',
    };
    return iconos[categoria] || 'fa-box';
  }

  getEstadoClass(estado: string): string {
    const clases: { [key: string]: string } = {
      disponible: 'estado-disponible',
      entregado: 'estado-entregado',
      dañado: 'estado-danado',
      perdido: 'estado-perdido',
      obsoleto: 'estado-obsoleto',
    };
    return clases[estado] || '';
  }

  volver(): void {
    this.router.navigate(['/inventario']);
  }
}
