import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { MobiliarioService } from '../../services/mobiliario.service';
import { ActaMobiliarioService } from '../../services/acta-mobiliario.service';
import { Mobiliario } from '../../interfaces/mobiliario-consumible';
import Swal from 'sweetalert2';

interface MuebleSeleccionado {
  mobiliario: Mobiliario;
  cantidad: number;
  condicionEntrega: string;
  observaciones: string;
}

@Component({
  selector: 'app-crear-acta-mobiliario',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './crear-acta-mobiliario.component.html',
  styleUrl: './crear-acta-mobiliario.component.css'
})
export class CrearActaMobiliarioComponent implements OnInit {
  receptor = {
    nombre: '',
    cedula: '',
    cargo: '',
    telefono: '',
    correo: ''
  };

  fechaDevolucionEsperada = '';
  observacionesEntrega = '';

  mueblesDisponibles: Mobiliario[] = [];
  mueblesFiltrados: Mobiliario[] = [];
  busquedaMueble = '';
  mueblesSeleccionados: MuebleSeleccionado[] = [];

  loading = false;
  loadingMuebles = false;
  errorMessage = '';

  condiciones = [
    { value: 'nuevo', label: 'Nuevo' },
    { value: 'bueno', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'malo', label: 'Malo' }
  ];

  constructor(
    private mobiliarioService: MobiliarioService,
    private actaService: ActaMobiliarioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarMueblesDisponibles();
  }

  cargarMueblesDisponibles(): void {
    this.loadingMuebles = true;
    this.mobiliarioService.obtenerMobiliario({ activo: true }).subscribe({
      next: (data) => {
        this.mueblesDisponibles = data.filter(m => m.stockActual > 0);
        this.mueblesFiltrados = this.mueblesDisponibles;
        this.loadingMuebles = false;
      },
      error: () => {
        this.loadingMuebles = false;
        this.errorMessage = 'Error al cargar el mobiliario disponible';
      }
    });
  }

  filtrarMuebles(): void {
    const busqueda = this.busquedaMueble.toLowerCase().trim();
    if (!busqueda) {
      this.mueblesFiltrados = this.mueblesDisponibles;
      return;
    }
    this.mueblesFiltrados = this.mueblesDisponibles.filter(m =>
      m.nombre?.toLowerCase().includes(busqueda) ||
      m.categoria?.toLowerCase().includes(busqueda) ||
      m.descripcion?.toLowerCase().includes(busqueda)
    );
  }

  agregarMueble(mueble: Mobiliario): void {
    if (this.mueblesSeleccionados.find(m => m.mobiliario.id === mueble.id)) return;

    this.mueblesSeleccionados.push({
      mobiliario: mueble,
      cantidad: 1,
      condicionEntrega: 'bueno',
      observaciones: ''
    });

    this.mueblesDisponibles = this.mueblesDisponibles.filter(m => m.id !== mueble.id);
    this.filtrarMuebles();
  }

  quitarMueble(index: number): void {
    const item = this.mueblesSeleccionados[index];
    this.mueblesDisponibles.push(item.mobiliario);
    this.mueblesSeleccionados.splice(index, 1);
    this.mueblesDisponibles.sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.filtrarMuebles();
  }

  validarCantidad(index: number): void {
    const item = this.mueblesSeleccionados[index];
    if (item.cantidad < 1) item.cantidad = 1;
    if (item.cantidad > item.mobiliario.stockActual) {
      item.cantidad = item.mobiliario.stockActual;
      Swal.fire({
        icon: 'warning',
        title: 'Stock limitado',
        text: `Solo hay ${item.mobiliario.stockActual} disponibles`,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false
      });
    }
  }

  getTotalMuebles(): number {
    return this.mueblesSeleccionados.reduce((s, m) => s + m.cantidad, 0);
  }

  getCategoriaIcon(categoria?: string): string {
    if (!categoria) return 'fa-couch';
    const map: { [k: string]: string } = {
      'escritorio': 'fa-desktop',
      'silla': 'fa-chair',
      'mesa': 'fa-table',
      'archivador': 'fa-cabinet-filing',
      'estante': 'fa-shelves',
      'otro': 'fa-couch'
    };
    const cat = categoria.toLowerCase();
    for (const [key, icon] of Object.entries(map)) {
      if (cat.includes(key)) return icon;
    }
    return 'fa-couch';
  }

  async crearActa(): Promise<void> {
    if (!this.receptor.nombre.trim()) { this.errorMessage = 'El nombre del receptor es requerido'; return; }
    if (!this.receptor.cargo.trim()) { this.errorMessage = 'El cargo del receptor es requerido'; return; }
    if (!this.receptor.correo.trim()) { this.errorMessage = 'El correo del receptor es requerido'; return; }
    if (this.mueblesSeleccionados.length === 0) { this.errorMessage = 'Debe seleccionar al menos un mueble'; return; }

    this.errorMessage = '';
    this.loading = true;

    const userStr = localStorage.getItem('user');
    const Uid = userStr ? JSON.parse(userStr).Uid : null;

    const formData = new FormData();
    formData.append('nombreReceptor', this.receptor.nombre);
    formData.append('cedulaReceptor', this.receptor.cedula);
    formData.append('cargoReceptor', this.receptor.cargo);
    formData.append('telefonoReceptor', this.receptor.telefono);
    formData.append('correoReceptor', this.receptor.correo);
    formData.append('observacionesEntrega', this.observacionesEntrega);
    if (this.fechaDevolucionEsperada) {
      formData.append('fechaDevolucionEsperada', this.fechaDevolucionEsperada);
    }
    if (Uid) formData.append('Uid', Uid);
    formData.append('muebles', JSON.stringify(
      this.mueblesSeleccionados.map(m => ({
        mobiliarioId: m.mobiliario.id,
        cantidad: m.cantidad,
        condicionEntrega: m.condicionEntrega,
        observaciones: m.observaciones
      }))
    ));

    this.actaService.crearActa(formData).subscribe({
      next: (resp) => {
        this.loading = false;
        // Enviar solicitud de firma
        this.actaService.enviarSolicitudFirma(resp.acta.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Acta creada',
              html: `<p>El acta <strong>${resp.acta.numeroActa}</strong> fue creada.</p>
                     <p>Se envio correo a <strong>${this.receptor.correo}</strong> para firma digital.</p>`,
              confirmButtonColor: '#5d4037'
            }).then(() => this.router.navigate(['/actas-mobiliario']));
          },
          error: () => {
            Swal.fire({
              icon: 'success',
              title: 'Acta creada',
              html: `<p>El acta <strong>${resp.acta.numeroActa}</strong> fue creada.</p>
                     <p>No se pudo enviar el correo automaticamente. Puede reenviarlo desde la lista de actas.</p>`,
              confirmButtonColor: '#5d4037'
            }).then(() => this.router.navigate(['/actas-mobiliario']));
          }
        });
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error.error?.msg || 'Error al crear el acta';
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/inventario-mobiliario']);
  }
}
