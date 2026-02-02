import { User } from './user';

export interface Maestro {
  Mid: number;
  nombre: string;
  tipo: string;
  analistaAsignado: string;
  Aid: number;
  maestroRecibido: string;
  firmaEntrega: string;
  firmaRecibe: string;
  descripcionEntrega: string;
  descripcionRecibe: string;
  Uid: number;
  nombreCompletoRecibe: string;
  estado: string;
  almacen: string;
  marca: string;
  modelo: string;
  imei: string;
  stockMinimo: number;
  fotosEntrega: string[];
  fotosRecibe: string[];
  fechaIngreso: Date;
  fechaSalida: Date;
  usuarios: User;
}
export interface MaestroEdicion {
  Mid: number;
  nombre: string;
  tipo: string;
  analistaAsignado: string;
  Aid: number;
  maestroRecibido: string;
  firmaEntrega: string;
  firmaRecibe: string;
  descripcionEntrega: string;
  descripcionRecibe: string;
  Uid: number;
  nombreCompletoRecibe: string;
  estado: string;
  almacen: string;
  marca: string;
  modelo: string;
  imei: string;
  stockMinimo: number;
  fotosEntrega: string[];
  fotosRecibe: string[];
  fechaIngreso: Date;
  fechaSalida: Date;
  editing?: boolean;
}
