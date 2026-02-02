import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { PointGroup } from 'signature_pad';

import { AngularSignaturePadModule } from '@almothafar/angular-signature-pad';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { MaestroService } from '../../services/maestro.service';
import { SpinnerComponent } from '../../shared/spinner/spinner/spinner.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-entrega-maestro',
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent,
    FontAwesomeModule,
    AngularSignaturePadModule,
  ],
  templateUrl: './entrega-maestro.component.html',
  styleUrl: './entrega-maestro.component.css',
})
export class EntregaMaestroComponent implements OnInit {
  maestro: any = {
    analistaAsignado: '',
    Aid: null,
    firmaEntrega: '',
    descripcionEntrega: '',
    fotosEntrega: [],
    estado: 'en_uso',
    almacen: 'Principal',
    fechaSalida: new Date(),
    Uid: localStorage.getItem('userId'),
  };
  hasFirma: boolean = false;
  celularesDisponibles: any[] = [];
  celularSeleccionado: any = null;
  analistas: any[] = [];

  loading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  Mid!: number;

  isDrawn = false;
  private history: PointGroup[] = [];
  private future: PointGroup[] = [];
  @ViewChild('signaturePad') signaturePad!: any;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private drawing = false;

  constructor(
    private maestroService: MaestroService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.cargarCelularesDisponibles();
    this.cargarAnalistas();
  }

  ngAfterViewInit(): void {
    this.canvas = this.signaturePad.nativeElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    this.initCanvasEvents();
  }
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.resizeCanvas();
  }
  resizeCanvas(): void {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    this.canvas.width = this.canvas.offsetWidth * ratio;
    this.canvas.height = this.canvas.offsetHeight * ratio;
    this.ctx.scale(ratio, ratio);
    this.clearSignature(); // Clear the canvas to avoid drawing issues
  }
  onSignatureStart(): void {
    this.hasFirma = true;
  }

  initCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
    this.canvas.addEventListener('touchstart', this.startDrawing.bind(this));
    this.canvas.addEventListener('mousemove', this.draw.bind(this));
    this.canvas.addEventListener('touchmove', this.draw.bind(this));
    this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
    this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
  }

  startDrawing(event: MouseEvent | TouchEvent): void {
    this.drawing = true;
    this.ctx.beginPath();
    this.ctx.moveTo(this.getX(event), this.getY(event));
  }

  draw(event: MouseEvent | TouchEvent): void {
    if (!this.drawing) return;
    this.ctx.lineTo(this.getX(event), this.getY(event));
    this.ctx.stroke();
  }

  stopDrawing(): void {
    this.drawing = false;
    this.ctx.closePath();
    this.maestro.firmaRecibe = this.canvas.toDataURL();
    this.isDrawn = true;
  }

  getX(event: MouseEvent | TouchEvent): number {
    if (event instanceof MouseEvent) {
      return event.offsetX;
    } else {
      const touch = event.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      return touch.clientX - rect.left;
    }
  }

  getY(event: MouseEvent | TouchEvent): number {
    if (event instanceof MouseEvent) {
      return event.offsetY;
    } else {
      const touch = event.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      return touch.clientY - rect.top;
    }
  }
  clearSignature(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.isDrawn = false;
  }

  onSubmit(): void {
    this.maestro.firmaEntrega = this.signaturePad.toDataURL();

    if (!this.celularSeleccionado) {
      this.errorMessage = 'Debe seleccionar un celular';
      return;
    }

    if (!this.maestro.analistaAsignado) {
      this.errorMessage = 'Debe ingresar el nombre de la analista';
      return;
    }

    this.loading = true;

    // Preparar datos para enviar
    const datosEntrega = {
      analistaAsignado: this.maestro.analistaAsignado,
      Aid: this.maestro.Aid,
      firmaEntrega: this.maestro.firmaEntrega,
      descripcionEntrega: this.maestro.descripcionEntrega,
      fotosEntrega: this.maestro.fotosEntrega,
      fechaSalida: this.maestro.fechaSalida,
      Uid: this.maestro.Uid,
    };

    this.maestroService
      .BorrarMaestroId(this.celularSeleccionado.Mid, datosEntrega)
      .subscribe(
        (response) => {
          this.successMessage =
            'Celular entregado con éxito a ' + this.maestro.analistaAsignado;
          this.errorMessage = '';
          setTimeout(() => {
            this.router.navigate(['/consolidado-celulares']);
          }, 1500);
          this.loading = false;
        },
        (error) => {
          this.errorMessage =
            error.error.msg || 'Problemas al hacer la entrega del celular';
          this.successMessage = '';
          this.loading = false;
        },
      );
  }

  cargarCelularesDisponibles(): void {
    this.loading = true;
    this.maestroService.ObtenerMaestrosActivos().subscribe(
      (response: any) => {
        this.celularesDisponibles = response.filter(
          (c: any) => c.estado === 'disponible',
        );
        this.loading = false;
      },
      (error) => {
        this.errorMessage = 'Error al cargar celulares disponibles';
        this.loading = false;
      },
    );
  }

  cargarAnalistas(): void {
    // Por ahora usamos un array estático, luego se puede conectar con el servicio de analistas
    this.analistas = [
      { Aid: 1, nombre: 'Karen', apellido: '' },
      { Aid: 2, nombre: 'Ana', apellido: '' },
      { Aid: 3, nombre: 'Valentina', apellido: '' },
      { Aid: 4, nombre: 'Mafe', apellido: '' },
      { Aid: 5, nombre: 'Angelina Peña', apellido: '' },
    ];
  }

  onCelularChange(event: any): void {
    const Mid = parseInt(event.target.value);
    this.celularSeleccionado = this.celularesDisponibles.find(
      (c) => c.Mid === Mid,
    );
  }

  onAnalistaChange(event: any): void {
    const analistaNombre = event.target.value;
    const analista = this.analistas.find((a) => a.nombre === analistaNombre);
    if (analista) {
      this.maestro.Aid = analista.Aid;
      this.maestro.analistaAsignado = analista.nombre;
    }
  }

  drawComplete(event: MouseEvent | Touch): void {
    console.log('Completed drawing', event);
    this.maestro.firmaRecibe = this.signaturePad.toDataURL();
    this.isDrawn = true;
  }

  drawStart(event: MouseEvent | Touch): void {
    console.log('Start drawing', event);
  }

  navigateToDashboard(): void {
    this.router.navigate(['/consolidado-celulares']);
  }

  undo(): void {
    const data = this.signaturePad.toData();
    if (data.length) {
      const lastAction = data.pop();
      if (lastAction) {
        this.future.push(lastAction);
        this.signaturePad.fromData(data);
      }
    }
  }

  redo(): void {
    if (this.future.length) {
      const data = this.signaturePad.toData();
      const nextAction = this.future.pop();
      if (nextAction) {
        data.push(nextAction);
        this.signaturePad.fromData(data);
      }
    }
  }
}
