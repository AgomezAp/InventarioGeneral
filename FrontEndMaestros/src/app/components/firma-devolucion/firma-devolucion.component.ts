import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DevolucionService } from '../../services/devolucion.service';
import SignaturePad from 'signature_pad';

@Component({
  selector: 'app-firma-devolucion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './firma-devolucion.component.html',
  styleUrls: ['./firma-devolucion.component.css']
})
export class FirmaDevolucionComponent implements OnInit, AfterViewInit {
  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;
  
  private signaturePad!: SignaturePad;
  
  token: string = '';
  acta: any = null;
  loading = true;
  error = '';
  success = '';
  firmando = false;
  rechazando = false;
  
  // Estados del proceso
  enlaceInvalido = false;
  actaYaFirmada = false;
  actaRechazada = false;
  firmaExitosa = false;
  
  constructor(
    private route: ActivatedRoute,
    private devolucionService: DevolucionService
  ) {}
  
  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    
    if (!this.token) {
      this.enlaceInvalido = true;
      this.loading = false;
      return;
    }
    
    this.cargarActa();
  }
  
  ngAfterViewInit(): void {
    setTimeout(() => this.inicializarSignaturePad(), 500);
  }
  
  cargarActa(): void {
    this.loading = true;
    
    this.devolucionService.obtenerActaPublica(this.token).subscribe({
      next: (response: any) => {
        console.log('Respuesta del servidor:', response);
        this.acta = response.acta;
        
        if (this.acta.estado === 'completada') {
          this.actaYaFirmada = true;
        } else if (this.acta.estado === 'rechazada') {
          this.actaRechazada = true;
        }
        
        this.loading = false;
        setTimeout(() => this.inicializarSignaturePad(), 100);
      },
      error: (err) => {
        console.error('Error cargando acta:', err);
        this.enlaceInvalido = true;
        this.error = err.error?.msg || 'Enlace inválido o expirado';
        this.loading = false;
      }
    });
  }
  
  inicializarSignaturePad(): void {
    if (this.signatureCanvas && this.signatureCanvas.nativeElement) {
      const canvas = this.signatureCanvas.nativeElement;
      const container = canvas.parentElement;
      const width = container ? container.offsetWidth - 20 : 500;
      const height = 200;
      const dpr = window.devicePixelRatio || 1;
      
      // Establecer dimensiones CSS (tamaño visual)
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      
      // Establecer dimensiones internas (resolución real)
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      // Escalar contexto para HiDPI
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      this.signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)'
      });
    }
  }
  
  limpiarFirma(): void {
    if (this.signaturePad) {
      this.signaturePad.clear();
    }
  }
  
  firmar(): void {
    if (!this.signaturePad || this.signaturePad.isEmpty()) {
      this.error = 'Por favor, firme en el recuadro antes de continuar';
      return;
    }
    
    this.firmando = true;
    this.error = '';
    
    const firmaEntrega = this.signaturePad.toDataURL('image/png');
    
    this.devolucionService.firmarActa(this.token, firmaEntrega).subscribe({
      next: (response: any) => {
        console.log('Respuesta de firma:', response);
        this.firmaExitosa = true;
        this.firmando = false;
        this.success = '¡Acta de devolución firmada exitosamente!';
      },
      error: (err) => {
        console.error('Error al firmar:', err);
        this.error = err.error?.msg || 'Error al procesar la firma';
        this.firmando = false;
      }
    });
  }
  
  rechazar(): void {
    if (!confirm('¿Está seguro que desea rechazar esta acta de devolución?')) {
      return;
    }
    
    this.rechazando = true;
    this.error = '';
    
    this.devolucionService.rechazarActa(this.token).subscribe({
      next: (response: any) => {
        this.actaRechazada = true;
        this.rechazando = false;
      },
      error: (err) => {
        console.error('Error al rechazar:', err);
        this.error = err.error?.msg || 'Error al rechazar el acta';
        this.rechazando = false;
      }
    });
  }
  
  formatFecha(fecha: string): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
