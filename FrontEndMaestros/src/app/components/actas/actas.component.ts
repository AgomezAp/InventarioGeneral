import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { InventarioService } from '../../services/inventario.service';
import { FirmaService } from '../../services/firma.service';
import { WebsocketService } from '../../services/websocket.service';
import { ActaEntrega, DetalleActa } from '../../interfaces/inventario';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-actas',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './actas.component.html',
  styleUrl: './actas.component.css',
})
export class ActasComponent implements OnInit, OnDestroy {
  actas: ActaEntrega[] = [];
  actasFiltradas: ActaEntrega[] = [];
  actaSeleccionada: ActaEntrega | null = null;

  loading = false;
  loadingDetalle = false;
  error = '';

  // Filtros
  filtroEstado = 'todas';
  filtroBusqueda = '';

  // Modal de devolución
  mostrarModalDevolucion = false;
  devolucionActa: ActaEntrega | null = null;
  devoluciones: {
    detalle: DetalleActa;
    devolver: boolean;
    estadoDevolucion: string;
    condicionDevolucion: string;
    observaciones: string;
  }[] = [];
  observacionesDevolucion = '';
  loadingDevolucion = false;

  // Reenvío de correo
  reenviandoCorreo: { [id: number]: boolean } = {};

  estados = [
    'pendiente_firma',
    'activa',
    'devuelta_parcial',
    'devuelta_completa',
    'vencida',
    'rechazada',
  ];

  // Suscripciones WebSocket
  private subscriptions: Subscription[] = [];

