import {
  animate,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { Maestro } from '../../interfaces/maestro';
import { MaestroService } from '../../services/maestro.service';
import { WebsocketService } from '../../services/websocket.service';
import {
  SpinnerComponent,
} from '../../shared/spinner/spinner/spinner.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-historico-maestros',
  imports: [
    NavbarComponent,
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    SpinnerComponent,
  ],
  templateUrl: './historico-maestros.component.html',
  styleUrl: './historico-maestros.component.css',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('500ms', style({ opacity: 0 }))]),
    ]),
  ],
})
export class HistoricoMaestrosComponent implements OnInit, OnDestroy {
  maestros: any[] = [];
  loading: boolean = true;
  currentPage: number = 1;
  itemsPerPage: number = 5;
  filtroEstado: string = '';
  filtroPersona: string = '';
  filtroRegion: string = '';
  filtroImei: string = '';
  filtroFechaEntrega: string = '';
  filtroFechaRecibido: string = '';
  totalMaestrosFiltrados: number = 0;

  // Suscripciones WebSocket
  private subscriptions: Subscription[] = [];

  constructor(
    private maestroService: MaestroService,
    private websocketService: WebsocketService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.obtenerHistoricoMaestros();
    this.actualizarTotalMaestrosFiltrados();
    this.conectarWebSocket();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.websocketService.leaveRoom('maestros');
  }

  private conectarWebSocket(): void {
    this.websocketService.joinRoom('maestros');

    // Suscribirse a eventos de maestros para actualización en tiempo real
    this.subscriptions.push(
      this.websocketService.onMaestroEntregado().subscribe((data) => {
        console.log('📱 Maestro entregado, recargando histórico...');
        this.obtenerHistoricoMaestros();
      })
    );

    this.subscriptions.push(
      this.websocketService.onMaestroReactivado().subscribe((data) => {
        console.log('📱 Maestro reactivado, recargando histórico...');
        this.obtenerHistoricoMaestros();
      })
    );
  }

  obtenerHistoricoMaestros(): void {
    this.maestroService.ObtenerHistoricoMaestros().subscribe(
      (data: any) => {
        console.log('Respuesta del servicio:', data);
        if (data && Array.isArray(data.maestros)) {
          this.maestros = data.maestros;
          this.totalMaestrosFiltrados = this.maestros.length; // Inicializar con el número total de maestros
          this.actualizarTotalMaestrosFiltrados(); // Actualizar el total de maestros filtrados
          this.maestros.forEach((maestro) => {
            console.log('Maestro Estado:', maestro.estado);
            console.log('Maestro Region:', maestro.Uid);
            console.log('Persona a cargo:', maestro.usuarios);
            console.log('Descripcion:', maestro.descripcionEntrega);	
            console.log('Descripcion Recibe:', maestro.descripcionRecibe);
            console.log('Fecha Entrega:', maestro.fechaEntrega);
            console.log('Fecha Recibe:', maestro.fechaRecibe);
          });
        } else {
          console.error('La respuesta no contiene un array de maestros', data);
        }
        this.loading = false;
      },
      (error) => {
        console.error('Error al obtener los maestros', error);
        this.loading = false;
      }
    );
  }

  reactivarMaestro(Mid: number): void {
    Swal.fire({
      title: '¿Estás segura?',
      text: 'Esta acción es irreparable',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) { 
        this.loading = true;
        this.maestroService.reactivarMaestro(Mid).subscribe({
          next: () => {
            this.loading = false;
            this.obtenerHistoricoMaestros(); // Recargar la lista de maestros
          },
          error: (err) => {
            this.toastr.error('Error al eliminar el maestro', 'Error');
            this.loading = false;
          },
        });
      }
    });
  }

  actualizarTotalMaestrosFiltrados(): void {
    this.totalMaestrosFiltrados = this.maestros.filter((maestro) => {
      return (
        (this.filtroEstado === '' || maestro.estado === this.filtroEstado) &&
        (this.filtroPersona === '' ||
          `${maestro.usuarios.nombre} ${maestro.usuarios.apellido}`
            .toLowerCase()
            .includes(this.filtroPersona.toLowerCase())) &&
        (this.filtroRegion === '' ||
          maestro.region.toLowerCase().includes(this.filtroRegion.toLowerCase())) &&
        (this.filtroImei === '' || maestro.imei.includes(this.filtroImei)) &&
        (this.filtroFechaEntrega === '' || maestro.fechaEntrega === this.filtroFechaEntrega) &&
        (this.filtroFechaRecibido === '' || maestro.fechaRecibe === this.filtroFechaRecibido)
      );
    }).length;
    this.currentPage = 1; // Reset to first page when filters change
  }

  get paginatedMaestros(): Maestro[] {
    const filteredMaestros = this.maestros.filter((maestro) => {
      return (
        (this.filtroEstado === '' || maestro.estado === this.filtroEstado) &&
        (this.filtroPersona === '' ||
          `${maestro.usuarios.nombre} ${maestro.usuarios.apellido}`
            .toLowerCase()
            .includes(this.filtroPersona.toLowerCase())) &&
        (this.filtroRegion === '' ||
          maestro.region.toLowerCase().includes(this.filtroRegion.toLowerCase())) &&
        (this.filtroImei === '' || maestro.imei.includes(this.filtroImei)) &&
        (this.filtroFechaEntrega === '' || maestro.fechaEntrega === this.filtroFechaEntrega) &&
        (this.filtroFechaRecibido === '' || maestro.fechaRecibe === this.filtroFechaRecibido)
      );
    });

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return filteredMaestros.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage * this.itemsPerPage < this.totalMaestrosFiltrados) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
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
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/entrega-maestro', Mid]);
        }
      });
    }
}
