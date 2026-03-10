import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { ActaMobiliarioService, ActaMobiliario, DetalleActaMobiliario } from '../../services/acta-mobiliario.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-actas-mobiliario',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './actas-mobiliario.component.html',
  styleUrl: './actas-mobiliario.component.css'
})
export class ActasMobiliarioComponent implements OnInit {
  actas: ActaMobiliario[] = [];
  actasFiltradas: ActaMobiliario[] = [];
  loading = false;
  busqueda = '';
  filtroEstado = 'todas';

  // Modal detalle
  actaSeleccionada: ActaMobiliario | null = null;
  mostrarDetalle = false;

  // Modal devolucion
  mostrarDevolucion = false;
  actaDevolucion: ActaMobiliario | null = null;
  devolucionItems: { detalleId: number; nombre: string; pendiente: number; cantidadDevolver: number; condicionDevolucion: string; estadoDevolucion: string; observaciones: string }[] = [];
  observacionesDevolucion = '';
  loadingDevolucion = false;

  estados = [
    { value: 'todas', label: 'Todas' },
    { value: 'pendiente_firma', label: 'Pendiente Firma' },
    { value: 'activa', label: 'Activa' },
    { value: 'devuelta_parcial', label: 'Dev. Parcial' },
    { value: 'devuelta_completa', label: 'Dev. Completa' },
    { value: 'rechazada', label: 'Rechazada' },
    { value: 'cancelada', label: 'Cancelada' }
  ];

  constructor(
    private actaService: ActaMobiliarioService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarActas();
  }

