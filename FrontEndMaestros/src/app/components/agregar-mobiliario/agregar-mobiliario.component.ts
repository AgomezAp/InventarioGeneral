import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { MobiliarioService, CrearMobiliarioRequest } from '../../services/mobiliario.service';
import { ToastrService } from 'ngx-toastr';
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

  // Categorías predefinidas (basadas en stock)
  categorias = [
    { value: 'escritorio', label: 'Escritorio' },
    { value: 'silla', label: 'Silla' },
    { value: 'mesa', label: 'Mesa' },
    { value: 'archivador', label: 'Archivador' },
    { value: 'estante', label: 'Estante/Estantería' },
    { value: 'gabinete', label: 'Gabinete/Locker' },
    { value: 'electrodomesticos', label: 'Electrodomésticos' },
    { value: 'otro', label: 'Otro' }
  ];

  // Unidades de medida
  unidadesMedida = [
    { value: 'unidad', label: 'Unidad' },
    { value: 'pieza', label: 'Pieza' },
    { value: 'juego', label: 'Juego' },
    { value: 'par', label: 'Par' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private mobiliarioService: MobiliarioService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.mobiliarioForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      categoria: ['', Validators.required],
      descripcion: [''],
      unidadMedida: ['unidad', Validators.required],
      stockActual: [1, [Validators.required, Validators.min(0)]],
      ubicacionAlmacen: [''],
      proveedor: [''],
      precioUnitario: [null, [Validators.min(0)]],
      observaciones: ['']
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      // Validar tipo de archivo
      if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
        this.toastr.error('Solo se permiten imágenes (JPG, PNG, GIF)', 'Archivo no válido');
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.toastr.error('El tamaño máximo permitido es 5MB', 'Archivo muy grande');
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
      this.toastr.warning('Por favor complete todos los campos requeridos', 'Formulario incompleto');
      return;
    }

    this.loading = true;

    const formData = new FormData();
    const formValue = this.mobiliarioForm.value;
    
    // Agregar Uid del usuario
    const user = localStorage.getItem('user');
    const Uid = user ? JSON.parse(user).Uid : null;
    if (Uid) {
      formData.append('Uid', Uid);
    }

    // Agregar todos los campos del formulario
    Object.keys(formValue).forEach(key => {
      const value = formValue[key];
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });

    // Agregar foto si existe
    if (this.imagenFile) {
      formData.append('foto', this.imagenFile);
    }

    this.mobiliarioService.registrarMobiliario(formData).subscribe({
      next: (response) => {
        this.loading = false;
        Swal.fire({
          icon: 'success',
          title: '¡Mobiliario registrado!',
          text: `Se ha registrado "${formValue.nombre}" con ${formValue.stockActual} ${formValue.unidadMedida}(s) en inventario`,
          confirmButtonColor: '#2e7d32'
        }).then(() => {
          this.router.navigate(['/inventario-mobiliario']);
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al crear mobiliario:', error);
        this.toastr.error(error.error?.msg || 'No se pudo registrar el mobiliario', 'Error');
      }
    });
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
      if (control.errors['min']) return `El valor mínimo es ${control.errors['min'].min}`;
    }
    return '';
  }
}
