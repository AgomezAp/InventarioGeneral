import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventarioService } from '../../services/inventario.service';
import { Dispositivo } from '../../interfaces/inventario';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-agregar-dispositivo',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './agregar-dispositivo.component.html',
  styleUrl: './agregar-dispositivo.component.css',
})
export class AgregarDispositivoComponent {
  dispositivo: Partial<Dispositivo> = {
    nombre: '',
    categoria: 'celular',
    marca: '',
    modelo: '',
    serial: '',
    imei: '',
    color: '',
    descripcion: '',
    condicion: 'bueno',
    ubicacion: 'Almacén Principal',
    observaciones: '',
  };
  hoveredCategoria: string = '';
  fotos: File[] = [];
  fotosPreview: string[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  isDragging: boolean = false;
  categorias = [
    { value: 'celular', label: 'Celular', icon: 'fa-mobile-alt' },
    { value: 'tablet', label: 'Tablet', icon: 'fa-tablet-alt' },
    { value: 'computador', label: 'Computador', icon: 'fa-laptop' },
    { value: 'cargador', label: 'Cargador', icon: 'fa-plug' },
    { value: 'accesorio', label: 'Accesorio', icon: 'fa-headphones' },
    { value: 'otro', label: 'Otro', icon: 'fa-box' },
  ];

  condiciones = [
    { value: 'nuevo', label: 'Nuevo' },
    { value: 'bueno', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'malo', label: 'Malo' },
  ];

  constructor(
    private inventarioService: InventarioService,
    private router: Router,
  ) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);

      // Validar que no excedan 10 fotos
      if (this.fotos.length + files.length > 10) {
        this.errorMessage = 'Máximo 10 fotos permitidas';
        return;
      }

      for (const file of files) {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
          this.errorMessage = 'Solo se permiten archivos de imagen';
          continue;
        }

        // Validar tamaño (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          this.errorMessage = 'Las imágenes no deben superar 10MB';
          continue;
        }

        this.fotos.push(file);

        // Crear preview
        const reader = new FileReader();
        reader.onload = (e) => {
          this.fotosPreview.push(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
      this.errorMessage = '';
    }
  }

  eliminarFoto(index: number): void {
    this.fotos.splice(index, 1);
    this.fotosPreview.splice(index, 1);
  }

  requiereIMEI(): boolean {
    return (
      this.dispositivo.categoria === 'celular' ||
      this.dispositivo.categoria === 'tablet'
    );
  }

  validarFormulario(): boolean {
    if (!this.dispositivo.nombre?.trim()) {
      this.errorMessage = 'El nombre es requerido';
      return false;
    }
    if (!this.dispositivo.categoria) {
      this.errorMessage = 'La categoría es requerida';
      return false;
    }
    return true;
  }

  guardarDispositivo(): void {
    if (!this.validarFormulario()) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formData = new FormData();

    // Agregar datos del dispositivo
    Object.keys(this.dispositivo).forEach((key) => {
      const value = (this.dispositivo as any)[key];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });

    // Agregar usuario
    formData.append('Uid', localStorage.getItem('userId') || '');
    formData.append('tipoUpload', 'dispositivos');

    // Agregar fotos
    this.fotos.forEach((foto) => {
      formData.append('fotos', foto);
    });

    this.inventarioService.registrarDispositivo(formData).subscribe({
      next: (response) => {
        this.successMessage = 'Dispositivo registrado exitosamente';
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/inventario']);
        }, 1500);
      },
      error: (err) => {
        this.errorMessage =
          err.error?.msg || 'Error al registrar el dispositivo';
        this.loading = false;
      },
    });
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
      teclado: 'pi-th-large',
      mouse: 'pi-external-link',
      audifonos: 'pi-volume-up',
      cargador: 'pi-bolt',
      accesorio: 'pi-box',
      otro: 'pi-ellipsis-h',
    };
    return iconos[categoria?.toLowerCase()] || 'pi-box';
  }
  cancelar(): void {
    this.router.navigate(['/inventario']);
  }
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files) {
      this.processFiles(files);
    }
  }

  // Helpers para condición
  getCondicionIcon(condicion: string): string {
    const icons: { [key: string]: string } = {
      nuevo: 'pi-star-fill',
      excelente: 'pi-check-circle',
      bueno: 'pi-thumbs-up',
      regular: 'pi-minus-circle',
      malo: 'pi-times-circle',
      dañado: 'pi-exclamation-triangle',
    };
    return icons[condicion] || 'pi-circle';
  }

  getCondicionLabel(condicion: string): string {
    const labels: { [key: string]: string } = {
      nuevo: 'Nuevo',
      excelente: 'Excelente',
      bueno: 'Bueno',
      regular: 'Regular',
      malo: 'Malo',
      dañado: 'Dañado',
    };
    return labels[condicion] || condicion;
  }

  getCategoriaLabel(categoria: string): string {
    const cat = this.categorias.find((c) => c.value === categoria);
    return cat ? cat.label : categoria;
  }
  processFiles(files: FileList): void {
    const filesArray = Array.from(files);

    // Validar que no excedan 10 fotos
    if (this.fotos.length + filesArray.length > 10) {
      this.errorMessage = 'Máximo 10 fotos permitidas';
      return;
    }

    for (const file of filesArray) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Solo se permiten archivos de imagen';
        continue;
      }

      // Validar tamaño (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        this.errorMessage = 'Las imágenes no deben superar 10MB';
        continue;
      }

      // Verificar si ya existe (evitar duplicados)
      const yaExiste = this.fotos.some(
        (f) => f.name === file.name && f.size === file.size,
      );

      if (yaExiste) {
        this.errorMessage = `"${file.name}" ya fue agregada`;
        continue;
      }

      this.fotos.push(file);

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.fotosPreview.push(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Limpiar mensaje de error si todo fue bien
    if (this.fotos.length > 0) {
      this.errorMessage = '';
    }
  }
}
