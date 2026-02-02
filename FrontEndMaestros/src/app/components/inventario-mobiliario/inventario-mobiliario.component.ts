import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MobiliarioService } from '../../services/mobiliario.service';
import { WebsocketService } from '../../services/websocket.service';
import { Mobiliario, EstadisticasMobiliario } from '../../interfaces/mobiliario-consumible';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-inventario-mobiliario',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './inventario-mobiliario.component.html',
  styleUrl: './inventario-mobiliario.component.css'
})
export class InventarioMobiliarioComponent implements OnInit, OnDestroy {
  mobiliario: Mobiliario[] = [];
  mobiliarioFiltrado: Mobiliario[] = [];
  estadisticas: EstadisticasMobiliario | null = null;
  loading = false;
  error = '';

  // Filtros
  filtroEstado = 'todos';
  filtroCategoria = 'todas';
  filtroBusqueda = '';

  // Paginación
  paginaActual = 1;
  itemsPorPagina = 10;

  // Opciones
  categorias = ['escritorio', 'silla', 'mesa', 'archivador', 'estante', 'otro'];
  estados = ['disponible', 'asignado', 'dañado', 'dado_de_baja'];

  // Suscripciones WebSocket
  private subscriptions: Subscription[] = [];

  constructor(
    private mobiliarioService: MobiliarioService,
    private websocketService: WebsocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarMobiliario();
    this.cargarEstadisticas();
    this.conectarWebSocket();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.websocketService.leaveRoom('mobiliario');
  }

  private conectarWebSocket(): void {
    this.websocketService.joinRoom('mobiliario');

    // Suscribirse a eventos de mobiliario para actualización en tiempo real
    this.subscriptions.push(
      this.websocketService.onMobiliarioCreated().subscribe((data) => {
        console.log('🪑 Nuevo mobiliario detectado, recargando lista...');
        this.cargarMobiliario();
        this.cargarEstadisticas();
      })
    );

    this.subscriptions.push(
      this.websocketService.onMobiliarioUpdated().subscribe((data) => {
        console.log('🪑 Mobiliario actualizado, recargando lista...');
        this.cargarMobiliario();
        this.cargarEstadisticas();
      })
    );

    this.subscriptions.push(
      this.websocketService.onMobiliarioDeleted().subscribe((data) => {
        console.log('🪑 Mobiliario eliminado, recargando lista...');
        this.cargarMobiliario();
        this.cargarEstadisticas();
      })
    );
  }

  cargarMobiliario(): void {
    this.loading = true;
    this.mobiliarioService.obtenerMobiliario().subscribe({
      next: (data) => {
        this.mobiliario = data;
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar el mobiliario';
        this.loading = false;
        console.error(err);
      }
    });
  }

  cargarEstadisticas(): void {
    this.mobiliarioService.obtenerEstadisticas().subscribe({
      next: (data) => {
        this.estadisticas = data;
      },
      error: (err) => {
        console.error('Error al cargar estadísticas:', err);
      }
    });
  }

  aplicarFiltros(): void {
    let resultado = [...this.mobiliario];

    if (this.filtroEstado !== 'todos') {
      resultado = resultado.filter(m => m.estado === this.filtroEstado);
    }

    if (this.filtroCategoria !== 'todas') {
      resultado = resultado.filter(m => m.categoria === this.filtroCategoria);
    }

    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase().trim();
      resultado = resultado.filter(m =>
        m.nombre.toLowerCase().includes(busqueda) ||
        m.marca?.toLowerCase().includes(busqueda) ||
        m.ubicacion?.toLowerCase().includes(busqueda) ||
        m.area?.toLowerCase().includes(busqueda)
      );
    }

    this.mobiliarioFiltrado = resultado;
    this.paginaActual = 1;
  }

  get mobiliarioPaginado(): Mobiliario[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.mobiliarioFiltrado.slice(inicio, fin);
  }

  get totalPaginas(): number {
    return Math.ceil(this.mobiliarioFiltrado.length / this.itemsPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  contarPorEstado(estado: string): number {
    return this.mobiliario.filter(m => m.estado === estado).length;
  }

  getCategoriaIcon(categoria: string): string {
    const iconos: { [key: string]: string } = {
      'escritorio': 'fa-desktop',
      'silla': 'fa-chair',
      'mesa': 'fa-table',
      'archivador': 'fa-cabinet-filing',
      'estante': 'fa-shelves',
      'otro': 'fa-box'
    };
    return iconos[categoria] || 'fa-box';
  }

  getEstadoClass(estado: string): string {
    const clases: { [key: string]: string } = {
      'disponible': 'badge-disponible',
      'asignado': 'badge-asignado',
      'dañado': 'badge-danado',
      'dado_de_baja': 'badge-baja'
    };
    return clases[estado] || 'badge-default';
  }

  irAAgregar(): void {
    this.router.navigate(['/agregar-mobiliario']);
  }

  irAEntrega(): void {
    this.router.navigate(['/crear-acta-mobiliario']);
  }

  verDetalle(id: number): void {
    this.router.navigate(['/mobiliario', id]);
  }

  verTrazabilidad(id: number): void {
    this.router.navigate(['/trazabilidad-mobiliario', id]);
  }
}
