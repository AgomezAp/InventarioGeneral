import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';

/**
 * Modelo TipoInventario - Tabla maestra para categorías principales de inventario
 * Permite agregar nuevos tipos en el futuro sin modificar código
 */
export class TipoInventario extends Model {
  public id!: number;
  public nombre!: string;
  public codigo!: string; // tecnologia, mobiliario, aseo, papeleria
  public descripcion!: string;
  public icono!: string; // Clase de FontAwesome
  public color!: string; // Color para UI
  public activo!: boolean;
  public orden!: number; // Para ordenar en el menú
}

TipoInventario.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Nombre para mostrar: Tecnología, Mobiliario, Aseo, Papelería'
    },
    codigo: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Código interno: tecnologia, mobiliario, aseo, papeleria'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción del tipo de inventario'
    },
    icono: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'fa-box',
      comment: 'Clase de icono FontAwesome'
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '#6c757d',
      comment: 'Color hexadecimal para la UI'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si el tipo está activo en el sistema'
    },
    orden: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Orden de aparición en el menú'
    }
  },
  {
    sequelize,
    tableName: 'tipos_inventario',
    timestamps: true,
  }
);

// Función para insertar los tipos iniciales
export const inicializarTiposInventario = async () => {
  const tiposIniciales = [
    {
      nombre: 'Tecnología',
      codigo: 'tecnologia',
      descripcion: 'Dispositivos tecnológicos: celulares, tablets, computadores, etc.',
      icono: 'fa-laptop',
      color: '#0d6efd',
      orden: 1
    },
    {
      nombre: 'Mobiliario',
      codigo: 'mobiliario',
      descripcion: 'Muebles de oficina: escritorios, sillas, archivadores, etc.',
      icono: 'fa-chair',
      color: '#198754',
      orden: 2
    },
    {
      nombre: 'Aseo',
      codigo: 'aseo',
      descripcion: 'Productos de limpieza y aseo',
      icono: 'fa-broom',
      color: '#0dcaf0',
      orden: 3
    },
    {
      nombre: 'Papelería',
      codigo: 'papeleria',
      descripcion: 'Artículos de oficina y papelería',
      icono: 'fa-paperclip',
      color: '#ffc107',
      orden: 4
    }
  ];

  for (const tipo of tiposIniciales) {
    await TipoInventario.findOrCreate({
      where: { codigo: tipo.codigo },
      defaults: tipo
    });
  }
  
  console.log('✅ Tipos de inventario inicializados');
};
