import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { ConsumibleService } from '../../services/consumible.service';
import { ActaConsumibleService, CrearActaConsumibleRequest } from '../../services/acta-consumible.service';
import { Consumible } from '../../interfaces/mobiliario-consumible';
import Swal from 'sweetalert2';

interface ArticuloSeleccionado {
  consumible: Consumible;
  cantidad: number;
  observaciones: string;
}

@Component({
  selector: 'app-crear-acta-consumible',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './crear-acta-consumible.component.html',
  styleUrl: './crear-acta-consumible.component.css'
})
export class CrearActaConsumibleComponent implements OnInit {
  // Tipo de inventario (aseo o papeleria)
  tipoInventario: 'aseo' | 'papeleria' = 'aseo';
  tituloTipo = 'Aseo';
  iconoTipo = 'fa-broom';
  colorTema = '#00acc1';

  // Datos del receptor
  receptor = {
    nombre: '',
    cargo: '',
    area: '',
    correo: ''
  };

  observacionesEntrega = '';

  // Artículos
  articulosDisponibles: Consumible[] = [];
  articulosFiltrados: Consumible[] = [];
  busquedaArticulo = '';
  articulosSeleccionados: ArticuloSeleccionado[] = [];

  loading = false;
  loadingArticulos = false;
  enviandoCorreo = false;
  errorMessage = '';
  successMessage = '';