  constructor(
    private inventarioService: InventarioService,
    private firmaService: FirmaService,
    private websocketService: WebsocketService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarActas();
    this.conectarWebSocket();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  private conectarWebSocket(): void {
    // Unirse a la sala de actas
    this.websocketService.joinRoom('actas');

    // Suscribirse a eventos de actas
    this.subscriptions.push(
      this.websocketService.onActaCreated().subscribe((acta) => {
        console.log('📋 Nueva acta creada:', acta);
        this.cargarActas();
      }),
    );

    this.subscriptions.push(
      this.websocketService.onActaSigned().subscribe((data) => {
        console.log('📋 Acta firmada:', data);
        this.cargarActas();
        // Si el acta seleccionada es la que se firmó, recargar detalle
        if (this.actaSeleccionada && this.actaSeleccionada.id === data.actaId) {
          this.verDetalle(this.actaSeleccionada);
        }
      }),
    );

    this.subscriptions.push(
      this.websocketService.onActaRejected().subscribe((data) => {
        console.log('📋 Acta rechazada:', data);
        this.cargarActas();
        // Si el acta seleccionada es la que se rechazó, recargar detalle
        if (this.actaSeleccionada && this.actaSeleccionada.id === data.actaId) {
          this.verDetalle(this.actaSeleccionada);
        }
      }),
    );
  }

  cargarActas(): void {
    this.loading = true;
    this.inventarioService.obtenerActas().subscribe({
      next: (data) => {
        this.actas = data;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las actas';
        this.loading = false;
        console.error(err);
      },
    });
  }

  aplicarFiltros(): void {
    this.actasFiltradas = this.actas.filter((acta) => {
      const cumpleEstado =
        this.filtroEstado === 'todas' || acta.estado === this.filtroEstado;
      const cumpleBusqueda =
        !this.filtroBusqueda ||
        acta.numeroActa
          .toLowerCase()
          .includes(this.filtroBusqueda.toLowerCase()) ||
        acta.nombreReceptor
          .toLowerCase()
          .includes(this.filtroBusqueda.toLowerCase());

      return cumpleEstado && cumpleBusqueda;
    });
  }

  verDetalle(acta: ActaEntrega): void {
    this.loadingDetalle = true;
    this.inventarioService.obtenerActaPorId(acta.id!).subscribe({
      next: (data) => {
        this.actaSeleccionada = data;
        this.loadingDetalle = false;
      },
      error: (err) => {
        console.error('Error al cargar detalle:', err);
        this.loadingDetalle = false;
      },
    });
  }

  cerrarDetalle(): void {
    this.actaSeleccionada = null;
  }

  getEstadoClass(estado: string): string {
    const clases: { [key: string]: string } = {
      pendiente_firma: 'badge-pendiente_firma',
      activa: 'badge-activa',
      devuelta_parcial: 'badge-devuelta_parcial',
      completada: 'badge-completada',
      devuelta: 'badge-devuelta',
      rechazada: 'badge-rechazada',
    };
    return clases[estado] || 'badge-activa';
  }

  getEstadoIcon(estado: string): string {
    const iconos: { [key: string]: string } = {
      pendiente_firma: 'pi-envelope',
      activa: 'pi-clock',
      devuelta_parcial: 'pi-exclamation-circle',
      completada: 'pi-check-circle',
      devuelta: 'pi-check-circle',
      rechazada: 'pi-times-circle',
    };
    return iconos[estado] || 'pi-file';
  }

  getEstadoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      pendiente_firma: 'Pendiente Firma',
      activa: 'Activa',
      devuelta_parcial: 'Devolución Parcial',
      completada: 'Completada',
      devuelta: 'Devuelta',
      rechazada: 'Rechazada',
    };
    return labels[estado] || estado;
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
      red: 'pi-wifi',
      otro: 'pi-box',
    };
    return iconos[categoria?.toLowerCase()] || 'pi-box';
  }

  contarPendientes(acta: ActaEntrega): number {
    return acta.detalles?.filter((d) => !d.devuelto).length || 0;
  }

  // Devolución
  abrirModalDevolucion(acta: ActaEntrega): void {
    this.devolucionActa = acta;
    this.devoluciones = (acta.detalles || [])
      .filter((d) => !d.devuelto)
      .map((d) => ({
        detalle: d,
        devolver: true,
        estadoDevolucion: 'disponible',
        condicionDevolucion: d.condicionEntrega || 'bueno',
        observaciones: '',
      }));
    this.observacionesDevolucion = '';
    this.mostrarModalDevolucion = true;
  }

  cerrarModalDevolucion(): void {
    this.mostrarModalDevolucion = false;
    this.devolucionActa = null;
    this.devoluciones = [];
  }

  registrarDevolucion(): void {
    if (!this.devolucionActa) return;

    const devolucionesARegistrar = this.devoluciones
      .filter((d) => d.devolver)
      .map((d) => ({
        detalleId: d.detalle.id!,
        estadoDevolucion: d.estadoDevolucion as
          | 'disponible'
          | 'dañado'
          | 'perdido',
        condicionDevolucion: d.condicionDevolucion,
        observaciones: d.observaciones,
      }));

    if (devolucionesARegistrar.length === 0) {
      alert('Debe seleccionar al menos un dispositivo para devolver');
      return;
    }

    this.loadingDevolucion = true;

    const formData = new FormData();
    formData.append('devoluciones', JSON.stringify(devolucionesARegistrar));
    formData.append('observacionesDevolucion', this.observacionesDevolucion);
    formData.append('Uid', localStorage.getItem('userId') || '');

    this.inventarioService
      .registrarDevolucion(this.devolucionActa.id!, formData)
      .subscribe({
        next: () => {
          this.loadingDevolucion = false;
          this.cerrarModalDevolucion();
          this.cargarActas();
          alert('Devolución registrada exitosamente');
        },
        error: (err) => {
          this.loadingDevolucion = false;
          alert(err.error?.msg || 'Error al registrar la devolución');
        },
      });
  }

  irACrearActa(): void {
    this.router.navigate(['/crear-acta']);
  }

  irAInventario(): void {
    this.router.navigate(['/inventario']);
  }

  // Métodos para contar por estado (usados en el template)
  contarActivas(): number {
    return this.actas.filter((a) => a.estado === 'activa').length;
  }

  contarParciales(): number {
    return this.actas.filter((a) => a.estado === 'devuelta_parcial').length;
  }

  contarCompletas(): number {
    return this.actas.filter((a) => a.estado === 'devuelta_completa').length;
  }

  contarPendientesFirma(): number {
    return this.actas.filter((a) => a.estado === 'pendiente_firma').length;
  }

  contarRechazadas(): number {
    return this.actas.filter((a) => a.estado === 'rechazada').length;
  }

  // Reenviar correo de firma
  reenviarCorreo(acta: ActaEntrega): void {
    if (!acta.id) return;

    this.reenviandoCorreo[acta.id] = true;

    this.firmaService.reenviarCorreoFirma(acta.id).subscribe({
      next: (response) => {
        this.reenviandoCorreo[acta.id!] = false;
        alert(`Correo reenviado a ${acta.correoReceptor}`);
      },
      error: (err) => {
        this.reenviandoCorreo[acta.id!] = false;
        alert(err.error?.msg || 'Error al reenviar el correo');
      },
    });
  }

  // Enviar nuevo correo (para actas rechazadas que se corrigieron)
  enviarNuevoCorreo(acta: ActaEntrega): void {
    if (!acta.id) return;

    this.reenviandoCorreo[acta.id] = true;

    this.firmaService.enviarSolicitudFirma(acta.id).subscribe({
      next: (response) => {
        this.reenviandoCorreo[acta.id!] = false;
        alert(`Nuevo correo enviado a ${acta.correoReceptor}`);
        this.cargarActas(); // Recargar para ver el nuevo estado
      },
      error: (err) => {
        this.reenviandoCorreo[acta.id!] = false;
        alert(err.error?.msg || 'Error al enviar el correo');
      },
    });
  }
}
