import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { InventarioService } from '../../services/inventario.service';
import { Dispositivo } from '../../interfaces/inventario';
import { NavbarComponent } from '../navbar/navbar.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-detalle-dispositivo',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './detalle-dispositivo.component.html',
  styleUrl: './detalle-dispositivo.component.css'
})
export class DetalleDispositivoComponent implements OnInit {
  dispositivo: Dispositivo | null = null;
  dispositivoOriginal: Dispositivo | null = null;
  loading = false;
  guardando = false;
  error = '';
  modoEdicion = false;
  
  // Para el modal de fotos
  fotoSeleccionada: string | null = null;
  
  // Para cambio de estado
  mostrarModalEstado = false;
  nuevoEstado = '';
  motivoCambio = '';
  
  categorias = ['celular', 'tablet', 'computador', 'cargador', 'accesorio', 'otro'];
  condiciones = ['excelente', 'bueno', 'regular', 'malo'];
  estados = ['disponible', 'entregado', 'dañado', 'perdido', 'obsoleto'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inventarioService: InventarioService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const editarParam = this.route.snapshot.queryParamMap.get('editar');
    
    if (editarParam === 'true') {
      this.modoEdicion = true;
    }
    
    if (id) {
      this.cargarDispositivo(+id);
    }
  }

  cargarDispositivo(id: number): void {
    this.loading = true;
    this.inventarioService.obtenerDispositivoPorId(id).subscribe({
      next: (data) => {
        this.dispositivo = data;
        this.dispositivoOriginal = { ...data };
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar el dispositivo';
        this.loading = false;
        console.error(err);
      }
    });
  }

  activarEdicion(): void {
    this.modoEdicion = true;
    // Guardar copia del original para cancelar
    this.dispositivoOriginal = { ...this.dispositivo! };
  }

  cancelarEdicion(): void {
    this.modoEdicion = false;
    // Restaurar valores originales
    this.dispositivo = { ...this.dispositivoOriginal! };
  }

  guardarCambios(): void {
    if (!this.dispositivo) return;
    
    this.guardando = true;
    
    const datosActualizar: any = {
      nombre: this.dispositivo.nombre,
      categoria: this.dispositivo.categoria,
      marca: this.dispositivo.marca,
      modelo: this.dispositivo.modelo,
      serial: this.dispositivo.serial,
      imei: this.dispositivo.imei,
      color: this.dispositivo.color,
      descripcion: this.dispositivo.descripcion,
      condicion: this.dispositivo.condicion,
      ubicacion: this.dispositivo.ubicacion,
      observaciones: this.dispositivo.observaciones,
      Uid: localStorage.getItem('userId')
    };
    
    this.inventarioService.actualizarDispositivo(this.dispositivo.id!, datosActualizar).subscribe({
      next: (response) => {
        this.guardando = false;
        this.modoEdicion = false;
        this.dispositivoOriginal = { ...this.dispositivo! };
        alert('Dispositivo actualizado exitosamente');
      },
      error: (err) => {
        this.guardando = false;
        alert(err.error?.msg || 'Error al actualizar el dispositivo');
      }
    });
  }

  // Obtener fotos como array
  getFotos(): string[] {
    if (!this.dispositivo?.fotos) return [];
    
    try {
      if (typeof this.dispositivo.fotos === 'string') {
        return JSON.parse(this.dispositivo.fotos);
      }
      return this.dispositivo.fotos as unknown as string[];
    } catch {
      return [];
    }
  }

  getPhotoUrl(foto: string): string {
    if (foto.startsWith('http')) {
      return foto;
    }
    // Quitar la barra inicial si existe para evitar doble barra
    const fotoPath = foto.startsWith('/') ? foto.substring(1) : foto;
    return `${environment.apiUrl}${fotoPath}`;
  }

  abrirFoto(foto: string): void {
    this.fotoSeleccionada = this.getPhotoUrl(foto);
  }

  cerrarFoto(): void {
    this.fotoSeleccionada = null;
  }

  // Modal cambio de estado
  abrirModalEstado(): void {
    this.nuevoEstado = this.dispositivo?.estado || '';
    this.motivoCambio = '';
    this.mostrarModalEstado = true;
  }

  cerrarModalEstado(): void {
    this.mostrarModalEstado = false;
    this.nuevoEstado = '';
    this.motivoCambio = '';
  }

  confirmarCambioEstado(): void {
    if (!this.dispositivo || !this.nuevoEstado) return;
    
    if (this.nuevoEstado === this.dispositivo.estado) {
      alert('Selecciona un estado diferente');
      return;
    }
    
    this.guardando = true;
    
    this.inventarioService.cambiarEstado(
      this.dispositivo.id!,
      this.nuevoEstado,
      this.motivoCambio
    ).subscribe({
      next: (response) => {
        this.dispositivo!.estado = this.nuevoEstado as 'disponible' | 'entregado' | 'dañado' | 'perdido' | 'obsoleto';
        this.guardando = false;
        this.cerrarModalEstado();
        alert('Estado actualizado exitosamente');
      },
      error: (err) => {
        this.guardando = false;
        alert(err.error?.msg || 'Error al cambiar el estado');
      }
    });
  }

  // Helpers para UI
  getCategoriaIcon(categoria: string): string {
    const iconos: { [key: string]: string } = {
      'celular': 'fa-mobile-alt',
      'tablet': 'fa-tablet-alt',
      'computador': 'fa-laptop',
      'cargador': 'fa-plug',
      'accesorio': 'fa-headphones',
      'otro': 'fa-box'
    };
    return iconos[categoria] || 'fa-box';
  }

  getEstadoClass(estado: string): string {
    const clases: { [key: string]: string } = {
      'disponible': 'estado-disponible',
      'entregado': 'estado-entregado',
      'dañado': 'estado-danado',
      'perdido': 'estado-perdido',
      'obsoleto': 'estado-obsoleto'
    };
    return clases[estado] || '';
  }

  getCondicionClass(condicion: string): string {
    const clases: { [key: string]: string } = {
      'excelente': 'condicion-excelente',
      'bueno': 'condicion-bueno',
      'regular': 'condicion-regular',
      'malo': 'condicion-malo'
    };
    return clases[condicion] || '';
  }

  formatFecha(fecha: string | Date | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  verTrazabilidad(): void {
    if (this.dispositivo) {
      this.router.navigate(['/trazabilidad', this.dispositivo.id]);
    }
  }

  volver(): void {
    this.router.navigate(['/inventario']);
  }
}
