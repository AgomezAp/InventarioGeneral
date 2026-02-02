import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { ActaConsumibleService, ActaConsumible, DetalleActaConsumible } from '../../services/acta-consumible.service';
import { WebsocketService } from '../../services/websocket.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-actas-consumibles',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './actas-consumibles.component.html',
  styleUrl: './actas-consumibles.component.css'
})
export class ActasConsumiblesComponent implements OnInit, OnDestroy {
  // Tipo de inventario (aseo o papeleria)
  tipoInventario: 'aseo' | 'papeleria' = 'aseo';
  tituloTipo = 'Aseo';
  iconoTipo = 'fa-broom';
  colorTema = '#00bcd4';

  // Datos
  actas: ActaConsumible[] = [];
  actasFiltradas: ActaConsumible[] = [];
  actaSeleccionada: ActaConsumible | null = null;

  // Estados
  loading = false;
  loadingDetalle = false;
  error = '';

  // Filtros
  filtroEstado = 'todas';
  filtroBusqueda = '';

  // Reenvío de correo
  reenviandoCorreo: { [id: number]: boolean } = {};

  // Suscripciones WebSocket
  private subscriptions: Subscription[] = [];

  // Estados disponibles
  estados = ['pendiente_firma', 'firmada', 'rechazada'];

  constructor(
    private actaService: ActaConsumibleService,
    private websocketService: WebsocketService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Obtener tipo de la ruta
    this.route.data.subscribe(data => {
      const tipo = data['tipo'] || 'aseo';
      this.tipoInventario = tipo;
      this.configurarTipo();
      this.cargarActas();
      this.conectarWebSocket();
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.websocketService.leaveRoom('actas-consumibles');
  }

  configurarTipo(): void {
    if (this.tipoInventario === 'aseo') {
      this.tituloTipo = 'Aseo';
      this.iconoTipo = 'fa-broom';
      this.colorTema = '#00bcd4';
    } else {
      this.tituloTipo = 'Papelería';
      this.iconoTipo = 'fa-pen';
      this.colorTema = '#ffa726';
    }
  }

  private conectarWebSocket(): void {
    // Unirse a la sala de actas de consumibles
    this.websocketService.joinRoom('actas-consumibles');

    // Suscribirse a eventos de actas de consumibles específicos
    this.subscriptions.push(
      this.websocketService.onActaConsumibleCreated().subscribe(data => {
        console.log('📋 Nueva acta consumible creada:', data);
        this.cargarActas();
      })
    );

    this.subscriptions.push(
      this.websocketService.onActaConsumibleSigned().subscribe(data => {
        console.log('📋 Acta consumible firmada:', data);
        this.cargarActas();
        if (this.actaSeleccionada && this.actaSeleccionada.id === data.actaId) {
          this.verDetalle(this.actaSeleccionada);
        }
      })
    );

    this.subscriptions.push(
      this.websocketService.onActaConsumibleRejected().subscribe(data => {
        console.log('📋 Acta consumible rechazada:', data);
        this.cargarActas();
        if (this.actaSeleccionada && this.actaSeleccionada.id === data.actaId) {
          this.verDetalle(this.actaSeleccionada);
        }
      })
    );
  }

  cargarActas(): void {
    this.loading = true;
    this.actaService.obtenerActasPorTipo(this.tipoInventario).subscribe({
      next: (data) => {
        this.actas = data;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las actas';
        this.loading = false;
        console.error(err);
      }
    });
  }

  aplicarFiltros(): void {
    this.actasFiltradas = this.actas.filter(acta => {
      const cumpleEstado = this.filtroEstado === 'todas' || acta.estado === this.filtroEstado;
      const cumpleBusqueda = !this.filtroBusqueda ||
        acta.numeroActa.toLowerCase().includes(this.filtroBusqueda.toLowerCase()) ||
        acta.nombreReceptor.toLowerCase().includes(this.filtroBusqueda.toLowerCase()) ||
        (acta.areaReceptor || '').toLowerCase().includes(this.filtroBusqueda.toLowerCase());
      
      return cumpleEstado && cumpleBusqueda;
    });
  }

  verDetalle(acta: ActaConsumible): void {
    this.loadingDetalle = true;
    this.actaService.obtenerActaPorId(acta.id!).subscribe({
      next: (data) => {
        this.actaSeleccionada = data;
        this.loadingDetalle = false;
      },
      error: (err) => {
        console.error('Error al cargar detalle:', err);
        this.loadingDetalle = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar el detalle del acta',
          confirmButtonColor: this.colorTema
        });
      }
    });
  }

  cerrarDetalle(): void {
    this.actaSeleccionada = null;
  }

  getEstadoClass(estado: string): string {
    const clases: { [key: string]: string } = {
      'pendiente_firma': 'estado-pendiente',
      'firmada': 'estado-firmada',
      'rechazada': 'estado-rechazada'
    };
    return clases[estado] || '';
  }

  getEstadoIcon(estado: string): string {
    const iconos: { [key: string]: string } = {
      'pendiente_firma': 'fa-envelope',
      'firmada': 'fa-check-circle',
      'rechazada': 'fa-times-circle'
    };
    return iconos[estado] || 'fa-circle';
  }

  getEstadoLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'pendiente_firma': 'Pendiente de Firma',
      'firmada': 'Firmada',
      'rechazada': 'Rechazada'
    };
    return labels[estado] || estado;
  }

  getCategoriaIcon(categoria?: string): string {
    if (!categoria) return 'fa-box';
    
    const iconos: { [key: string]: string } = {
      'limpieza': 'fa-spray-can',
      'desinfectantes': 'fa-pump-soap',
      'jabones': 'fa-soap',
      'papel': 'fa-toilet-paper',
      'bolsas': 'fa-trash',
      'escritura': 'fa-pen',
      'archivo': 'fa-folder',
      'impresión': 'fa-print',
      'adhesivos': 'fa-tape'
    };
    
    const categoriaLower = categoria.toLowerCase();
    for (const [key, icon] of Object.entries(iconos)) {
      if (categoriaLower.includes(key)) return icon;
    }
    return 'fa-box';
  }

  getTotalArticulos(acta: ActaConsumible): number {
    return acta.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0;
  }

  // Contar por estado
  contarPendientesFirma(): number {
    return this.actas.filter(a => a.estado === 'pendiente_firma').length;
  }

  contarFirmadas(): number {
    return this.actas.filter(a => a.estado === 'firmada').length;
  }

  contarRechazadas(): number {
    return this.actas.filter(a => a.estado === 'rechazada').length;
  }

  // Reenviar correo
  reenviarCorreo(acta: ActaConsumible): void {
    if (!acta.id) return;
    
    this.reenviandoCorreo[acta.id] = true;
    
    this.actaService.reenviarCorreo(acta.id).subscribe({
      next: () => {
        this.reenviandoCorreo[acta.id!] = false;
        Swal.fire({
          icon: 'success',
          title: 'Correo reenviado',
          text: `Se ha reenviado el correo a ${acta.correoReceptor}`,
          toast: true,
          position: 'top-end',
          timer: 3000,
          showConfirmButton: false
        });
      },
      error: (err) => {
        this.reenviandoCorreo[acta.id!] = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error?.msg || 'Error al reenviar el correo',
          confirmButtonColor: this.colorTema
        });
      }
    });
  }

  irACrearActa(): void {
    this.router.navigate([`/crear-acta-consumible/${this.tipoInventario}`]);
  }

  irAInventario(): void {
    this.router.navigate([`/inventario-${this.tipoInventario}`]);
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
