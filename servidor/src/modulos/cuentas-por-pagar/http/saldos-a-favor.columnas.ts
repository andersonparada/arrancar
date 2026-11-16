import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type { FilaDeSaldoAFavorDto, ReporteDeSaldosAFavorDto } from '../aplicacion/dto/reportes-de-proveedor.dto.js';
import { fechaLegible } from '../dominio/avisos.js';
import { TRAMOS_DE_PRESCRIPCION, type TramoDePrescripcion } from '../dominio/prescripcion-de-saldos.js';
import { numeroDelDocumento } from './documentos-a-una-fecha.columnas.js';

/** Una fila del Excel de R4: una nota con saldo a favor, un total o una nota (corte, avisos y leyendas). */
export interface FilaExportadaDeSaldosAFavor {
  seccion: string;
  proveedor: string;
  nit: string | null;
  documento: string | null;
  emision: string | null;
  base: string | null;
  aplicado: string | null;
  ajustado: string | null;
  reintegrado: string | null;
  saldoLibre: string | null;
  ultimoMovimiento: string | null;
  anios: number | null;
  tramo: string | null;
  posiblePrescripcionDesde: string | null;
  enContrasena: boolean | null;
}

export const NOMBRE_DEL_TRAMO_DE_PRESCRIPCION: Record<TramoDePrescripcion, string> = {
  menos_de_1: 'Menos de 1 año',
  de_1_a_2: '1 a 2 años',
  de_2_a_3: '2 a 3 años',
  de_3_a_4: '3 a 4 años',
  de_4_a_5: '4 a 5 años',
  de_5_o_mas: '5 años o más',
};

const VACIA: Omit<FilaExportadaDeSaldosAFavor, 'seccion' | 'proveedor'> = {
  nit: null,
  documento: null,
  emision: null,
  base: null,
  aplicado: null,
  ajustado: null,
  reintegrado: null,
  saldoLibre: null,
  ultimoMovimiento: null,
  anios: null,
  tramo: null,
  posiblePrescripcionDesde: null,
  enContrasena: null,
};

const nota = (texto: string): FilaExportadaDeSaldosAFavor => ({ ...VACIA, seccion: 'Nota', proveedor: texto });

/** Una nota con saldo a favor como fila. */
function filaDeNota(fila: FilaDeSaldoAFavorDto): FilaExportadaDeSaldosAFavor {
  return {
    ...VACIA,
    ...fila,
    seccion: 'Saldos a favor',
    proveedor: fila.proveedorNombre,
    nit: fila.proveedorNit,
    documento: numeroDelDocumento(fila.serie, fila.numero),
    emision: fila.fechaEmision,
    anios: fila.aniosDesdeElUltimoMovimiento,
    tramo: NOMBRE_DEL_TRAMO_DE_PRESCRIPCION[fila.tramo],
  };
}

/** El total por tramo, el total general y lo posiblemente prescrito, aparte. */
function filasDeTotales(reporte: ReporteDeSaldosAFavorDto): FilaExportadaDeSaldosAFavor[] {
  const { totalesPorTramo, total, posiblementePrescrito } = reporte;
  return [
    ...TRAMOS_DE_PRESCRIPCION.map((tramo) => ({
      ...VACIA,
      seccion: 'Total por tramo',
      proveedor: NOMBRE_DEL_TRAMO_DE_PRESCRIPCION[tramo],
      saldoLibre: totalesPorTramo[tramo],
    })),
    { ...VACIA, seccion: 'Total', proveedor: 'Total de saldos a favor', saldoLibre: total },
    {
      ...VACIA,
      seccion: 'Posiblemente prescritos',
      proveedor: `${posiblementePrescrito.cantidad} notas: consulte a su contador.`,
      saldoLibre: posiblementePrescrito.total,
    },
  ];
}

/** R4 en filas planas: las notas, los totales y, al final, el corte y las notas. */
export function aFilasExportadasDeSaldosAFavor(reporte: ReporteDeSaldosAFavorDto): FilaExportadaDeSaldosAFavor[] {
  return [
    ...reporte.filas.map(filaDeNota),
    ...filasDeTotales(reporte),
    nota(`Saldos al ${fechaLegible(reporte.corte)}.`),
    ...reporte.avisos.map(({ mensaje }) => nota(mensaje)),
    ...reporte.leyendas.map(nota),
  ];
}

const dinero = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'decimal' });
const texto = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'texto' });
const fecha = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'fecha' });

/** Las columnas del Excel de R4: solo se exporta, nunca se importa. */
export const columnasDeSaldosAFavor: Columna[] = [
  { clave: 'seccion', titulo: 'Sección', requerido: true, tipo: 'texto' },
  { clave: 'proveedor', titulo: 'Proveedor', requerido: true, tipo: 'texto' },
  texto('nit', 'NIT'),
  texto('documento', 'Nota de crédito'),
  fecha('emision', 'Emisión'),
  dinero('base', 'Base'),
  dinero('aplicado', 'Aplicado'),
  dinero('ajustado', 'Ajustado'),
  dinero('reintegrado', 'Reintegrado'),
  dinero('saldoLibre', 'Saldo libre'),
  fecha('ultimoMovimiento', 'Último movimiento'),
  { clave: 'anios', titulo: 'Años desde el último movimiento', requerido: false, tipo: 'entero' },
  texto('tramo', 'Tramo'),
  fecha('posiblePrescripcionDesde', 'Posible prescripción desde'),
  { clave: 'enContrasena', titulo: 'En contraseña', requerido: false, tipo: 'siNo' },
];
