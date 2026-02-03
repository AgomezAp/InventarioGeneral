import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  DevolucionService,
  DispositivoEntregado,
} from '../../services/devolucion.service';
import SignaturePad from 'signature_pad';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-crear-devolucion',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './crear-devolucion.component.html',
  styleUrls: ['./crear-devolucion.component.css'],
})
export class CrearDevolucionComponent implements OnInit, AfterViewInit {
  @ViewChild('signatureCanvasReceptor')
  signatureCanvasReceptor!: ElementRef<HTMLCanvasElement>;
  private signaturePadReceptor!: SignaturePad;

  // Datos de quien devuelve (el empleado)
  entrega = {
    nombre: '',
    cargo: '',
    correo: '', // Correo del empleado para enviar solicitud de firma
  };

  // Datos de quien recibe (sistemas)
  receptor = {
    nombre: '',
    cargo: 'Área de Sistemas',
    correo: '', // Correo opcional para copia
  };

  observaciones = '';

  // Dispositivos
  dispositivosEntregados: DispositivoEntregado[] = [];
  dispositivosSeleccionados: {
    dispositivo: DispositivoEntregado;
    estadoDevolucion: string;
    condicion: string;
    observaciones: string;
    fotos: File[];
    fotosPreview: string[];
  }[] = [];

  loading = false;
  loadingDispositivos = false;
  errorMessage = '';
  successMessage = '';

  // Estado del proceso
  actaCreada: any = null;
  enviandoCorreo = false;

  condiciones = [
    { value: 'nuevo', label: 'Nuevo' },
    { value: 'bueno', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'malo', label: 'Malo' },
  ];

  estadosDevolucion = [
    { value: 'disponible', label: 'Disponible (funcional)' },
    { value: 'dañado', label: 'Dañado' },
    { value: 'perdido', label: 'Perdido' },
  ];