  cargarActas(): void {
    this.loading = true;
    const estado = this.filtroEstado !== 'todas' ? this.filtroEstado : undefined;
    this.actaService.obtenerActas(estado, this.busqueda || undefined).subscribe({
      next: (data) => {
        this.actas = data;
        this.filtrar();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  filtrar(): void {
    let resultado = this.actas;
    if (this.busqueda) {
      const b = this.busqueda.toLowerCase();
      resultado = resultado.filter(a =>
        a.numeroActa?.toLowerCase().includes(b) ||
        a.nombreReceptor?.toLowerCase().includes(b) ||
        a.cargoReceptor?.toLowerCase().includes(b)
      );
    }
    this.actasFiltradas = resultado;
  }

  cambiarFiltro(): void {
    this.cargarActas();
  }

  getEstadoClass(estado: string): string {
    const map: { [k: string]: string } = {
      'pendiente_firma': 'badge-warning',
      'activa': 'badge-success',
      'devuelta_parcial': 'badge-info',
      'devuelta_completa': 'badge-primary',
      'vencida': 'badge-danger',
      'rechazada': 'badge-danger',
      'cancelada': 'badge-secondary'
    };
    return map[estado] || 'badge-secondary';
  }

  getEstadoLabel(estado: string): string {
    const map: { [k: string]: string } = {
      'pendiente_firma': 'Pendiente Firma',
      'activa': 'Activa',
      'devuelta_parcial': 'Dev. Parcial',
      'devuelta_completa': 'Dev. Completa',
      'vencida': 'Vencida',
      'rechazada': 'Rechazada',
      'cancelada': 'Cancelada'
    };
    return map[estado] || estado;
  }

  getTotalItems(acta: ActaMobiliario): number {
    return acta.detalles?.reduce((s, d) => s + d.cantidad, 0) || 0;
  }

  getTotalDevueltos(acta: ActaMobiliario): number {
    return acta.detalles?.reduce((s, d) => s + d.cantidadDevuelta, 0) || 0;
  }

  // Detalle
  verDetalle(acta: ActaMobiliario): void {
    this.actaSeleccionada = acta;
    this.mostrarDetalle = true;
  }

  cerrarDetalle(): void {
    this.mostrarDetalle = false;
    this.actaSeleccionada = null;
  }

  // Enviar firma
  enviarFirma(acta: ActaMobiliario): void {
    Swal.fire({
      title: 'Enviar solicitud de firma',
      text: `Se enviara un correo a ${acta.correoReceptor} para firmar el acta ${acta.numeroActa}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#5d4037'
    }).then(result => {
      if (result.isConfirmed) {
        this.actaService.enviarSolicitudFirma(acta.id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Correo enviado', text: 'La solicitud de firma fue enviada', confirmButtonColor: '#5d4037' });
            this.cargarActas();
          },
          error: (err) => {
            Swal.fire({ icon: 'error', title: 'Error', text: err.error?.msg || 'No se pudo enviar el correo' });
          }
        });
      }
    });
  }

  reenviarFirma(acta: ActaMobiliario): void {
    this.actaService.reenviarCorreoFirma(acta.id).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Correo reenviado', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Error', text: err.error?.msg || 'No se pudo reenviar' });
      }
    });
  }

  // Devolucion
  abrirDevolucion(acta: ActaMobiliario): void {
    this.actaDevolucion = acta;
    this.observacionesDevolucion = '';
    this.devolucionItems = (acta.detalles || [])
      .filter(d => d.cantidadDevuelta < d.cantidad)
      .map(d => ({
        detalleId: d.id,
        nombre: d.mobiliario?.nombre || 'Mueble',
        pendiente: d.cantidad - d.cantidadDevuelta,
        cantidadDevolver: 0,
        condicionDevolucion: 'bueno',
        estadoDevolucion: 'disponible',
        observaciones: ''
      }));
    this.mostrarDevolucion = true;
  }

  cerrarDevolucion(): void {
    this.mostrarDevolucion = false;
    this.actaDevolucion = null;
  }

  registrarDevolucion(): void {
    const itemsADevolver = this.devolucionItems.filter(i => i.cantidadDevolver > 0);
    if (itemsADevolver.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Sin items', text: 'Debe indicar al menos una cantidad a devolver' });
      return;
    }

    this.loadingDevolucion = true;
    const formData = new FormData();
    formData.append('devoluciones', JSON.stringify(itemsADevolver));
    formData.append('observacionesDevolucion', this.observacionesDevolucion);
    const userStr = localStorage.getItem('user');
    const Uid = userStr ? JSON.parse(userStr).Uid : null;
    if (Uid) formData.append('Uid', Uid);

    this.actaService.registrarDevolucion(this.actaDevolucion!.id, formData).subscribe({
      next: (resp) => {
        this.loadingDevolucion = false;
        this.cerrarDevolucion();
        Swal.fire({ icon: 'success', title: 'Devolucion registrada', text: resp.msg, confirmButtonColor: '#5d4037' });
        this.cargarActas();
      },
      error: (err) => {
        this.loadingDevolucion = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err.error?.msg || 'Error al registrar devolucion' });
      }
    });
  }

  // Cancelar acta
  cancelarActa(acta: ActaMobiliario): void {
    Swal.fire({
      title: 'Cancelar acta',
      text: `Esta seguro de cancelar el acta ${acta.numeroActa}? Se restaurara el stock.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, cancelar',
      cancelButtonText: 'No',
      confirmButtonColor: '#d32f2f'
    }).then(result => {
      if (result.isConfirmed) {
        this.actaService.cancelarActa(acta.id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Acta cancelada', text: 'El inventario fue restaurado', confirmButtonColor: '#5d4037' });
            this.cargarActas();
          },
          error: (err) => {
            Swal.fire({ icon: 'error', title: 'Error', text: err.error?.msg || 'Error al cancelar' });
          }
        });
      }
    });
  }

  // Eliminar acta cancelada/rechazada
  eliminarActa(acta: ActaMobiliario): void {
    Swal.fire({
      title: 'Eliminar acta',
      text: `Esta seguro de eliminar permanentemente el acta ${acta.numeroActa}? Esta accion no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar',
      cancelButtonText: 'No',
      confirmButtonColor: '#d32f2f'
    }).then(result => {
      if (result.isConfirmed) {
        this.actaService.eliminarActa(acta.id).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Acta eliminada', text: 'El acta fue eliminada permanentemente', confirmButtonColor: '#5d4037' });
            this.cargarActas();
          },
          error: (err) => {
            Swal.fire({ icon: 'error', title: 'Error', text: err.error?.msg || 'Error al eliminar' });
          }
        });
      }
    });
  }

  crearNuevaActa(): void {
    this.router.navigate(['/crear-acta-mobiliario']);
  }
}
