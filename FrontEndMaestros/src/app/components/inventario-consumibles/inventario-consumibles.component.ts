import { Component, OnInit, OnDestroy, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, BehaviorSubject, merge } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, tap, switchMap, catchError, finalize } from 'rxjs/operators';
import { ConsumibleService } from '../../services/consumible.service';
import { MobiliarioService } from '../../services/mobiliario.service';
import { WebsocketService } from '../../services/websocket.service';
import { Consumible, EstadisticasConsumibles, TipoInventario } from '../../interfaces/mobiliario-consumible';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-inventario-consumibles',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './inventario-consumibles.component.html',
  styleUrl: './inventario-consumibles.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventarioConsumiblesComponent implements OnInit, OnDestroy {
  @Input() tipoInventarioCodigo: 'aseo' | 'papeleria' = 'aseo';
  
  tipoInventario: TipoInventario | null = null;
  consumibles: Consumible[] = [];
  consumiblesFiltrados: Consumible[] = [];
  estadisticas: EstadisticasConsumibles | null = null;
  alertasStock: Consumible[] = [];
  loading = false;
  error = '';

  // Filtros
  filtroCategoria = 'todas';
  filtroStockBajo = false;
  filtroBusqueda = '';

  // Subject para debounce en búsqueda
  private searchSubject$ = new Subject<string>();
  
  // Paginación
  paginaActual = 1;
  itemsPorPagina = 10;

  // Categorías según tipo
  categoriasAseo = ['limpieza', 'desinfección', 'higiene', 'ambientador', 'otro'];
  categoriasPapeleria = ['escritura', 'archivo', 'impresión', 'adhesivos', 'otro'];

  // Modal de stock
  mostrarModalStock = false;
  consumibleSeleccionado: Consumible | null = null;
  tipoOperacionStock: 'entrada' | 'salida' | 'ajuste' = 'entrada';
  cantidadStock = 0;
  motivoStock = '';
  descripcionStock = '';
  numeroDocumentoStock = '';

  // Modal de edición
  mostrarModalEdicion = false;
  consumibleEditando: Consumible | null = null;
  formularioEdicion = {
    nombre: '',
    categoria: '',
    descripcion: '',
    codigoInterno: '',
    unidadMedida: '',
    stockMinimo: 0,
    stockMaximo: 0,
    proveedor: '',
    precioUnitario: 0,
    observaciones: ''
  };

  // Subject de destrucción para takeUntil
  private destroy$ = new Subject<void>();
  
  // Estado de optimistic updates
  private pendingUpdates = new Map<number, Consumible>();

  constructor(
    private consumibleService: ConsumibleService,
    private mobiliarioService: MobiliarioService,
    private websocketService: WebsocketService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Detectar si viene por ruta
    this.route.data
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (data['tipoInventario']) {
          this.tipoInventarioCodigo = data['tipoInventario'];
        }
      });
    
    this.cargarTipoInventario();
    this.conectarWebSocket();
    this.suscribirseEventosWebSocket();
    this.configurarBusquedaDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.websocketService.leaveRoom('consumibles');
  }

  /**
   * Configurar debounce para el campo de búsqueda (300ms de delay)
   */
  private configurarBusquedaDebounce(): void {
    this.searchSubject$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(termino => {
        this.filtroBusqueda = termino;
        this.aplicarFiltros();
        this.cdr.markForCheck();
      });
  }

  /**
   * Método para el input de búsqueda - emite al subject con debounce
   */
  onBusquedaChange(termino: string): void {
    this.searchSubject$.next(termino);
  }

  private conectarWebSocket(): void {
    this.websocketService.joinRoom('consumibles');
  }

  /**
   * Suscribirse a eventos WebSocket para actualización en tiempo real
   * Usando takeUntil para limpiar automáticamente las suscripciones
   */
  private suscribirseEventosWebSocket(): void {
    // Cuando se crea un nuevo consumible
    this.websocketService.onConsumibleCreated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('🔄 Nuevo consumible detectado, recargando lista...');
        this.cargarConsumibles();
        this.cargarEstadisticas();
        this.cargarAlertas();
      });

    // Cuando se actualiza un consumible
    this.websocketService.onConsumibleUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('🔄 Consumible actualizado, recargando lista...');
        this.cargarConsumibles();
        this.cargarEstadisticas();
      });

    // Cuando se elimina un consumible
    this.websocketService.onConsumibleDeleted()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('🔄 Consumible eliminado, recargando lista...');
        this.cargarConsumibles();
        this.cargarEstadisticas();
        this.cargarAlertas();
      });

    // Cuando se actualiza el stock de un consumible
    this.websocketService.onConsumibleStockUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('📊 Stock actualizado:', data);
        // Actualizar solo el consumible afectado en la lista local (optimistic update)
        const index = this.consumibles.findIndex(c => c.id === data.id);
        if (index !== -1) {
          this.consumibles[index].stockActual = data.stockActual;
          this.aplicarFiltros();
          this.cdr.markForCheck(); // Notificar al change detector con OnPush
        }
        // Verificar si hay alerta de stock bajo
        if (data.alertaStockBajo) {
          this.cargarAlertas();
        }
        this.cargarEstadisticas();
      });

    // Suscribirse a actualizaciones de actas de consumibles
    this.websocketService.onActaConsumibleCreated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('📄 Acta consumible creada, actualizando stock...');
        this.cargarConsumibles();
        this.cargarEstadisticas();
        this.cargarAlertas();
      });

    this.websocketService.onActaConsumibleRejected()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('📄 Acta consumible rechazada, stock devuelto...');
        this.cargarConsumibles();
        this.cargarEstadisticas();
        this.cargarAlertas();
      });
  }

  cargarTipoInventario(): void {
    this.mobiliarioService.obtenerTipoPorCodigo(this.tipoInventarioCodigo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (tipo) => {
        this.tipoInventario = tipo;
        this.cargarConsumibles();
        this.cargarEstadisticas();
        this.cargarAlertas();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error = 'Error al cargar el tipo de inventario';
        console.error(err);
        this.cdr.markForCheck();
      }
    });
  }

  cargarConsumibles(): void {
    this.loading = true;
    this.cdr.markForCheck();
    
    this.consumibleService.obtenerConsumiblesPorTipo(this.tipoInventarioCodigo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.consumibles = data;
          this.aplicarFiltros();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = 'Error al cargar los productos';
          this.loading = false;
          console.error(err);
          this.cdr.markForCheck();
        }
      });
  }

  cargarEstadisticas(): void {
    if (!this.tipoInventario) return;
    
    this.consumibleService.obtenerEstadisticas(this.tipoInventario.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.estadisticas = data;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error al cargar estadísticas:', err);
        }
      });
  }

  cargarAlertas(): void {
    if (!this.tipoInventario) return;
    
    this.consumibleService.obtenerAlertasStock(this.tipoInventario.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.alertasStock = data;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error al cargar alertas:', err);
        }
      });
  }

  get categorias(): string[] {
    return this.tipoInventarioCodigo === 'aseo' ? this.categoriasAseo : this.categoriasPapeleria;
  }

  get tituloInventario(): string {
    return this.tipoInventarioCodigo === 'aseo' ? 'Inventario de Aseo' : 'Inventario de Papelería';
  }

  get iconoInventario(): string {
    return this.tipoInventarioCodigo === 'aseo' ? 'fa-broom' : 'fa-paperclip';
  }

  get colorPrincipal(): string {
    return this.tipoInventarioCodigo === 'aseo' ? '#0dcaf0' : '#ffc107';
  }

  aplicarFiltros(): void {
    let resultado = [...this.consumibles];

    if (this.filtroCategoria !== 'todas') {
      resultado = resultado.filter(c => c.categoria === this.filtroCategoria);
    }

    if (this.filtroStockBajo) {
      resultado = resultado.filter(c => c.stockActual <= c.stockMinimo);
    }

    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase().trim();
      resultado = resultado.filter(c =>
        c.nombre.toLowerCase().includes(busqueda) ||
        c.descripcion?.toLowerCase().includes(busqueda) ||
        c.proveedor?.toLowerCase().includes(busqueda) ||
        c.codigoInterno?.toLowerCase().includes(busqueda)
      );
    }

    this.consumiblesFiltrados = resultado;
    this.paginaActual = 1;
  }

  get consumiblesPaginados(): Consumible[] {
    const inicio = (this.paginaActual - 1) * this.itemsPorPagina;
    const fin = inicio + this.itemsPorPagina;
    return this.consumiblesFiltrados.slice(inicio, fin);
  }

  get totalPaginas(): number {
    return Math.ceil(this.consumiblesFiltrados.length / this.itemsPorPagina);
  }

  cambiarPagina(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginas) {
      this.paginaActual = pagina;
    }
  }

  esStockBajo(consumible: Consumible): boolean {
    return consumible.stockActual <= consumible.stockMinimo;
  }

  esSinStock(consumible: Consumible): boolean {
    return consumible.stockActual === 0;
  }

  calcularPorcentajeStock(consumible: Consumible): number {
    const maximo = consumible.stockMaximo || consumible.stockMinimo * 2;
    const porcentaje = (consumible.stockActual / maximo) * 100;
    return Math.min(porcentaje, 100);
  }

  getStockClass(consumible: Consumible): string {
    if (this.esSinStock(consumible)) return 'stock-agotado';
    if (this.esStockBajo(consumible)) return 'stock-bajo';
    return 'stock-normal';
  }

  formatearPrecio(precio: number | undefined): string {
    if (!precio) return '-';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
  }

  irAAgregar(): void {
    this.router.navigate([`/agregar-consumible/${this.tipoInventarioCodigo}`]);
  }

  irAEntrega(): void {
    this.router.navigate([`/crear-acta-consumible/${this.tipoInventarioCodigo}`]);
  }

  verDetalle(id: number): void {
    this.router.navigate(['/consumible', id]);
  }

  // Modal de gestión de stock
  abrirModalStock(consumible: Consumible, tipo: 'entrada' | 'salida' | 'ajuste'): void {
    this.consumibleSeleccionado = consumible;
    this.tipoOperacionStock = tipo;
    this.cantidadStock = 0;
    this.motivoStock = '';
    this.descripcionStock = '';
    this.numeroDocumentoStock = '';
    this.mostrarModalStock = true;
  }

  cerrarModalStock(): void {
    this.mostrarModalStock = false;
    this.consumibleSeleccionado = null;
  }

  ejecutarOperacionStock(): void {
    if (!this.consumibleSeleccionado || this.cantidadStock <= 0) return;

    const Uid = Number(localStorage.getItem('userId'));

    // Optimistic Update: guardar el estado actual antes de la operación
    const consumibleOriginal = { ...this.consumibleSeleccionado };
    let stockEstimado = this.consumibleSeleccionado.stockActual;

    if (this.tipoOperacionStock === 'entrada') {
      stockEstimado += this.cantidadStock;
    } else if (this.tipoOperacionStock === 'salida') {
      stockEstimado -= this.cantidadStock;
    } else {
      stockEstimado = this.cantidadStock;
    }

    // Aplicar optimistic update a la UI
    const index = this.consumibles.findIndex(c => c.id === this.consumibleSeleccionado?.id);
    if (index !== -1) {
      this.consumibles[index].stockActual = stockEstimado;
      this.aplicarFiltros();
      this.cdr.markForCheck();
    }

    if (this.tipoOperacionStock === 'entrada') {
      this.consumibleService.agregarStock(this.consumibleSeleccionado.id!, {
        cantidad: this.cantidadStock,
        motivo: this.motivoStock || 'compra',
        descripcion: this.descripcionStock,
        numeroDocumento: this.numeroDocumentoStock,
        Uid
      }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.cerrarModalStock();
          this.cargarEstadisticas();
          this.cargarAlertas();
        },
        error: (err) => {
          // Revertir optimistic update si falla
          if (index !== -1) {
            this.consumibles[index].stockActual = consumibleOriginal.stockActual;
            this.aplicarFiltros();
            this.cdr.markForCheck();
          }
        }
      });
    } else if (this.tipoOperacionStock === 'salida') {
      this.consumibleService.retirarStock(this.consumibleSeleccionado.id!, {
        cantidad: this.cantidadStock,
        motivo: this.motivoStock || 'entrega',
        descripcion: this.descripcionStock,
        Uid
      }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.cerrarModalStock();
          this.cargarEstadisticas();
          this.cargarAlertas();
        },
        error: (err) => {
          // Revertir optimistic update si falla
          if (index !== -1) {
            this.consumibles[index].stockActual = consumibleOriginal.stockActual;
            this.aplicarFiltros();
            this.cdr.markForCheck();
          }
        }
      });
    } else if (this.tipoOperacionStock === 'ajuste') {
      this.consumibleService.ajustarStock(this.consumibleSeleccionado.id!, {
        nuevoStock: this.cantidadStock,
        motivo: this.motivoStock || 'ajuste_inventario',
        descripcion: this.descripcionStock,
        Uid
      }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.cerrarModalStock();
          this.cargarEstadisticas();
          this.cargarAlertas();
        },
        error: (err) => {
          // Revertir optimistic update si falla
          if (index !== -1) {
            this.consumibles[index].stockActual = consumibleOriginal.stockActual;
            this.aplicarFiltros();
            this.cdr.markForCheck();
          }
        }
      });
    }
  }

  verHistorial(id: number): void {
    this.router.navigate(['/historial-consumible', id]);
  }

  // ==================== EDICIÓN DE CONSUMIBLE ====================

  abrirModalEdicion(consumible: Consumible): void {
    this.consumibleEditando = { ...consumible };
    this.formularioEdicion = {
      nombre: consumible.nombre,
      categoria: consumible.categoria || '',
      descripcion: consumible.descripcion || '',
      codigoInterno: consumible.codigoInterno || '',
      unidadMedida: consumible.unidadMedida,
      stockMinimo: consumible.stockMinimo,
      stockMaximo: consumible.stockMaximo || 0,
      proveedor: consumible.proveedor || '',
      precioUnitario: consumible.precioUnitario || 0,
      observaciones: consumible.observaciones || ''
    };
    this.mostrarModalEdicion = true;
  }

  cerrarModalEdicion(): void {
    this.mostrarModalEdicion = false;
    this.consumibleEditando = null;
  }

  guardarEdicion(): void {
    if (!this.consumibleEditando?.id || !this.formularioEdicion.nombre.trim()) {
      return;
    }

    this.loading = true;
    const datosActualizados = {
      nombre: this.formularioEdicion.nombre.trim(),
      categoria: this.formularioEdicion.categoria,
      descripcion: this.formularioEdicion.descripcion?.trim(),
      codigoInterno: this.formularioEdicion.codigoInterno?.trim(),
      unidadMedida: this.formularioEdicion.unidadMedida,
      stockMinimo: this.formularioEdicion.stockMinimo,
      stockMaximo: this.formularioEdicion.stockMaximo || undefined,
      proveedor: this.formularioEdicion.proveedor?.trim(),
      precioUnitario: this.formularioEdicion.precioUnitario,
      observaciones: this.formularioEdicion.observaciones?.trim()
    };

    this.consumibleService.actualizarConsumible(this.consumibleEditando.id, datosActualizados)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.cerrarModalEdicion();
          this.cargarConsumibles();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error al actualizar consumible:', err);
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }
}
