import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection.js';
import { User } from './user.js';
import { TipoInventario } from './tipoInventario.js';

/**
 * Modelo Consumible - Inventario de productos con stock (Aseo y Papelería)
 * Maneja cantidades, stock mínimo, proveedor y precio
 */
export class Consumible extends Model {
  public id!: number;
  public nombre!: string;
  public tipoInventarioId!: number; // FK a TipoInventario (aseo o papeleria)
  public categoria!: string; // Subcategoría dentro del tipo
  public descripcion!: string;
  public unidadMedida!: string; // unidad, caja, paquete, litro, kilo, etc.
  public stockActual!: number;
  public stockMinimo!: number; // Para alertas
  public stockMaximo!: number; // Capacidad máxima de almacenamiento
  public proveedor!: string;
  public precioUnitario!: number;
  public ubicacionAlmacen!: string; // Donde se guarda el stock
  public codigoInterno!: string; // Código para identificación rápida
  public foto!: string; // URL de foto del producto
  public activo!: boolean; // Si el producto sigue en uso
  public observaciones!: string;
  public Uid!: number; // Usuario que registró
}

Consumible.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre del producto'
    },
    tipoInventarioId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'FK a tipos_inventario (aseo o papeleria)'
    },
    categoria: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Subcategoría: limpieza, desinfección, escritura, archivo, etc.'
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción detallada del producto'
    },
    unidadMedida: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'unidad',
      comment: 'Unidad de medida: unidad, caja, paquete, litro, kilo'
    },
    stockActual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Cantidad actual en inventario'
    },
    stockMinimo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'Stock mínimo para generar alertas'
    },
    stockMaximo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Capacidad máxima de almacenamiento'
    },
    proveedor: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Nombre del proveedor'
    },
    precioUnitario: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Precio por unidad'
    },
    ubicacionAlmacen: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Ubicación donde se almacena el stock'
    },
    codigoInterno: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      comment: 'Código interno para identificación rápida'
    },
    foto: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'URL de la foto del producto'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Si el producto sigue activo en el inventario'
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    Uid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Usuario que registró el producto'
    }
  },
  {
    sequelize,
    tableName: 'consumibles',
    timestamps: true,
  }
);

// Relaciones
Consumible.belongsTo(User, { foreignKey: 'Uid', as: 'registradoPor' });
Consumible.belongsTo(TipoInventario, { foreignKey: 'tipoInventarioId', as: 'tipoInventario' });
