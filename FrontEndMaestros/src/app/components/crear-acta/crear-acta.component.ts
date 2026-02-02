import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventarioService } from '../../services/inventario.service';
import { FirmaService } from '../../services/firma.service';
import { Dispositivo, CrearActaRequest } from '../../interfaces/inventario';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-crear-acta',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './crear-acta.component.html',
  styleUrls: ['./crear-acta.component.css'],
})
export class CrearActaComponent implements OnInit, OnDestroy {
  // Datos del receptor
  receptor = {
    nombre: '',
    cargo: '',
    correo: '',
  };

  observacionesEntrega = '';

  // Dispositivos
  dispositivosDisponibles: Dispositivo[] = [];
  dispositivosSeleccionados: {
    dispositivo: Dispositivo;
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

  constructor(
    private inventarioService: InventarioService,
    private firmaService: FirmaService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarDispositivosDisponibles();
  }

  ngOnDestroy(): void {
    // Limpieza si es necesario
  }

  cargarDispositivosDisponibles(): void {
    this.loadingDispositivos = true;
    this.inventarioService.obtenerDisponibles().subscribe({
      next: (data) => {
        this.dispositivosDisponibles = data;
        this.loadingDispositivos = false;
      },
      error: (err) => {
        console.error('Error al cargar dispositivos:', err);
        this.loadingDispositivos = false;
      },
    });
  }

  agregarDispositivo(dispositivo: Dispositivo): void {
    // Verificar que no esté ya seleccionado
    if (
      this.dispositivosSeleccionados.find(
        (d) => d.dispositivo.id === dispositivo.id,
      )
    ) {
      return;
    }

    this.dispositivosSeleccionados.push({
      dispositivo,
      condicion: dispositivo.condicion || 'bueno',
      observaciones: '',
      fotos: [],
      fotosPreview: [],
    });

    // Remover de disponibles
    this.dispositivosDisponibles = this.dispositivosDisponibles.filter(
      (d) => d.id !== dispositivo.id,
    );
  }

  quitarDispositivo(index: number): void {
    const item = this.dispositivosSeleccionados[index];
    this.dispositivosDisponibles.push(item.dispositivo);
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

  validarFormulario(): boolean {
    if (!this.receptor.nombre.trim()) {
      this.errorMessage = 'El nombre del receptor es requerido';
      return false;
    }
    if (!this.receptor.cargo.trim()) {
      this.errorMessage = 'El cargo del receptor es requerido';
      return false;
    }
    if (!this.receptor.correo.trim()) {
      this.errorMessage =
        'El correo del receptor es requerido para enviar la solicitud de firma';
      return false;
    }
    // Validar formato de correo
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.receptor.correo)) {
      this.errorMessage = 'El correo electrónico no es válido';
      return false;
    }
    if (this.dispositivosSeleccionados.length === 0) {
      this.errorMessage = 'Debe seleccionar al menos un dispositivo';
      return false;
    }
    return true;
  }

  crearActa(): void {
    if (!this.validarFormulario()) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = new FormData();

    // Datos del receptor (sin firma, se firmará por correo)
    formData.append('nombreReceptor', this.receptor.nombre);
    formData.append('cargoReceptor', this.receptor.cargo);
    formData.append('correoReceptor', this.receptor.correo);

    if (this.observacionesEntrega) {
      formData.append('observacionesEntrega', this.observacionesEntrega);
    }

    formData.append('Uid', localStorage.getItem('userId') || '');
    formData.append('tipoUpload', 'entregas');

    // Dispositivos
    const dispositivos = this.dispositivosSeleccionados.map((item) => ({
      dispositivoId: item.dispositivo.id,
      condicionEntrega: item.condicion,
      observaciones: item.observaciones,
    }));
    formData.append('dispositivos', JSON.stringify(dispositivos));

    // Fotos de cada dispositivo
    this.dispositivosSeleccionados.forEach((item) => {
      item.fotos.forEach((foto) => {
        formData.append(`fotos_${item.dispositivo.id}`, foto);
      });
    });

    this.inventarioService.crearActaEntrega(formData).subscribe({
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
          err.error?.msg || 'Error al crear el acta de entrega';
        this.loading = false;
      },
    });
  }

  enviarCorreoFirma(actaId: number): void {
    this.enviandoCorreo = true;

    this.firmaService.enviarSolicitudFirma(actaId).subscribe({
      next: (response) => {
        this.enviandoCorreo = false;
        this.successMessage = `Acta ${this.actaCreada.numeroActa} creada. Se ha enviado un correo a ${this.receptor.correo} para que firme digitalmente.`;

        setTimeout(() => {
          this.router.navigate(['/inventario']);
        }, 3000);
      },
      error: (err) => {
        this.enviandoCorreo = false;
        // El acta se creó pero falló el envío del correo
        this.successMessage = `Acta ${this.actaCreada.numeroActa} creada, pero hubo un error enviando el correo.`;
        this.errorMessage = 'Puede reenviar el correo desde la lista de actas.';

        setTimeout(() => {
          this.router.navigate(['/inventario']);
        }, 3000);
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/inventario']);
  }

  getCategoriaIcon(categoria: string): string {
    const iconos: { [key: string]: string } = {
      celular: 'pi-mobile',
      smartphone: 'pi-mobile',
      tablet: 'pi-tablet',
      laptop: 'pi-desktop',
      computador: 'pi-desktop',
      monitor: 'pi-desktop',
      impresora: 'pi-print',
      accesorio: 'pi-box',
    };
    return iconos[categoria?.toLowerCase()] || 'pi-box';
  }
}
