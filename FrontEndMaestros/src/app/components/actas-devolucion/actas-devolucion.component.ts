import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DevolucionService } from '../../services/devolucion.service';
import { WebsocketService } from '../../services/websocket.service';
import { SpinnerComponent } from '../../shared/spinner/spinner/spinner.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-actas-devolucion',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './actas-devolucion.component.html',
  styleUrls: ['./actas-devolucion.component.css'],
})
export class ActasDevolucionComponent implements OnInit, OnDestroy {
  actas: any[] = [];
  actasFiltradas: any[] = [];
  loading = false;
  error = '';
  success = '';

  // Filtros
  filtroNumeroActa = '';
  filtroNombreEntrega = '';
  filtroEstado = '';
  filtroFechaInicio = '';
  filtroFechaFin = '';

  // Paginación
  paginaActual = 1;
  actasPorPagina = 10;
  totalPaginas = 1;

  // Modal detalle
  actaSeleccionada: any = null;
  mostrarModal = false;

  // Suscripciones WebSocket
  private subscriptions: Subscription[] = [];

  constructor(
    private devolucionService: DevolucionService,
    private websocketService: WebsocketService,
  ) {}

  ngOnInit(): void {
    this.cargarActas();
    this.conectarWebSocket();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private conectarWebSocket(): void {
    // Unirse a la sala de devoluciones
    this.websocketService.joinRoom('devoluciones');

    // Suscribirse a eventos de devoluciones
    this.subscriptions.push(
      this.websocketService.onDevolucionCreated().subscribe((acta) => {
        console.log('🔄 Nueva acta de devolución creada:', acta);
        this.cargarActas();
      }),
    );

    this.subscriptions.push(
      this.websocketService.onDevolucionSigned().subscribe((data) => {
        console.log('🔄 Acta de devolución firmada:', data);
        this.cargarActas();
        // Si el acta seleccionada es la que se firmó, recargar detalle
        if (this.actaSeleccionada?.id === data.actaId) {
          this.verDetalle(this.actaSeleccionada);
        }
      }),
    );

    this.subscriptions.push(
      this.websocketService.onDevolucionRejected().subscribe((data) => {
        console.log('🔄 Acta de devolución rechazada:', data);
        this.cargarActas();
        // Si el acta seleccionada es la que se rechazó, recargar detalle
        if (this.actaSeleccionada?.id === data.actaId) {
          this.verDetalle(this.actaSeleccionada);
        }
      }),
    );
  }

  cargarActas(): void {
    this.loading = true;
    this.error = '';

    this.devolucionService.obtenerActasDevolucion().subscribe({
      next: (response: any) => {
        this.actas = response.actas || [];
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando actas:', err);
        this.error = 'Error al cargar las actas de devolución';
        this.loading = false;
      },
    });
  }

  aplicarFiltros(): void {
    this.actasFiltradas = this.actas.filter((acta) => {
      // Filtro por número de acta
      if (
        this.filtroNumeroActa &&
        !acta.numeroActa
          .toLowerCase()
          .includes(this.filtroNumeroActa.toLowerCase())
      ) {
        return false;
      }

      // Filtro por nombre de quien devuelve
      if (
        this.filtroNombreEntrega &&
        !acta.nombreEntrega
          .toLowerCase()
          .includes(this.filtroNombreEntrega.toLowerCase())
      ) {
        return false;
      }

      // Filtro por estado
      if (this.filtroEstado && acta.estado !== this.filtroEstado) {
        return false;
      }

      // Filtro por fecha inicio
      if (this.filtroFechaInicio) {
        const fechaActa = new Date(acta.createdAt);
        const fechaInicio = new Date(this.filtroFechaInicio);
        if (fechaActa < fechaInicio) {
          return false;
        }
      }

      // Filtro por fecha fin
      if (this.filtroFechaFin) {
        const fechaActa = new Date(acta.createdAt);
        const fechaFin = new Date(this.filtroFechaFin);
        fechaFin.setHours(23, 59, 59);
        if (fechaActa > fechaFin) {
          return false;
        }
      }

      return true;
    });

    this.totalPaginas = Math.ceil(
      this.actasFiltradas.length / this.actasPorPagina,
    );
    this.paginaActual = 1;
  }

  limpiarFiltros(): void {
    this.filtroNumeroActa = '';
    this.filtroNombreEntrega = '';
    this.filtroEstado = '';
    this.filtroFechaInicio = '';
    this.filtroFechaFin = '';
    this.aplicarFiltros();
  }

  get actasPaginadas(): any[] {
    const inicio = (this.paginaActual - 1) * this.actasPorPagina;
    const fin = inicio + this.actasPorPagina;
    return this.actasFiltradas.slice(inicio, fin);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  verDetalle(acta: any): void {
    this.actaSeleccionada = acta;
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.actaSeleccionada = null;
  }

  reenviarCorreo(acta: any): void {
    if (acta.estado !== 'pendiente_firma') {
      this.error =
        'Solo se puede reenviar el correo para actas pendientes de firma';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    this.devolucionService.reenviarCorreoDevolucion(acta.id).subscribe({
      next: (response: any) => {
        this.success = `Correo reenviado exitosamente a ${acta.correoEntrega}`;
        this.loading = false;
        setTimeout(() => (this.success = ''), 5000);
      },
      error: (err) => {
        console.error('Error reenviando correo:', err);
        this.error = err.error?.msg || 'Error al reenviar el correo';
        this.loading = false;
      },
    });
  }

  getEstadoClass(estado: string): string {
    const clases: { [key: string]: string } = {
      pendiente_firma: 'badge-pendiente_firma',
      completada: 'badge-completada',
      rechazada: 'badge-rechazada',
    };
    return clases[estado] || 'badge-pendiente_firma';
  }
  getEstadoIcon(estado: string): string {
    const iconos: { [key: string]: string } = {
      pendiente_firma: 'pi-clock',
      completada: 'pi-check-circle',
      rechazada: 'pi-times-circle',
    };
    return iconos[estado] || 'pi-clock';
  }
  getCategoriaIcon(categoria: string): string {
    const iconos: { [key: string]: string } = {
      celular: 'pi-mobile',
      tablet: 'pi-tablet',
      laptop: 'pi-desktop',
      computador: 'pi-desktop',
      monitor: 'pi-desktop',
      impresora: 'pi-print',
      accesorio: 'pi-cog',
      otro: 'pi-box',
    };
    return iconos[categoria?.toLowerCase()] || 'pi-box';
  }
  getEstadoTexto(estado: string): string {
    const textos: { [key: string]: string } = {
      pendiente_firma: 'Pendiente de Firma',
      completada: 'Completada',
      rechazada: 'Rechazada',
    };
    return textos[estado] || estado;
  }
  getPaginasVisibles(): number[] {
    const paginas: number[] = [];
    const rango = 2; // Mostrar 2 páginas a cada lado de la actual

    let inicio = Math.max(1, this.paginaActual - rango);
    let fin = Math.min(this.totalPaginas, this.paginaActual + rango);

    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }

    return paginas;
  }
  formatFecha(fecha: any): string {
    if (!fecha) return '-';
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
