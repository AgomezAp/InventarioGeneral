import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { ConsumibleService } from '../../services/consumible.service';
import { CrearConsumibleRequest } from '../../interfaces/mobiliario-consumible';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-agregar-consumible',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './agregar-consumible.component.html',
  styleUrl: './agregar-consumible.component.css',
})
export class AgregarConsumibleComponent implements OnInit {
  consumibleForm!: FormGroup;
  loading = false;
  tipoInventario: 'aseo' | 'papeleria' = 'aseo';

  // Configuración según tipo
  tituloTipo = 'Aseo';
  iconoTipo = 'fa-broom';
  colorTema = '#00acc1';

  // Categorías por tipo
  categoriasAseo = [
    'Limpieza General',
    'Desinfectantes',
    'Jabones y Detergentes',
    'Papel Higiénico',
    'Toallas de Papel',
    'Bolsas de Basura',
    'Ambientadores',
    'Implementos de Limpieza',
    'Otro',
  ];

  categoriasPapeleria = [
    'Papel',
    'Bolígrafos y Lápices',
    'Marcadores y Resaltadores',
    'Cuadernos y Libretas',
    'Carpetas y Archivadores',
    'Clips y Grapas',
    'Cintas y Pegamentos',
    'Correctores',
    'Sobres y Folders',
    'Post-it y Notas',
    'Tijeras y Cortadores',
    'Calculadoras',
    'Otro',
  ];

  categorias: string[] = [];

  // Unidades de medida
  unidadesMedida = [
    { value: 'unidad', label: 'Unidad' },
    { value: 'caja', label: 'Caja' },
    { value: 'paquete', label: 'Paquete' },
    { value: 'rollo', label: 'Rollo' },
    { value: 'galón', label: 'Galón' },
    { value: 'litro', label: 'Litro' },
    { value: 'kilogramo', label: 'Kilogramo' },
    { value: 'resma', label: 'Resma' },
    { value: 'docena', label: 'Docena' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private consumibleService: ConsumibleService,
  ) {}

  ngOnInit(): void {
    // Obtener tipo de la ruta
    this.route.params.subscribe((params) => {
      const tipo = params['tipo'];
      if (tipo === 'aseo' || tipo === 'papeleria') {
        this.tipoInventario = tipo;
        this.configurarTipo();
      }
    });

    this.initForm();
  }

  configurarTipo(): void {
    if (this.tipoInventario === 'aseo') {
      this.tituloTipo = 'Aseo';
      this.iconoTipo = 'fa-broom';
      this.colorTema = '#00acc1';
      this.categorias = this.categoriasAseo;
    } else {
      this.tituloTipo = 'Papelería';
      this.iconoTipo = 'fa-pen';
      this.colorTema = '#ffa726';
      this.categorias = this.categoriasPapeleria;
    }
  }

  initForm(): void {
    this.consumibleForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      categoria: ['', Validators.required],
      descripcion: [''],
      unidadMedida: ['unidad', Validators.required],
      stockActual: [0, [Validators.required, Validators.min(0)]],
      stockMinimo: [5, [Validators.required, Validators.min(0)]],
      stockMaximo: [100, [Validators.min(0)]],
      proveedor: [''],
      precioUnitario: [null, [Validators.min(0)]],
      ubicacionAlmacen: [''],
    });
  }

  onSubmit(): void {
    if (this.consumibleForm.invalid) {
      Object.keys(this.consumibleForm.controls).forEach((key) => {
        this.consumibleForm.get(key)?.markAsTouched();
      });
      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Por favor complete todos los campos requeridos',
      });
      return;
    }

    // Validar que stock máximo sea mayor que mínimo
    const stockMin = this.consumibleForm.get('stockMinimo')?.value;
    const stockMax = this.consumibleForm.get('stockMaximo')?.value;
    if (stockMax && stockMax < stockMin) {
      Swal.fire({
        icon: 'warning',
        title: 'Error de validación',
        text: 'El stock máximo debe ser mayor que el stock mínimo',
      });
      return;
    }

    this.loading = true;

    const consumibleData: CrearConsumibleRequest = {
      ...this.consumibleForm.value,
      tipoInventarioCodigo: this.tipoInventario,
    };

    this.consumibleService.crear(consumibleData).subscribe({
      next: (response) => {
        this.loading = false;
        Swal.fire({
          icon: 'success',
          title: '¡Artículo agregado!',
          text: `El artículo de ${this.tituloTipo.toLowerCase()} se ha registrado correctamente`,
          confirmButtonColor: this.colorTema,
        }).then(() => {
          this.router.navigate([`/inventario-${this.tipoInventario}`]);
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al crear consumible:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error?.msg || 'No se pudo registrar el artículo',
        });
      },
    });
  }
  getStockPercentage(): number {
    const actual = this.consumibleForm.get('stockActual')?.value || 0;
    const max = this.consumibleForm.get('stockMaximo')?.value || 100;
    return Math.min((actual / max) * 100, 100);
  }

  getStockMinPercentage(): number {
    const min = this.consumibleForm.get('stockMinimo')?.value || 0;
    const max = this.consumibleForm.get('stockMaximo')?.value || 100;
    return (min / max) * 100;
  }

  isStockLow(): boolean {
    const actual = this.consumibleForm.get('stockActual')?.value || 0;
    const min = this.consumibleForm.get('stockMinimo')?.value || 0;
    return actual <= min;
  }
  cancelar(): void {
    this.router.navigate([`/inventario-${this.tipoInventario}`]);
  }

  // Helpers para validación
  isFieldInvalid(field: string): boolean {
    const control = this.consumibleForm.get(field);
    return !!(control && control.invalid && control.touched);
  }

  getFieldError(field: string): string {
    const control = this.consumibleForm.get(field);
    if (control?.errors) {
      if (control.errors['required']) return 'Este campo es requerido';
      if (control.errors['minlength'])
        return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
      if (control.errors['min']) return 'El valor debe ser mayor o igual a 0';
    }
    return '';
  }
}
