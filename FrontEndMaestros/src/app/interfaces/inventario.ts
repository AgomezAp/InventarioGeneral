export interface Dispositivo {
  id?: number;
  nombre: string;
  categoria: 'celular' | 'tablet' | 'computador' | 'cargador' | 'accesorio' | 'otro';
  marca?: string;
  modelo?: string;
  serial?: string;
  imei?: string;
  color?: string;
  descripcion?: string;
  estado: 'disponible' | 'reservado' | 'entregado' | 'dañado' | 'perdido' | 'obsoleto';
  condicion: 'nuevo' | 'bueno' | 'regular' | 'malo';
  ubicacion?: string;
  fotos?: string; // JSON array de URLs
  fechaIngreso?: Date | string;
  observaciones?: string;
  Uid?: number;
  createdAt?: Date;
  updatedAt?: Date;
  
  // Campos para manejo de stock (accesorios, cargadores, etc.)
  tipoRegistro?: 'individual' | 'stock';
  stockActual?: number;
  stockMinimo?: number;
}

export interface ActaEntrega {
  id?: number;
  numeroActa: string;
  nombreReceptor: string;
  cedulaReceptor?: string;
  cargoReceptor: string;
  telefonoReceptor?: string;
  correoReceptor?: string;
  firmaReceptor?: string; // Base64, opcional hasta que se firme
  fechaEntrega: Date | string;
  fechaFirma?: Date | string;
  fechaDevolucionEsperada?: Date | string;
  fechaDevolucionReal?: Date | string;
  estado: 'pendiente_firma' | 'activa' | 'devuelta_parcial' | 'devuelta_completa' | 'vencida' | 'rechazada';
  observacionesEntrega?: string;
  observacionesDevolucion?: string;
  Uid?: number;
  detalles?: DetalleActa[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DetalleActa {
  id?: number;
  actaId: number;
  dispositivoId: number;
  estadoEntrega?: string;
  condicionEntrega?: 'nuevo' | 'bueno' | 'regular' | 'malo';
  fotosEntrega?: string; // JSON array
  observacionesEntrega?: string;
  devuelto: boolean;
  fechaDevolucion?: Date | string;
  estadoDevolucion?: 'disponible' | 'dañado' | 'perdido';
  condicionDevolucion?: 'nuevo' | 'bueno' | 'regular' | 'malo';
  fotosDevolucion?: string; // JSON array
  observacionesDevolucion?: string;
  dispositivo?: Dispositivo;
}

export interface MovimientoDispositivo {
  id?: number;
  dispositivoId: number;
  tipoMovimiento: 'ingreso' | 'prestamo' | 'devolucion' | 'cambio_estado' | 'actualizacion' | 'baja';
  estadoAnterior?: string;
  estadoNuevo?: string;
  descripcion: string;
  actaId?: number;
  fecha: Date | string;
  Uid?: number;
  dispositivo?: Dispositivo;
}

export interface EstadisticasInventario {
  total: number;
  porEstado: { estado: string; cantidad: number }[];
  porCategoria: { categoria: string; cantidad: number }[];
}

// Para crear un acta con dispositivos
export interface CrearActaRequest {
  nombreReceptor: string;
  cedulaReceptor?: string;
  cargoReceptor: string;
  telefonoReceptor?: string;
  correoReceptor?: string;
  firmaReceptor: string;
  fechaDevolucionEsperada?: string;
  observacionesEntrega?: string;
  dispositivos: {
    dispositivoId: number;
    condicionEntrega?: string;
    observaciones?: string;
  }[];
  Uid?: number;
}

// Para registrar devolución
export interface DevolucionRequest {
  devoluciones: {
    detalleId: number;
    estadoDevolucion: 'disponible' | 'dañado' | 'perdido';
    condicionDevolucion?: string;
    observaciones?: string;
  }[];
  observacionesDevolucion?: string;
  Uid?: number;
}
