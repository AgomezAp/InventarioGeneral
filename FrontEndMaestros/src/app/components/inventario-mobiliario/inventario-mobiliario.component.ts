import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MobiliarioService } from '../../services/mobiliario.service';
import { WebsocketService } from '../../services/websocket.service';
import { Mobiliario, EstadisticasMobiliario } from '../../interfaces/mobiliario-consumible';
import { NavbarComponent } from '../navbar/navbar.component';
import { ToastrService } from 'ngx-toastr';

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
  filtroCategoria = 'todas';
  filtroBusqueda = '';

  // Paginación
  paginaActual = 1;
  itemsPorPagina = 10;

  // Opciones
  categorias = ['escritorio', 'silla', 'mesa', 'archivador', 'estante', 'gabinete', 'electrodomesticos', 'otro'];

  // Modal de movimiento de stock
  modalAbierto = false;
  tipoMovimiento: 'entrada' | 'salida' | 'ajuste' = 'entrada';
  mobiliarioSeleccionado: Mobiliario | null = null;
  cantidadMovimiento = 1;
  motivoMovimiento = '';
  descripcionMovimiento = '';
  numeroDocumento = '';

  // Modal de edición
  modalEdicionAbierto = false;
  mobiliarioEditando: Mobiliario | null = null;
  formularioEdicion = {
    nombre: '',
    categoria: '',
    descripcion: '',
    unidadMedida: '',
    ubicacionAlmacen: '',
    proveedor: '',
    precioUnitario: 0,
    observaciones: ''
  };

  private destroy$ = new Subject<void>();

  constructor(
    private mobiliarioService: MobiliarioService,
    private websocketService: WebsocketService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.cargarMobiliario();
    this.cargarEstadisticas();
    this.conectarWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.websocketService.leaveRoom('mobiliario');
  }

  private conectarWebSocket(): void {
    this.websocketService.joinRoom('mobiliario');

    this.websocketService.onMobiliarioCreated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('🪑 Nuevo mobiliario detectado');
        this.cargarMobiliario();
        this.cargarEstadisticas();
        this.toastr.info('Se ha registrado nuevo mobiliario', 'Inventario actualizado');
      });

    this.websocketService.onMobiliarioUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('🪑 Mobiliario actualizado');
        this.cargarMobiliario();
        this.cargarEstadisticas();
      });

    this.websocketService.onMobiliarioStockUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        console.log('📦 Stock actualizado:', data);
        // Actualizar localmente sin recargar toda la lista
        const index = this.mobiliario.findIndex(m => m.id === data.id);
        if (index !== -1) {
          this.mobiliario[index].stockActual = data.stockActual;
          this.aplicarFiltros();
        }
        this.cargarEstadisticas();
      });

    this.websocketService.onMobiliarioDeleted()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('🪑 Mobiliario dado de baja');
        this.cargarMobiliario();
        this.cargarEstadisticas();
        this.toastr.info('Un mobiliario ha sido dado de baja', 'Inventario actualizado');
      });
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
        this.toastr.error('Error al cargar el inventario', 'Error');
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

    if (this.filtroCategoria !== 'todas') {
      resultado = resultado.filter(m => m.categoria === this.filtroCategoria);
    }

    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase().trim();
      resultado = resultado.filter(m =>
        m.nombre.toLowerCase().includes(busqueda) ||
        m.descripcion?.toLowerCase().includes(busqueda) ||
        m.proveedor?.toLowerCase().includes(busqueda) ||
        m.ubicacionAlmacen?.toLowerCase().includes(busqueda)
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

  getCategoriaIcon(categoria: string): string {
    const iconos: { [key: string]: string } = {
      'escritorio': 'fa-desktop',
      'silla': 'fa-chair',
      'mesa': 'fa-table',
      'archivador': 'fa-cabinet-filing',
      'estante': 'fa-shelves',
      'gabinete': 'fa-door-closed',
      'electrodomesticos': 'fa-plug',
      'otro': 'fa-box'
    };
    return iconos[categoria] || 'fa-box';
  }

  getStockClass(mueble: Mobiliario): string {
    if (mueble.stockActual === 0) return 'stock-agotado';
    return 'stock-normal';
  }

  // ==================== MODAL DE MOVIMIENTOS ====================

  abrirModalMovimiento(mueble: Mobiliario, tipo: 'entrada' | 'salida' | 'ajuste'): void {
    this.mobiliarioSeleccionado = mueble;
    this.tipoMovimiento = tipo;
    this.cantidadMovimiento = tipo === 'ajuste' ? mueble.stockActual : 1;
    this.motivoMovimiento = '';
    this.descripcionMovimiento = '';
    this.numeroDocumento = '';
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
    this.mobiliarioSeleccionado = null;
  }

  ejecutarMovimiento(): void {
    if (!this.mobiliarioSeleccionado) return;

    const id = this.mobiliarioSeleccionado.id!;
    const Uid = this.getUserId();

    switch (this.tipoMovimiento) {
      case 'entrada':
        this.mobiliarioService.agregarStock(id, {
          cantidad: this.cantidadMovimiento,
          motivo: this.motivoMovimiento || 'compra',
          descripcion: this.descripcionMovimiento,
          numeroDocumento: this.numeroDocumento,
          Uid
        }).subscribe({
          next: (res) => {
            this.toastr.success(res.msg, 'Stock actualizado');
            this.cerrarModal();
            this.cargarEstadisticas();
          },
          error: (err) => {
            this.toastr.error(err.error?.msg || 'Error al agregar stock', 'Error');
          }
        });
        break;

      case 'salida':
        this.mobiliarioService.retirarStock(id, {
          cantidad: this.cantidadMovimiento,
          motivo: this.motivoMovimiento || 'entrega',
          descripcion: this.descripcionMovimiento,
          Uid
        }).subscribe({
          next: (res) => {
            this.toastr.success(res.msg, 'Stock actualizado');
            this.cerrarModal();
            this.cargarEstadisticas();
          },
          error: (err) => {
            this.toastr.error(err.error?.msg || 'Error al retirar stock', 'Error');
          }
        });
        break;

      case 'ajuste':
        this.mobiliarioService.ajustarStock(id, {
          nuevoStock: this.cantidadMovimiento,
          motivo: this.motivoMovimiento || 'ajuste_inventario',
          descripcion: this.descripcionMovimiento,
          Uid
        }).subscribe({
          next: (res) => {
            this.toastr.success(res.msg, 'Stock ajustado');
            this.cerrarModal();
            this.cargarEstadisticas();
          },
          error: (err) => {
            this.toastr.error(err.error?.msg || 'Error al ajustar stock', 'Error');
          }
        });
        break;
    }
  }

  private getUserId(): number {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).Uid : 0;
  }

  irAAgregar(): void {
    this.router.navigate(['/agregar-mobiliario']);
  }

  verHistorial(id: number): void {
    this.router.navigate(['/trazabilidad-mobiliario', id]);
  }

  // ==================== EDICIÓN DE MOBILIARIO ====================

  abrirModalEdicion(mueble: Mobiliario): void {
    this.mobiliarioEditando = { ...mueble };
    this.formularioEdicion = {
      nombre: mueble.nombre,
      categoria: mueble.categoria,
      descripcion: mueble.descripcion || '',
      unidadMedida: mueble.unidadMedida,
      ubicacionAlmacen: mueble.ubicacionAlmacen || '',
      proveedor: mueble.proveedor || '',
      precioUnitario: mueble.precioUnitario || 0,
      observaciones: mueble.observaciones || ''
    };
    this.modalEdicionAbierto = true;
  }

  cerrarModalEdicion(): void {
    this.modalEdicionAbierto = false;
    this.mobiliarioEditando = null;
  }

  guardarEdicion(): void {
    if (!this.mobiliarioEditando?.id || !this.formularioEdicion.nombre.trim()) {
      this.toastr.error('El nombre es obligatorio', 'Error');
      return;
    }

    this.loading = true;
    const datosActualizados = {
      nombre: this.formularioEdicion.nombre.trim(),
      categoria: this.formularioEdicion.categoria,
      descripcion: this.formularioEdicion.descripcion?.trim(),
      unidadMedida: this.formularioEdicion.unidadMedida,
      ubicacionAlmacen: this.formularioEdicion.ubicacionAlmacen?.trim(),
      proveedor: this.formularioEdicion.proveedor?.trim(),
      precioUnitario: this.formularioEdicion.precioUnitario,
      observaciones: this.formularioEdicion.observaciones?.trim()
    };

    this.mobiliarioService.actualizarMobiliario(this.mobiliarioEditando.id, datosActualizados)
      .subscribe({
        next: (response) => {
          this.toastr.success('Mobiliario actualizado exitosamente', 'Éxito');
          this.cerrarModalEdicion();
          this.cargarMobiliario();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error al actualizar mobiliario:', err);
          this.toastr.error('Error al actualizar el mobiliario', 'Error');
          this.loading = false;
        }
      });
  }
}
