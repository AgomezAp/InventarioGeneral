import { User } from './user';

export interface MaestroEntregado {
  Mid: number;
  NombreMaestro: string;
  firmaEntrega: string;
  firmaRecibe: string;
  descripcionEntrega: string;
  descripcionRecibe: string;
  Uid: number;
  estado: string;
  region: string;
  marca: string;
  modelo: string;
  imei: string;
  fechaRecibe: Date;
  fechaEntrega: Date;
  usuarios: User;
  UidRecibe: number;

}