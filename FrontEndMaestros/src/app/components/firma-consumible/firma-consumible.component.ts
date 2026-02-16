import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import SignaturePad from 'signature_pad';
import { environment } from '../../../environments/environment';

interface ArticuloActa {
  nombre: string;
  categoria: string;
  cantidad: number;
  unidadMedida: string;
  observaciones?: string;
}

interface DatosActaConsumible {
  numeroActa: string;
  tipoInventario: string;
  nombreReceptor: string;
  cargoReceptor: string;
  areaReceptor?: string;
  correoReceptor: string;
  fechaEntrega: Date;
  observaciones?: string;
  articulos: ArticuloActa[];
}

@Component({
  selector: 'app-firma-consumible',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './firma-consumible.component.html',
  styleUrl: './firma-consumible.component.css'
})
export class FirmaConsumibleComponent implements OnInit, AfterViewInit {
  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef<HTMLCanvasElement>;
  
  private signaturePad!: SignaturePad;
  private apiUrl = environment.apiUrl;
  
  token: string = '';
  datosActa: DatosActaConsumible | null = null;
  
  // Tipo de inventario
  tipoInventario: 'aseo' | 'papeleria' = 'aseo';
  tituloTipo = 'Aseo';
  iconoTipo = 'fa-broom';
  colorTema = '#00bcd4';
  
  // Estados de la página
  cargando: boolean = true;
  error: string = '';
  yaFirmada: boolean = false;
  fechaFirmaExistente: Date | null = null;
  rechazada: boolean = false;
  motivoRechazoExistente: string = '';
  
  // Proceso de firma
  mostrarFirma: boolean = false;
  firmando: boolean = false;
  firmaVacia: boolean = true;
  
  // Proceso de rechazo
  mostrarRechazo: boolean = false;
  motivoRechazo: string = '';
  rechazando: boolean = false;
  
  // Confirmación
  firmaExitosa: boolean = false;
  rechazoExitoso: boolean = false;
  fechaActual: string = '';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    
    if (!this.token) {
      this.error = 'Token no válido';
      this.cargando = false;
      return;
    }
    
    this.cargarDatosActa();
  }

  ngAfterViewInit(): void {
    // El signature pad se inicializa después de mostrar el panel de firma
  }

  configurarTipo(): void {
    if (this.datosActa?.tipoInventario === 'papeleria') {
      this.tipoInventario = 'papeleria';
      this.tituloTipo = 'Papelería';
      this.iconoTipo = 'fa-pen';
      this.colorTema = '#ffa726';
    } else {
      this.tipoInventario = 'aseo';
      this.tituloTipo = 'Aseo';
      this.iconoTipo = 'fa-broom';
      this.colorTema = '#00bcd4';
    }
  }

  cargarDatosActa(): void {
    this.http.get<any>(`${this.apiUrl}api/actas-consumibles/firma/${this.token}`)
      .subscribe({
        next: (response) => {
          this.datosActa = {
            numeroActa: response.numeroActa,
            tipoInventario: response.tipoInventario?.codigo || 'aseo',
            nombreReceptor: response.nombreReceptor,
            cargoReceptor: response.cargoReceptor,
            areaReceptor: response.areaReceptor,
            correoReceptor: response.correoReceptor,
            fechaEntrega: response.fechaEntrega,
            observaciones: response.observaciones,
            articulos: (response.detalles || []).map((d: any) => ({
              nombre: d.consumible?.nombre || 'Artículo',
              categoria: d.consumible?.categoria || '',
              cantidad: d.cantidad,
              unidadMedida: d.unidadMedida,
              observaciones: d.observaciones
            }))
          };
          this.configurarTipo();
          this.cargando = false;
        },
        error: (err) => {
          this.cargando = false;
          
          if (err.status === 400) {
            if (err.error?.fechaFirma) {
              this.yaFirmada = true;
              this.fechaFirmaExistente = new Date(err.error.fechaFirma);
            } else if (err.error?.motivo) {
              this.rechazada = true;
              this.motivoRechazoExistente = err.error.motivo;
            }
            this.error = err.error?.msg || 'Este enlace ya no es válido';
          } else if (err.status === 404) {
            this.error = 'Enlace inválido o expirado';
          } else {
            this.error = 'Error al cargar los datos. Intente nuevamente.';
          }
        }
      });
  }

  mostrarPanelFirma(): void {
    this.mostrarFirma = true;
    this.mostrarRechazo = false;
    
    // Inicializar signature pad después de que el DOM se actualice
    setTimeout(() => {
      this.initSignaturePad();
    }, 100);
  }

  mostrarPanelRechazo(): void {
    this.mostrarRechazo = true;
    this.mostrarFirma = false;
  }

  cancelar(): void {
    this.mostrarFirma = false;
    this.mostrarRechazo = false;
    this.motivoRechazo = '';
  }

  private initSignaturePad(): void {
    if (!this.signatureCanvas) return;
    
    const canvas = this.signatureCanvas.nativeElement;
    const container = canvas.parentElement;
    const width = container ? container.clientWidth : 500;
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
      penColor: 'rgb(0, 0, 0)',
      minWidth: 1,
      maxWidth: 2.5
    });
    
    // Escuchar cambios en la firma
    this.signaturePad.addEventListener('beginStroke', () => {
      this.firmaVacia = false;
    });
  }

  limpiarFirma(): void {
    if (this.signaturePad) {
      this.signaturePad.clear();
      this.firmaVacia = true;
    }
  }

  confirmarFirma(): void {
    if (!this.signaturePad || this.signaturePad.isEmpty()) {
      alert('Debe dibujar su firma antes de confirmar');
      return;
    }
    
    this.firmando = true;
    const firmaBase64 = this.signaturePad.toDataURL('image/png');
    
    this.http.post(`${this.apiUrl}api/actas-consumibles/firma/${this.token}`, {
      firma: firmaBase64
    }).subscribe({
      next: () => {
        this.firmando = false;
        this.firmaExitosa = true;
        this.mostrarFirma = false;
        this.fechaActual = this.formatearFecha(new Date());
      },
      error: (err) => {
        this.firmando = false;
        alert(err.error?.msg || 'Error al procesar la firma. Intente nuevamente.');
      }
    });
  }

  confirmarRechazo(): void {
    if (!this.motivoRechazo.trim()) {
      alert('Debe indicar el motivo por el cual rechaza el acta');
      return;
    }
    
    this.rechazando = true;
    
    this.http.post(`${this.apiUrl}api/actas-consumibles/rechazar/${this.token}`, {
      motivo: this.motivoRechazo
    }).subscribe({
      next: () => {
        this.rechazando = false;
        this.rechazoExitoso = true;
        this.mostrarRechazo = false;
      },
      error: (err) => {
        this.rechazando = false;
        alert(err.error?.msg || 'Error al procesar. Intente nuevamente.');
      }
    });
  }

  getTotalArticulos(): number {
    return this.datosActa?.articulos.reduce((sum, a) => sum + a.cantidad, 0) || 0;
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

  formatearFecha(fecha: Date | string): string {
    const f = new Date(fecha);
    return f.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
