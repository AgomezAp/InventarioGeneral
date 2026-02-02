import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { MobiliarioService } from '../../services/mobiliario.service';
import { CrearMobiliarioRequest } from '../../interfaces/mobiliario-consumible';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-agregar-mobiliario',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './agregar-mobiliario.component.html',
  styleUrl: './agregar-mobiliario.component.css'
})
export class AgregarMobiliarioComponent implements OnInit {
  mobiliarioForm!: FormGroup;
  loading = false;
  imagenPreview: string | null = null;
  imagenFile: File | null = null;

  // Categorías predefinidas
  categorias = [
    'Escritorio',
    'Silla',
    'Mesa',
    'Estantería',
    'Archivador',
    'Sofá',
    'Sillón',
    'Gabinete',
    'Locker',
    'Pizarra',
    'Mesa de juntas',
    'Otro'
  ];

  // Estados posibles
  estados = [
    { value: 'disponible', label: 'Disponible' },
    { value: 'asignado', label: 'Asignado' },
    { value: 'en_reparacion', label: 'En Reparación' },
    { value: 'dado_de_baja', label: 'Dado de Baja' }
  ];

  // Condiciones
  condiciones = [
    { value: 'nuevo', label: 'Nuevo' },
    { value: 'bueno', label: 'Bueno' },
    { value: 'regular', label: 'Regular' },
    { value: 'malo', label: 'Malo' }
  ];

  // Áreas predefinidas
  areas = [
    'Administración',
    'Contabilidad',
    'Recursos Humanos',
    'Sistemas',
    'Gerencia',
    'Recepción',
    'Sala de Juntas',
    'Almacén',
    'Producción',
    'Ventas',
    'Marketing',
    'Bodega',
    'Otro'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private mobiliarioService: MobiliarioService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.mobiliarioForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      categoria: ['', Validators.required],
      marca: [''],
      dimensiones: [''],
      material: [''],
      color: [''],
      estado: ['disponible', Validators.required],
      condicion: ['nuevo', Validators.required],
      ubicacion: ['', Validators.required],
      area: ['', Validators.required],
      observaciones: ['']
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validar tipo de archivo
      if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
        Swal.fire({
          icon: 'error',
          title: 'Archivo no válido',
          text: 'Solo se permiten imágenes (JPG, PNG, GIF)'
        });
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'Archivo muy grande',
          text: 'El tamaño máximo permitido es 5MB'
        });
        return;
      }

      this.imagenFile = file;
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = () => {
        this.imagenPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.imagenPreview = null;
    this.imagenFile = null;
  }

  onSubmit(): void {
    if (this.mobiliarioForm.invalid) {
      Object.keys(this.mobiliarioForm.controls).forEach(key => {
        this.mobiliarioForm.get(key)?.markAsTouched();
      });
      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Por favor complete todos los campos requeridos'
      });
      return;
    }

    this.loading = true;

    const mobiliarioData: CrearMobiliarioRequest = {
      ...this.mobiliarioForm.value
    };

    // Si hay imagen, usar FormData
    if (this.imagenFile) {
      const formData = new FormData();
      Object.keys(mobiliarioData).forEach(key => {
        const value = (mobiliarioData as any)[key];
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value);
        }
      });
      formData.append('foto', this.imagenFile);

      this.mobiliarioService.crearConFoto(formData).subscribe({
        next: (response) => {
          this.loading = false;
          Swal.fire({
            icon: 'success',
            title: '¡Mobiliario agregado!',
            text: 'El mobiliario se ha registrado correctamente',
            confirmButtonColor: '#2e7d32'
          }).then(() => {
            this.router.navigate(['/inventario-mobiliario']);
          });
        },
        error: (error) => {
          this.loading = false;
          console.error('Error al crear mobiliario:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.msg || 'No se pudo registrar el mobiliario'
          });
        }
      });
    } else {
      this.mobiliarioService.crear(mobiliarioData).subscribe({
        next: (response) => {
          this.loading = false;
          Swal.fire({
            icon: 'success',
            title: '¡Mobiliario agregado!',
            text: 'El mobiliario se ha registrado correctamente',
            confirmButtonColor: '#2e7d32'
          }).then(() => {
            this.router.navigate(['/inventario-mobiliario']);
          });
        },
        error: (error) => {
          this.loading = false;
          console.error('Error al crear mobiliario:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error?.msg || 'No se pudo registrar el mobiliario'
          });
        }
      });
    }
  }

  cancelar(): void {
    this.router.navigate(['/inventario-mobiliario']);
  }

  // Helpers para validación
  isFieldInvalid(field: string): boolean {
    const control = this.mobiliarioForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  getFieldError(field: string): string {
    const control = this.mobiliarioForm.get(field);
    if (control?.errors) {
      if (control.errors['required']) return 'Este campo es requerido';
      if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }
}
