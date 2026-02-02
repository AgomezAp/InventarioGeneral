import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { MaestroEdicion } from '../../interfaces/maestro';
import { MaestroService } from '../../services/maestro.service';
import { UserService } from '../../services/user.service';
import { SpinnerComponent } from '../../shared/spinner/spinner/spinner.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    NavbarComponent,
    CommonModule,
    FormsModule,
    FontAwesomeModule,
  ],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('600ms', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('600ms', style({ opacity: 0 }))]),
    ]),
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  maestros: any[] = [];
  filteredMaestros: any[] = [];
  filterFecha: string = '';
  filterImei: string = '';
  filterMonitor: string = '';
  filterRegion: string = '';
  filterMarca: string = '';
  userId: string = localStorage.getItem('userId') || '0';
  loading: boolean = true;
  currentPage: number = 1;
  itemsPerPage: number = 5;
  Math = Math;
  totalPages: number = 1;
  visiblePages: number[] = [];

  constructor(
    private userService: UserService,
    private router: Router,
    private toastr: ToastrService,
    private maestroService: MaestroService,
  ) {}

  ngOnInit(): void {
    this.obtenerMaestros();
  }

  obtenerMaestros(): void {
    this.userService.obtenerMaestrosPorIdUsuario(this.userId).subscribe(
      (data: any) => {
        if (data && Array.isArray(data.maestros)) {
          this.maestros = data.maestros;
          this.filteredMaestros = data.maestros;
          this.loading = false;
        } else {
          console.error('La respuesta no contiene un array de maestros', data);
        }
        this.loading = false;
      },
      (error) => {
        console.error('Error al obtener los maestros', error);
        this.loading = false;
      },
    );
  }
  hasActiveFilters(): boolean {
    return !!(
      this.filterFecha ||
      this.filterImei ||
      this.filterMonitor ||
      this.filterRegion ||
      this.filterMarca
    );
  }
  clearFilters(): void {
    this.filterFecha = '';
    this.filterImei = '';
    this.filterMonitor = '';
    this.filterRegion = '';
    this.filterMarca = '';
    this.applyFilters();
  }
  calculateTotalPages(): void {
    this.totalPages = Math.ceil(
      this.filteredMaestros.length / this.itemsPerPage,
    );
    this.updateVisiblePages();
  }

  updateVisiblePages(): void {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    this.visiblePages = pages;
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.updateVisiblePages();
  }

  firstPage(): void {
    this.currentPage = 1;
    this.updateVisiblePages();
  }

  lastPage(): void {
    this.currentPage = this.totalPages;
    this.updateVisiblePages();
  }

  viewFirma(firmaUrl: string): void {
    // Implementar modal o lightbox para ver firma
    window.open(firmaUrl, '_blank');
  }

  applyFilters(): void {
    this.filteredMaestros = this.maestros.filter((maestro) => {
      const matchesFecha = this.filterFecha
        ? maestro.fecha === this.filterFecha
        : true;
      const matchesImei = this.filterImei
        ? maestro.imei.includes(this.filterImei)
        : true;
      const matchesMonitor = this.filterMonitor
        ? maestro.nombre.includes(this.filterMonitor)
        : true;
      const matchesRegion = this.filterRegion
        ? maestro.region.includes(this.filterRegion)
        : true;
      const matchesMarca = this.filterMarca
        ? maestro.marca.includes(this.filterMarca)
        : true;
      return (
        matchesFecha &&
        matchesImei &&
        matchesMonitor &&
        matchesRegion &&
        matchesMarca
      );
    });
  }

  get paginatedMaestros(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredMaestros.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage * this.itemsPerPage < this.filteredMaestros.length) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  navigateToAddMaestro(): void {
    this.router.navigate(['/agregarMaestro']);
  }
  toggleEdit(maestro: MaestroEdicion): void {
    if (maestro.editing) {
      // Guardar cambios
      this.maestroService.actualizarMaestro(maestro.Mid, maestro).subscribe(
        (response) => {
          console.log('Maestro actualizado', response);
          maestro.editing = false;
        },
        (error) => {
          console.error('Error al actualizar el maestro', error);
        },
      );
    } else {
      // Habilitar edición
      maestro.editing = true;
    }
  }

  deleteMaestro(Mid: number): void {
    Swal.fire({
      title: '¿Estás segura?',
      text: 'Esta acción es irreparable',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, Entregar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/entrega-maestro', Mid]);
      }
    });
  }
}
