import type { Columna, OpcionDeReferencia } from '../../core/intercambio/aplicacion/columnas.js';

type Opciones = () => Promise<OpcionDeReferencia[]>;

/** De dónde salen las opciones de las columnas que se escriben por código o nombre (se consultan una vez por importación). */
export interface OpcionesDeSaldosIniciales {
  articulos: Opciones;
  bodegas: Opciones;
  unidades: Opciones;
}

interface ColumnaDeReferencia {
  clave: string;
  titulo: string;
  campoDeNombre: string;
  requerido: boolean;
}

const referencia = (datos: ColumnaDeReferencia, opciones: Opciones): Columna => ({
  ...datos,
  tipo: 'referencia',
  opciones,
});

/**
 * Las columnas del Excel de saldos iniciales (§8): artículo y bodega por su código, el lote por su código con su
 * vencimiento, la cantidad con su unidad (la base si se deja vacía), el costo total y la fecha de la capa (PEPS).
 */
export const columnasDeSaldosIniciales = (opciones: OpcionesDeSaldosIniciales): Columna[] => [
  referencia(
    { clave: 'articuloId', titulo: 'Artículo (código)', campoDeNombre: 'articuloCodigo', requerido: true },
    opciones.articulos,
  ),
  referencia(
    { clave: 'bodegaId', titulo: 'Bodega (código)', campoDeNombre: 'bodegaCodigo', requerido: true },
    opciones.bodegas,
  ),
  { clave: 'loteCodigo', titulo: 'Lote', requerido: false, tipo: 'texto' },
  { clave: 'loteVencimiento', titulo: 'Vencimiento del lote', requerido: false, tipo: 'fecha' },
  { clave: 'cantidad', titulo: 'Cantidad', requerido: true, tipo: 'decimal' },
  referencia(
    { clave: 'unidadId', titulo: 'Unidad', campoDeNombre: 'unidadNombre', requerido: false },
    opciones.unidades,
  ),
  { clave: 'costoTotal', titulo: 'Costo total', requerido: true, tipo: 'decimal' },
  { clave: 'fechaDeCapa', titulo: 'Fecha de la capa (compra)', requerido: false, tipo: 'fecha' },
];
