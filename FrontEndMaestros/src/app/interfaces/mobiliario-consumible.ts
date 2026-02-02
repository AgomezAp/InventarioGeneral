// ==================== TIPOS DE INVENTARIO ====================
export interface TipoInventario {
  id?: number;
  nombre: string;
  codigo: string; // tecnologia, mobiliario, aseo, papeleria
  descripcion?: string;
  icono?: string;
  color?: string;
  activo?: boolean;
  orden?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ==================== MOBILIARIO (BASADO EN STOCK) ====================
export interface Mobiliario {
  id?: number;
  nombre: string;
  categoria: 'escritorio' | 'silla' | 'mesa' | 'archivador' | 'estante' | 'gabinete' | 'otro';
  descripcion?: string;
  unidadMedida: string; // unidad, pieza, juego
  stockActual: number;
  ubicacionAlmacen?: string;
  proveedor?: string;
  precioUnitario?: number;
  foto?: string;
  activo?: boolean;
  observaciones?: string;
  Uid?: number;
  createdAt?: Date;
  updatedAt?: Date;
  movimientos?: MovimientoMobiliario[];
}

export interface MovimientoMobiliario {
  id?: number;
  mobiliarioId: number;
  tipoMovimiento: 'entrada' | 'salida' | 'ajuste' | 'baja';
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo: string; // compra, entrega, devolucion, ajuste_inventario, baja
  descripcion?: string;
  numeroDocumento?: string;
  actaEntregaId?: number;
  fecha: Date | string;
  Uid?: number;
  realizadoPor?: { Uid: number; name: string };
}

export interface EstadisticasMobiliario {
  total: number;
  stockTotal: number;
  sinStock: number;
  valorTotal: number;
  porCategoria: { categoria: string; cantidad: number; totalStock: number }[];
}

// ==================== CONSUMIBLES (ASEO Y PAPELERÍA) ====================
export interface Consumible {
  id?: number;
  nombre: string;
  tipoInventarioId: number; // FK a TipoInventario (aseo o papeleria)
  categoria?: string; // Subcategoría: limpieza, desinfección, escritura, archivo, etc.
  descripcion?: string;
  unidadMedida: string; // unidad, caja, paquete, litro, kilo
  stockActual: number;
  stockMinimo: number;
  stockMaximo?: number;
  proveedor?: string;
  precioUnitario?: number;
  ubicacionAlmacen?: string;
  codigoInterno?: string;
  foto?: string;
  activo?: boolean;
  observaciones?: string;
  Uid?: number;
  tipoInventario?: TipoInventario;
  movimientos?: MovimientoConsumible[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MovimientoConsumible {
  id?: number;
  consumibleId: number;
  tipoMovimiento: 'entrada' | 'salida' | 'ajuste' | 'devolucion';
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo: string; // compra, entrega, ajuste_inventario, vencimiento, perdida
  descripcion?: string;
  actaEntregaId?: number;
  numeroDocumento?: string;
  fecha: Date | string;
  Uid?: number;
  realizadoPor?: { Uid: number; name: string };
}

export interface EstadisticasConsumibles {
  total: number;
  stockBajo: number;
  sinStock: number;
  valorTotal: number;
  porCategoria: { categoria: string; cantidad: number; totalStock: number }[];
}

// ==================== REQUESTS ====================

// Crear/Actualizar Mobiliario
export interface MobiliarioRequest {
  nombre: string;
  categoria: string;
  marca?: string;
  dimensiones?: string;
  material?: string;
  color?: string;
  descripcion?: string;
  condicion?: string;
  ubicacion?: string;
  area?: string;
  observaciones?: string;
  Uid?: number;
}

// Crear Mobiliario (usado en formulario)
export interface CrearMobiliarioRequest {
  nombre: string;
  categoria: string;
  marca?: string;
  dimensiones?: string;
  material?: string;
  color?: string;
  estado?: string;
  condicion?: string;
  ubicacion: string;
  area: string;
  observaciones?: string;
}

// Crear/Actualizar Consumible
export interface ConsumibleRequest {
  nombre: string;
  tipoInventarioId: number;
  categoria?: string;
  descripcion?: string;
  unidadMedida?: string;
  stockActual?: number;
  stockMinimo?: number;
  stockMaximo?: number;
  proveedor?: string;
  precioUnitario?: number;
  ubicacionAlmacen?: string;
  codigoInterno?: string;
  observaciones?: string;
  Uid?: number;
}

// Crear Consumible (usado en formulario)
export interface CrearConsumibleRequest {
  nombre: string;
  tipoInventarioCodigo: 'aseo' | 'papeleria';
  categoria?: string;
  descripcion?: string;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo?: number;
  proveedor?: string;
  precioUnitario?: number;
  ubicacionAlmacen?: string;
}

// Agregar/Retirar Stock
export interface StockRequest {
  cantidad: number;
  motivo?: string;
  descripcion?: string;
  numeroDocumento?: string;
  actaEntregaId?: number;
  Uid?: number;
}

// Ajustar Stock
export interface AjusteStockRequest {
  nuevoStock: number;
  motivo?: string;
  descripcion?: string;
  Uid?: number;
}

// Cambiar estado mobiliario
export interface CambiarEstadoMobiliarioRequest {
  nuevoEstado: 'disponible' | 'asignado' | 'dañado' | 'dado_de_baja';
  motivo?: string;
  Uid?: number;
}
