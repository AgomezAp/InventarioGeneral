import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  WebsocketService,
  ConnectionStatus,
} from '../../services/websocket.service';

@Component({
  selector: 'app-connection-indicator',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './connection-indicator.component.html',
  styleUrl: './connection-indicator.component.css',
})
export class ConnectionIndicatorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() showDetails = true;
  @Input() compact = false;

  status: ConnectionStatus = {
    connected: false,
    reconnecting: false,
    reconnectAttempt: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    error: null,
  };

  detailsExpanded = false;

  constructor(
    private websocketService: WebsocketService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.websocketService.onConnectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        this.status = status;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStatusClass(): string {
    if (this.status.reconnecting) return 'reconnecting';
    if (this.status.connected) return 'connected';
    return 'disconnected';
  }

  getStatusText(): string {
    if (this.status.reconnecting) {
      return `Reconectando (${this.status.reconnectAttempt})...`;
    }
    if (this.status.connected) return 'Conectado';
    return 'Desconectado';
  }

  getStatusTooltip(): string {
    if (this.status.reconnecting) {
      return `Intentando reconectar... Intento ${this.status.reconnectAttempt}`;
    }
    if (this.status.connected) {
      return 'Conexión en tiempo real activa';
    }
    return this.status.error || 'Sin conexión al servidor';
  }

  getStatusIcon(): string {
    if (this.status.reconnecting) return 'pi-sync';
    if (this.status.connected) return 'pi-wifi';
    return 'pi-wifi-off';
  }

  toggleDetails(): void {
    if (this.showDetails) {
      this.detailsExpanded = !this.detailsExpanded;
      this.cdr.markForCheck();
    }
  }

  closeDetails(): void {
    this.detailsExpanded = false;
    this.cdr.markForCheck();
  }

  formatDate(date: Date | null): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  getTimeSince(date: Date | null): string {
    if (!date) return '-';
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffHours > 0) return `hace ${diffHours}h ${diffMins % 60}m`;
    if (diffMins > 0) return `hace ${diffMins}m`;
    return `hace ${diffSecs}s`;
  }
}
