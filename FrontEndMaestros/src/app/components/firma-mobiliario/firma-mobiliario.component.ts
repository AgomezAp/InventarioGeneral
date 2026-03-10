import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ActaMobiliarioService } from '../../services/acta-mobiliario.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-firma-mobiliario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './firma-mobiliario.component.html',
  styleUrl: './firma-mobiliario.component.css'
})
export class FirmaMobiliarioComponent implements OnInit {
  @ViewChild('canvasFirma') canvasRef!: ElementRef<HTMLCanvasElement>;

  token = '';
  acta: any = null;
  loading = true;
  error = '';
  firmado = false;
  rechazado = false;
  procesando = false;

  // Canvas firma
  ctx: CanvasRenderingContext2D | null = null;
  dibujando = false;
  haFirmado = false;

  // Rechazo
  mostrarRechazo = false;
  motivoRechazo = '';

  constructor(
    private route: ActivatedRoute,
    private actaService: ActaMobiliarioService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.token = params['token'];
      this.cargarActa();
    });
  }

  cargarActa(): void {
    this.loading = true;
    this.actaService.obtenerActaPorToken(this.token).subscribe({
      next: (data) => {
        this.acta = data;
        this.loading = false;
        setTimeout(() => this.inicializarCanvas(), 100);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.msg || 'No se pudo cargar el acta';
      }
    });
  }

  inicializarCanvas(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;

    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 200;

    this.ctx.strokeStyle = '#1a1a1a';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Mouse events
    canvas.addEventListener('mousedown', (e) => this.iniciarDibujo(e));
    canvas.addEventListener('mousemove', (e) => this.dibujar(e));
    canvas.addEventListener('mouseup', () => this.pararDibujo());
    canvas.addEventListener('mouseleave', () => this.pararDibujo());

    // Touch events
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.iniciarDibujoTouch(e); });
    canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.dibujarTouch(e); });
    canvas.addEventListener('touchend', () => this.pararDibujo());
  }

  iniciarDibujo(e: MouseEvent): void {
    if (!this.ctx) return;
    this.dibujando = true;
    this.haFirmado = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }

  dibujar(e: MouseEvent): void {
    if (!this.dibujando || !this.ctx) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    this.ctx.stroke();
  }

  iniciarDibujoTouch(e: TouchEvent): void {
    if (!this.ctx) return;
    this.dibujando = true;
    this.haFirmado = true;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = e.touches[0];
    this.ctx.beginPath();
    this.ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
  }

  dibujarTouch(e: TouchEvent): void {
    if (!this.dibujando || !this.ctx) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = e.touches[0];
    this.ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
    this.ctx.stroke();
  }

  pararDibujo(): void {
    this.dibujando = false;
  }

  limpiarFirma(): void {
    if (!this.ctx) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.haFirmado = false;
  }

  firmar(): void {
    if (!this.haFirmado) {
      Swal.fire({ icon: 'warning', title: 'Firma requerida', text: 'Dibuje su firma antes de confirmar' });
      return;
    }

    Swal.fire({
      title: 'Confirmar firma',
      text: 'Al firmar confirma haber recibido el mobiliario listado. Esta accion no se puede deshacer.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Firmar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#5d4037'
    }).then(result => {
      if (result.isConfirmed) {
        this.procesando = true;
        const firma = this.canvasRef.nativeElement.toDataURL('image/png');

        this.actaService.firmarActa(this.token, firma).subscribe({
          next: () => {
            this.procesando = false;
            this.firmado = true;
            Swal.fire({ icon: 'success', title: 'Acta firmada', text: 'La firma fue registrada exitosamente', confirmButtonColor: '#5d4037' });
          },
          error: (err) => {
            this.procesando = false;
            Swal.fire({ icon: 'error', title: 'Error', text: err.error?.msg || 'No se pudo procesar la firma' });
          }
        });
      }
    });
  }

  toggleRechazo(): void {
    this.mostrarRechazo = !this.mostrarRechazo;
  }

  rechazar(): void {
    if (!this.motivoRechazo.trim()) {
      Swal.fire({ icon: 'warning', title: 'Motivo requerido', text: 'Indique el motivo del rechazo' });
      return;
    }

    this.procesando = true;
    this.actaService.rechazarActa(this.token, this.motivoRechazo).subscribe({
      next: () => {
        this.procesando = false;
        this.rechazado = true;
        Swal.fire({ icon: 'info', title: 'Acta rechazada', text: 'El acta fue devuelta para correccion', confirmButtonColor: '#5d4037' });
      },
      error: (err) => {
        this.procesando = false;
        Swal.fire({ icon: 'error', title: 'Error', text: err.error?.msg || 'No se pudo rechazar el acta' });
      }
    });
  }
}