  // Descripciones expandidas
  descripcionExpandida: Set<number> = new Set();

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
    'Cafetería',
    'Baños',
    'Áreas Comunes',
    'Otro'
  ];

  constructor(
    private consumibleService: ConsumibleService,
    private actaService: ActaConsumibleService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Obtener tipo de la ruta
    this.route.params.subscribe(params => {
      const tipo = params['tipo'];
      if (tipo === 'aseo' || tipo === 'papeleria') {
        this.tipoInventario = tipo;
        this.configurarTipo();
        this.cargarArticulosDisponibles();
      }
    });
  }

  configurarTipo(): void {
    if (this.tipoInventario === 'aseo') {
      this.tituloTipo = 'Aseo';
      this.iconoTipo = 'fa-broom';
      this.colorTema = '#00acc1';
    } else {
      this.tituloTipo = 'Papelería';
      this.iconoTipo = 'fa-pen';
      this.colorTema = '#ffa726';
    }
  }

  cargarArticulosDisponibles(): void {
    this.loadingArticulos = true;
    this.consumibleService.obtenerConsumiblesDisponibles().subscribe({
      next: (data) => {
        // Filtrar por tipo y que tengan stock
        this.articulosDisponibles = data.filter(c =>
          c.tipoInventario?.codigo === this.tipoInventario && c.stockActual > 0
        );
        this.articulosFiltrados = this.articulosDisponibles;
        this.loadingArticulos = false;
      },
      error: (err) => {
        console.error('Error al cargar artículos:', err);
        this.loadingArticulos = false;
        // Intentar cargar por tipo específico
        this.consumibleService.obtenerConsumiblesPorTipo(this.tipoInventario).subscribe({
          next: (data) => {
            this.articulosDisponibles = data.filter(c => c.stockActual > 0);
            this.articulosFiltrados = this.articulosDisponibles;
          },
          error: () => {
            this.errorMessage = 'Error al cargar los artículos disponibles';
          }
        });
      }
    });
  }

  filtrarArticulos(): void {
    const busqueda = this.busquedaArticulo.toLowerCase().trim();
    if (!busqueda) {
      this.articulosFiltrados = this.articulosDisponibles;
      return;
    }
    this.articulosFiltrados = this.articulosDisponibles.filter(a =>
      a.nombre?.toLowerCase().includes(busqueda) ||
      a.categoria?.toLowerCase().includes(busqueda) ||
      a.unidadMedida?.toLowerCase().includes(busqueda)
    );
  }

  agregarArticulo(consumible: Consumible): void {
    // Verificar que no esté ya seleccionado
    if (this.articulosSeleccionados.find(a => a.consumible.id === consumible.id)) {
      return;
    }

    this.articulosSeleccionados.push({
      consumible,
      cantidad: 1,
      observaciones: ''
    });

    // Remover de disponibles
    this.articulosDisponibles = this.articulosDisponibles.filter(a => a.id !== consumible.id);
    this.filtrarArticulos();
  }

  quitarArticulo(index: number): void {
    const articulo = this.articulosSeleccionados[index];
    this.articulosDisponibles.push(articulo.consumible);
    this.articulosSeleccionados.splice(index, 1);

    // Ordenar disponibles por nombre
    this.articulosDisponibles.sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.filtrarArticulos();
  }

  validarCantidad(index: number): void {
    const articulo = this.articulosSeleccionados[index];
    if (articulo.cantidad < 1) {
      articulo.cantidad = 1;
    }
    if (articulo.cantidad > articulo.consumible.stockActual) {
      articulo.cantidad = articulo.consumible.stockActual;
      Swal.fire({
        icon: 'warning',
        title: 'Stock limitado',
        text: `Solo hay ${articulo.consumible.stockActual} unidades disponibles`,
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false
      });
    }
  }

  getTotalArticulos(): number {
    return this.articulosSeleccionados.reduce((sum, a) => sum + a.cantidad, 0);
  }

  async crearActa(): Promise<void> {
    // Validaciones
    if (!this.receptor.nombre.trim()) {
      this.errorMessage = 'El nombre del receptor es requerido';
      return;
    }
    if (!this.receptor.cargo.trim()) {
      this.errorMessage = 'El cargo del receptor es requerido';
      return;
    }
    if (!this.receptor.correo.trim()) {
      this.errorMessage = 'El correo del receptor es requerido';
      return;
    }
    if (this.articulosSeleccionados.length === 0) {
      this.errorMessage = 'Debe seleccionar al menos un artículo';
      return;
    }

    // Validar cantidades
    for (const art of this.articulosSeleccionados) {
      if (art.cantidad > art.consumible.stockActual) {
        this.errorMessage = `Stock insuficiente para "${art.consumible.nombre}"`;
        return;
      }
    }

    this.errorMessage = '';
    this.loading = true;

    // Obtener Uid del localStorage
    const userStr = localStorage.getItem('user');
    const Uid = userStr ? JSON.parse(userStr).Uid : null;

    const request: CrearActaConsumibleRequest = {
      tipoInventarioCodigo: this.tipoInventario,
      nombreReceptor: this.receptor.nombre,
      cargoReceptor: this.receptor.cargo,
      areaReceptor: this.receptor.area,
      correoReceptor: this.receptor.correo,
      observaciones: this.observacionesEntrega,
      articulos: this.articulosSeleccionados.map(a => ({
        consumibleId: a.consumible.id!,
        cantidad: a.cantidad,
        observaciones: a.observaciones
      })),
      Uid
    };

    this.actaService.crearActa(request).subscribe({
      next: (response) => {
        this.loading = false;
        Swal.fire({
          icon: 'success',
          title: '¡Acta creada!',
          html: `
            <p>El acta <strong>${response.acta.numeroActa}</strong> ha sido creada.</p>
            <p>Se ha enviado un correo a <strong>${this.receptor.correo}</strong> para que firme digitalmente.</p>
          `,
          confirmButtonColor: this.colorTema
        }).then(() => {
          this.router.navigate([`/actas-${this.tipoInventario}`]);
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Error al crear acta:', error);
        this.errorMessage = error.error?.msg || 'Error al crear el acta';
      }
    });
  }

  cancelar(): void {
    this.router.navigate([`/inventario-${this.tipoInventario}`]);
  }

  toggleDescripcion(id: number): void {
    if (this.descripcionExpandida.has(id)) {
      this.descripcionExpandida.delete(id);
    } else {
      this.descripcionExpandida.add(id);
    }
  }

  getCategoriaIcon(categoria?: string): string {
    if (!categoria) return 'fa-box';
    
    const iconos: { [key: string]: string } = {
      'limpieza': 'fa-spray-can',
      'desinfectantes': 'fa-pump-soap',
      'jabones': 'fa-soap',
      'papel': 'fa-toilet-paper',
      'bolsas': 'fa-trash',
      'escritura': 'fa-pen',
      'archivo': 'fa-folder',
      'impresión': 'fa-print',
      'adhesivos': 'fa-tape'
    };
    
    const categoriaLower = categoria.toLowerCase();
    for (const [key, icon] of Object.entries(iconos)) {
      if (categoriaLower.includes(key)) return icon;
    }
    return 'fa-box';
  }
}
