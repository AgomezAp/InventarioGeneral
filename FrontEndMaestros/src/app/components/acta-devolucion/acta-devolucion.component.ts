import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import SignaturePad from 'signature_pad';
import { InventarioService } from '../../services/inventario.service';
import {
  ActaEntrega,
  Dispositivo,
  DetalleActa,
} from '../../interfaces/inventario';
import { environment } from '../../../environments/environment';
import { NavbarComponent } from '../navbar/navbar.component';

interface DevolucionItem {
  detalleId: number;
  dispositivoId: number;
  dispositivo: Dispositivo;
  condicionDevolucion: string;
  observaciones: string;
  fotos: File[];
  fotosPreview: string[];
  seleccionado: boolean;
}

@Component({
  selector: 'app-acta-devolucion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NavbarComponent],
  templateUrl: './acta-devolucion.component.html',
  styleUrls: ['./acta-devolucion.component.css'],
})
export class ActaDevolucionComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  // Lista de actas con dispositivos pendientes de devolución
  actasPendientes: ActaEntrega[] = [];
  actaSeleccionada: ActaEntrega | null = null;

  // Items de devolución
  itemsDevolucion: DevolucionItem[] = [];

  // Firma
  @ViewChild('firmaCanvas', { static: false })
  firmaCanvas!: ElementRef<HTMLCanvasElement>;
  signaturePad!: SignaturePad;
  firmaBase64 = '';

  // Datos adicionales
  observacionesGenerales = '';
  condiciones = ['nuevo', 'bueno', 'regular', 'malo'];

  // UI
  loading = false;
  guardando = false;
  pasoActual = 1; // 1: Seleccionar acta, 2: Seleccionar dispositivos, 3: Detalles y firma
  fechaHoy = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // API URL base
  apiUrl = environment.apiUrl;
  private resizeHandler = () => this.resizeCanvas();

  constructor(
    private inventarioService: InventarioService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarActasPendientes();
  }

  ngAfterViewInit(): void {
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
  }

  initSignaturePad(): void {
    setTimeout(() => {
      if (this.firmaCanvas?.nativeElement) {
        const canvas = this.firmaCanvas.nativeElement;
        const container = canvas.parentElement;
        const width = container ? container.clientWidth - 20 : 500;
        const height = 200;
        const dpr = window.devicePixelRatio || 1;

        // Establecer dimensiones CSS (tamaño visual)
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        // Establecer dimensiones internas (resolución real)
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        // Escalar contexto para HiDPI
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }

        this.signaturePad = new SignaturePad(canvas, {
          backgroundColor: 'rgb(255, 255, 255)',
          penColor: 'rgb(0, 0, 0)',
          minWidth: 1,
          maxWidth: 3,
        });

        this.signaturePad.clear();
      }
    }, 150);
  }

  resizeCanvas(): void {
    if (!this.firmaCanvas?.nativeElement || !this.signaturePad) return;

    const canvas = this.firmaCanvas.nativeElement;
    const container = canvas.parentElement;
    const width = container ? container.clientWidth - 20 : 500;
    const height = 200;
    const dpr = window.devicePixelRatio || 1;

    const data = this.signaturePad.toData();

    // Establecer dimensiones CSS (tamaño visual)
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    // Establecer dimensiones internas (resolución real)
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Escalar contexto para HiDPI
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    this.signaturePad.clear();
    if (data && data.length > 0) {
      this.signaturePad.fromData(data);
    }
  }

  cargarActasPendientes(): void {
    this.loading = true;
    this.inventarioService.obtenerActas().subscribe({
      next: (actas) => {
        // Filtrar actas que tienen dispositivos pendientes de devolución
        this.actasPendientes = actas.filter(
          (acta) =>
            acta.estado === 'activa' || acta.estado === 'devuelta_parcial',
        );
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar actas:', err);
        this.loading = false;
      },
    });
  }

  seleccionarActa(acta: ActaEntrega): void {
    this.actaSeleccionada = acta;

    // Cargar detalles de la acta
    this.inventarioService.obtenerActaPorId(acta.id!).subscribe({
      next: (actaDetallada) => {
        this.actaSeleccionada = actaDetallada;

        // Filtrar solo dispositivos no devueltos
        const detalles = actaDetallada.detalles || [];
        this.itemsDevolucion = detalles
          .filter((d: DetalleActa) => !d.devuelto)
          .map((d: DetalleActa) => ({
            detalleId: d.id!,
            dispositivoId: d.dispositivoId!,
            dispositivo: d.dispositivo!,
            condicionDevolucion: d.dispositivo?.condicion || 'bueno',
            observaciones: '',
            fotos: [],
            fotosPreview: [],
            seleccionado: true,
          }));

        this.pasoActual = 2;
      },
      error: (err) => {
        console.error('Error al cargar acta:', err);
        alert('Error al cargar los detalles del acta');
      },
    });
  }

  toggleSeleccion(item: DevolucionItem): void {
    item.seleccionado = !item.seleccionado;
  }

  seleccionarTodos(): void {
    this.itemsDevolucion.forEach((item) => (item.seleccionado = true));
  }

  deseleccionarTodos(): void {
    this.itemsDevolucion.forEach((item) => (item.seleccionado = false));
  }

  getItemsSeleccionados(): DevolucionItem[] {
    return this.itemsDevolucion.filter((item) => item.seleccionado);
  }

  // Manejo de fotos
  onFotosSelected(event: Event, item: DevolucionItem): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);

      files.forEach((file) => {
        if (file.type.startsWith('image/')) {
          item.fotos.push(file);

          const reader = new FileReader();
          reader.onload = (e) => {
            item.fotosPreview.push(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  eliminarFoto(item: DevolucionItem, index: number): void {
    item.fotos.splice(index, 1);
    item.fotosPreview.splice(index, 1);
  }

  // Navegación entre pasos
  siguientePaso(): void {
    if (this.pasoActual === 2) {
      if (this.getItemsSeleccionados().length === 0) {
        alert('Debe seleccionar al menos un dispositivo para devolver');
        return;
      }
      this.pasoActual = 3;
      setTimeout(() => this.initSignaturePad(), 100);
    }
  }

  pasoAnterior(): void {
    if (this.pasoActual > 1) {
      this.pasoActual--;
      if (this.pasoActual === 1) {
        this.actaSeleccionada = null;
        this.itemsDevolucion = [];
      }
    }
  }

  // Firma
  limpiarFirma(): void {
    this.signaturePad?.clear();
    this.firmaBase64 = '';
  }

  capturarFirma(): void {
    if (this.signaturePad && !this.signaturePad.isEmpty()) {
      this.firmaBase64 = this.signaturePad.toDataURL('image/png');
    }
  }

  // Registrar devolución
  registrarDevolucion(): void {
    this.capturarFirma();

    if (!this.firmaBase64) {
      alert('Debe firmar el acta de devolución');
      return;
    }

    const itemsSeleccionados = this.getItemsSeleccionados();
    if (itemsSeleccionados.length === 0) {
      alert('Debe seleccionar al menos un dispositivo');
      return;
    }

    this.guardando = true;

    // Preparar datos de devolución
    const devoluciones = itemsSeleccionados.map((item) => ({
      detalleId: item.detalleId,
      dispositivoId: item.dispositivoId,
      condicionDevolucion: item.condicionDevolucion,
      observaciones: item.observaciones,
      nuevoEstado: 'disponible', // Vuelve a estar disponible
    }));

    // Crear FormData para las fotos
    const formData = new FormData();
    formData.append('actaId', this.actaSeleccionada!.id!.toString());
    formData.append('devoluciones', JSON.stringify(devoluciones));
    formData.append('firmaDevolucion', this.firmaBase64);
    formData.append('observacionesDevolucion', this.observacionesGenerales);

    // Agregar fotos por dispositivo
    itemsSeleccionados.forEach((item) => {
      item.fotos.forEach((foto, index) => {
        formData.append(`fotos_${item.dispositivoId}`, foto);
      });
    });

    this.inventarioService
      .registrarDevolucion(this.actaSeleccionada!.id!, formData)
      .subscribe({
        next: (response) => {
          this.guardando = false;
          alert('Devolución registrada exitosamente');
          this.router.navigate(['/actas']);
        },
        error: (err) => {
          this.guardando = false;
          console.error('Error:', err);
          alert(err.error?.msg || 'Error al registrar la devolución');
        },
      });
  }

  // Helpers
  formatFecha(fecha: string | Date | undefined): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getEstadoActaClass(estado: string): string {
    switch (estado) {
      case 'activa':
        return 'badge-activa';
      case 'parcial':
        return 'badge-parcial';
      default:
        return '';
    }
  }

  getCondicionClass(condicion: string): string {
    switch (condicion?.toLowerCase()) {
      case 'bueno':
      case 'excelente':
        return 'badge-bueno';
      case 'regular':
        return 'badge-regular';
      case 'malo':
      case 'dañado':
        return 'badge-malo';
      default:
        return 'badge-regular';
    }
  }

getCategoriaIcon(categoria: string): string {
  switch (categoria?.toLowerCase()) {
    case 'celular':
    case 'smartphone':
      return 'pi-mobile';
    case 'tablet':
      return 'pi-tablet';
    case 'laptop':
    case 'computador':
      return 'pi-desktop';
    case 'accesorio':
      return 'pi-box';
    default:
      return 'pi-mobile';
  }
}

  contarDispositivosPendientes(acta: ActaEntrega): number {
    if (!acta.detalles) return 0;
    return acta.detalles.filter((d) => !d.devuelto).length;
  }

  volver(): void {
    this.router.navigate(['/actas']);
  }
}
