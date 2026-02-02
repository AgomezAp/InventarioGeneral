import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { MaestroService } from '../../services/maestro.service';
import { WebsocketService } from '../../services/websocket.service';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-ver-maestros-activos',
  imports: [NavbarComponent, CommonModule, FontAwesomeModule],
  templateUrl: './ver-maestros-activos.component.html',
  styleUrl: './ver-maestros-activos.component.css',
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
export class VerMaestrosActivosComponent implements OnInit, OnDestroy {
  maestrosActivos: any[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 6;
  loading: boolean = true;
  Math = Math;
  // Suscripciones WebSocket
  private subscriptions: Subscription[] = [];

  constructor(
    private maestroService: MaestroService,
    private websocketService: WebsocketService,
  ) {}

  ngOnInit(): void {
    this.obtenerMaestrosActivos();
    this.conectarWebSocket();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.websocketService.leaveRoom('maestros');
  }

  private conectarWebSocket(): void {
    this.websocketService.joinRoom('maestros');

    // Suscribirse a eventos de maestros para actualización en tiempo real
    this.subscriptions.push(
      this.websocketService.onMaestroCreated().subscribe((data) => {
        console.log('📱 Nuevo maestro detectado, recargando lista...');
        this.obtenerMaestrosActivos();
      }),
    );

    this.subscriptions.push(
      this.websocketService.onMaestroUpdated().subscribe((data) => {
        console.log('📱 Maestro actualizado, recargando lista...');
        this.obtenerMaestrosActivos();
      }),
    );

    this.subscriptions.push(
      this.websocketService.onMaestroEntregado().subscribe((data) => {
        console.log('📱 Maestro entregado, recargando lista...');
        this.obtenerMaestrosActivos();
      }),
    );

    this.subscriptions.push(
      this.websocketService.onMaestroReactivado().subscribe((data) => {
        console.log('📱 Maestro reactivado, recargando lista...');
        this.obtenerMaestrosActivos();
      }),
    );
  }

  obtenerMaestrosActivos(): void {
    this.maestroService.ObtenerMaestrosActivos().subscribe(
      (data: any) => {
        this.maestrosActivos = data;
        this.loading = false;
      },
      (error) => {
        console.error('Error al obtener los maestros activos', error);
      },
    );
  }
  get paginatedMaestros(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.maestrosActivos.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage * this.itemsPerPage < this.maestrosActivos.length) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }
}