  constructor(
    private devolucionService: DevolucionService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarDispositivosEntregados();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.inicializarSignaturePad(), 500);
  }

  inicializarSignaturePad(): void {
    if (
      this.signatureCanvasReceptor &&
      this.signatureCanvasReceptor.nativeElement
    ) {
      const canvas = this.signatureCanvasReceptor.nativeElement;
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.offsetWidth - 20;
        canvas.height = 150;
      }
      this.signaturePadReceptor = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
      });
    }
  }

  limpiarFirmaReceptor(): void {
    if (this.signaturePadReceptor) {
      this.signaturePadReceptor.clear();
    }
  }

  cargarDispositivosEntregados(): void {
    this.loadingDispositivos = true;
    this.devolucionService.obtenerDispositivosEntregados().subscribe({
      next: (data) => {
        this.dispositivosEntregados = data;
        this.loadingDispositivos = false;
      },
      error: (err) => {
        console.error('Error al cargar dispositivos:', err);
        this.errorMessage = 'Error al cargar los dispositivos entregados';
        this.loadingDispositivos = false;
      },
    });
  }

  agregarDispositivo(dispositivo: DispositivoEntregado): void {
    if (
      this.dispositivosSeleccionados.find(
        (d) => d.dispositivo.id === dispositivo.id,
      )
    ) {
      return;
    }

    this.dispositivosSeleccionados.push({
      dispositivo,
      estadoDevolucion: 'disponible',
      condicion: dispositivo.condicion || 'bueno',
      observaciones: '',
      fotos: [],
      fotosPreview: [],
    });

    this.dispositivosEntregados = this.dispositivosEntregados.filter(
      (d) => d.id !== dispositivo.id,
    );
  }

  quitarDispositivo(index: number): void {
    const item = this.dispositivosSeleccionados[index];
    this.dispositivosEntregados.push(item.dispositivo);
    this.dispositivosSeleccionados.splice(index, 1);
  }

  onFotosSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      const item = this.dispositivosSeleccionados[index];

      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 10 * 1024 * 1024) continue;
        if (item.fotos.length >= 5) break;

        item.fotos.push(file);

        const reader = new FileReader();
        reader.onload = (e) => {
          item.fotosPreview.push(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  eliminarFoto(itemIndex: number, fotoIndex: number): void {
    const item = this.dispositivosSeleccionados[itemIndex];
    item.fotos.splice(fotoIndex, 1);
    item.fotosPreview.splice(fotoIndex, 1);
  }

  getCategoriaIcon(categoria: string): string {
    const iconos: { [key: string]: string } = {
      celular: 'fa-mobile-alt',
      tablet: 'fa-tablet-alt',
      computador: 'fa-laptop',
      cargador: 'fa-plug',
      accesorio: 'fa-headphones',
      otro: 'fa-box',
    };
    return iconos[categoria] || 'fa-box';
  }

  validarFormulario(): boolean {
    this.errorMessage = '';

    if (!this.entrega.nombre.trim()) {
      this.errorMessage = 'El nombre de quien devuelve es requerido';
      return false;
    }
    if (!this.entrega.cargo.trim()) {
      this.errorMessage = 'El cargo de quien devuelve es requerido';
      return false;
    }
    if (!this.entrega.correo.trim()) {
      this.errorMessage =
        'El correo de quien devuelve es requerido para enviar la solicitud de firma';
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.entrega.correo)) {
      this.errorMessage =
        'El correo electrónico de quien devuelve no es válido';
      return false;
    }
    if (!this.receptor.nombre.trim()) {
      this.errorMessage = 'El nombre de quien recibe es requerido';
      return false;
    }
    if (this.dispositivosSeleccionados.length === 0) {
      this.errorMessage =
        'Debe seleccionar al menos un dispositivo para devolver';
      return false;
    }
    // Validar firma del receptor (sistemas)
    if (!this.signaturePadReceptor || this.signaturePadReceptor.isEmpty()) {
      this.errorMessage = 'Debe firmar como receptor de los equipos (Sistemas)';
      return false;
    }
    return true;
  }

  crearActaDevolucion(): void {
    if (!this.validarFormulario()) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = new FormData();

    // Datos de quien devuelve (empleado - recibirá el correo para firmar)
    formData.append('nombreEntrega', this.entrega.nombre);
    formData.append('cargoEntrega', this.entrega.cargo);
    formData.append('correoEntrega', this.entrega.correo);

    // Datos de quien recibe (sistemas - firma al crear)
    formData.append('nombreReceptor', this.receptor.nombre);
    formData.append('cargoReceptor', this.receptor.cargo);
    if (this.receptor.correo) {
      formData.append('correoReceptor', this.receptor.correo);
    }

    // Firma del receptor (sistemas)
    const firmaReceptor = this.signaturePadReceptor.toDataURL('image/png');
    formData.append('firmaReceptor', firmaReceptor);

    if (this.observaciones) {
      formData.append('observaciones', this.observaciones);
    }

    formData.append('Uid', localStorage.getItem('userId') || '');

    // Dispositivos
    const dispositivos = this.dispositivosSeleccionados.map((item) => ({
      dispositivoId: item.dispositivo.id,
      estadoDevolucion: item.estadoDevolucion,
      condicionDevolucion: item.condicion,
      observaciones: item.observaciones,
    }));
    formData.append('dispositivos', JSON.stringify(dispositivos));

    // Fotos de cada dispositivo
    this.dispositivosSeleccionados.forEach((item) => {
      item.fotos.forEach((foto) => {
        formData.append(`fotos_${item.dispositivo.id}`, foto);
      });
    });

    this.devolucionService.crearActaDevolucion(formData).subscribe({
      next: (response) => {
        this.actaCreada = response.acta;
        this.loading = false;

        // Enviar correo de firma automáticamente
        if (response.acta.id) {
          this.enviarCorreoFirma(response.acta.id);
        }
      },
      error: (err) => {
        this.errorMessage =
          err.error?.msg || 'Error al crear el acta de devolución';
        this.loading = false;
      },
    });
  }

  enviarCorreoFirma(actaId: number): void {
    this.enviandoCorreo = true;

    this.devolucionService.enviarSolicitudFirma(actaId).subscribe({
      next: (response) => {
        this.enviandoCorreo = false;
        this.successMessage = `Acta ${this.actaCreada.numeroActa} creada. Se ha enviado un correo a ${this.entrega.correo} para que ${this.entrega.nombre} firme digitalmente.`;

        setTimeout(() => {
          this.router.navigate(['/actas-devolucion']);
        }, 3000);
      },
      error: (err) => {
        this.enviandoCorreo = false;
        this.successMessage = `Acta ${this.actaCreada.numeroActa} creada, pero hubo un error enviando el correo.`;
        this.errorMessage = 'Puede reenviar el correo desde la lista de actas.';

        setTimeout(() => {
          this.router.navigate(['/actas-devolucion']);
        }, 3000);
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/actas-devolucion']);
  }
  get firmaReceptorData(): boolean {
    return this.signaturePadReceptor && !this.signaturePadReceptor.isEmpty();
  }
}
