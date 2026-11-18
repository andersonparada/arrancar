import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  CifrasDeSaldoDto,
  FilaDeSaldoDto,
  ReporteDeSaldosPorProveedorDto,
  TramosDto,
} from '../aplicacion/dto/saldos-al-corte.dto.js';
import { fechaLegible } from '../dominio/avisos.js';

/** Una fila del Excel de R1: un NIT, una de sus fichas, un total o una nota (corte, avisos y leyendas). */
export interface FilaExportadaDeSaldos {
  seccion: string;
  nit: string | null;
  proveedor: string;
  porVencer: string | null;
  de1a30: string | null;
  de31a60: string | null;
  de61a90: string | null;
  masDe90: string | null;
  sinVencimiento: string | null;
  totalCargos: string | null;
  saldosAFavor: string | null;
  saldoNeto: string | null;
  comprometido: string | null;
  disponible: string | null;
  sinAutorizar: string | null;
}

const VACIA: Omit<FilaExportadaDeSaldos, 'seccion' | 'proveedor'> = {
  nit: null,
  porVencer: null,
  de1a30: null,
  de31a60: null,
  de61a90: null,
  masDe90: null,
  sinVencimiento: null,
  totalCargos: null,
  saldosAFavor: null,
  saldoNeto: null,
  comprometido: null,
  disponible: null,
  sinAutorizar: null,
};

const deFila = (seccion: string, { nit, nombre, fichas: _fichas, proveedorId: _id, ...cifras }: FilaDeSaldoDto) => ({
  ...VACIA,
  ...cifras,
  seccion,
  nit,
  proveedor: nombre,
});

const deCifras = (seccion: string, proveedor: string, cifras: CifrasDeSaldoDto): FilaExportadaDeSaldos => ({
  ...VACIA,
  ...cifras,
  seccion,
  proveedor,
});

function filasDelBloque(titulo: string, filas: FilaDeSaldoDto[]): FilaExportadaDeSaldos[] {
  return filas.flatMap((fila) => [
    deFila(titulo, fila),
    ...(fila.fichas ?? []).map((ficha) => deFila(`${titulo} (ficha)`, ficha)),
  ]);
}

const nota = (texto: string): FilaExportadaDeSaldos => ({ ...VACIA, seccion: 'Nota', proveedor: texto });

/** La conciliación al pie: el auxiliar, la transitoria de R11 y lo que se presenta como Proveedores. */
function filasDeConciliacion({ conciliacion }: ReporteDeSaldosPorProveedorDto): FilaExportadaDeSaldos[] {
  if (!conciliacion) return [];
  const fila = (seccion: string, proveedor: string, saldoNeto: string) => ({ ...VACIA, seccion, proveedor, saldoNeto });
  return [
    fila('Conciliación', 'Saldo neto de Proveedores (auxiliar)', conciliacion.saldoNetoDelAuxiliar),
    fila('Conciliación', 'Pagos a proveedores por aplicar (R11 al mismo corte)', conciliacion.pagosPorAplicar),
    fila('Conciliación', 'Proveedores, neto de pagos por aplicar', conciliacion.proveedoresNetoDePagosPorAplicar),
  ];
}

/** El renglón del porcentaje de cada tramo sobre el total de cargos. */
function filaDePorcentajes(porcentajes: TramosDto): FilaExportadaDeSaldos {
  return {
    ...VACIA,
    ...porcentajes,
    seccion: '% sobre el total de cargos',
    proveedor: 'Porcentaje de los cargos por tramo',
  };
}

/** R1 en filas planas: los dos bloques con sus totales, el saldo neto, los porcentajes y, al final, el corte y las notas. */
export function aFilasExportadasDeSaldos(reporte: ReporteDeSaldosPorProveedorDto): FilaExportadaDeSaldos[] {
  const { totales } = reporte;
  return [
    ...filasDelBloque('Acreedores', reporte.acreedores),
    deCifras('Total acreedores', 'Proveedores con saldo acreedor', totales.acreedores),
    ...filasDelBloque('Deudores', reporte.deudores),
    deCifras('Total deudores', 'Proveedores con saldo deudor', totales.deudores),
    {
      ...VACIA,
      seccion: 'Saldo neto de Proveedores',
      proveedor: 'Acreedores menos deudores',
      saldoNeto: totales.saldoNeto,
    },
    filaDePorcentajes(totales.porcentajesPorTramo),
    ...filasDeConciliacion(reporte),
    nota(`Saldos al ${fechaLegible(reporte.corte)}.`),
    ...reporte.avisos.map(({ mensaje }) => nota(mensaje)),
    ...reporte.leyendas.map(nota),
  ];
}

const dinero = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'decimal' });

/** Las columnas del Excel de R1: solo se exporta, nunca se importa. */
export const columnasDeSaldosPorProveedor: Columna[] = [
  { clave: 'seccion', titulo: 'Sección', requerido: true, tipo: 'texto' },
  { clave: 'nit', titulo: 'NIT', requerido: false, tipo: 'texto' },
  { clave: 'proveedor', titulo: 'Proveedor', requerido: true, tipo: 'texto' },
  dinero('porVencer', 'Por vencer'),
  dinero('de1a30', '1 a 30 días'),
  dinero('de31a60', '31 a 60 días'),
  dinero('de61a90', '61 a 90 días'),
  dinero('masDe90', 'Más de 90 días'),
  dinero('sinVencimiento', 'Sin vencimiento'),
  dinero('totalCargos', 'Total cargos'),
  dinero('saldosAFavor', 'Saldos a favor'),
  dinero('saldoNeto', 'Saldo neto'),
  dinero('comprometido', 'Comprometido (cheques posfechados)'),
  dinero('disponible', 'Disponible para pagar'),
  dinero('sinAutorizar', 'Sin autorizar'),
];
