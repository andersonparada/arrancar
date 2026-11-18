import type { Columna } from '../../core/intercambio/aplicacion/columnas.js';
import type {
  FilaDeDocumentoAlCorteDto,
  ReporteDeDocumentosAUnaFechaDto,
} from '../aplicacion/dto/saldos-al-corte.dto.js';
import { fechaLegible } from '../dominio/avisos.js';
import type { EstadoDePago } from '../dominio/pagos.js';
import type { TramoDeAntiguedad } from '../dominio/saldo-al-corte.js';

/** Una fila del Excel de R2: un cargo, el total de lo filtrado o una nota (corte, avisos y leyendas). */
export interface FilaExportadaDeDocumentos {
  seccion: string;
  proveedor: string;
  nit: string | null;
  tipo: string | null;
  documento: string | null;
  emision: string | null;
  vence: string | null;
  diasVencido: number | null;
  tramo: string | null;
  total: string | null;
  retenciones: string | null;
  neto: string | null;
  anterioresAlInicio: string | null;
  notasAplicadas: string | null;
  pagado: string | null;
  ajustado: string | null;
  saldo: string | null;
  comprometido: string | null;
  estadoDePago: string | null;
  autorizado: boolean | null;
  contrasena: string | null;
  pagoPrometido: string | null;
  retencionesPorPracticar: string | null;
}

const NOMBRE_DEL_TRAMO: Record<TramoDeAntiguedad, string> = {
  por_vencer: 'Por vencer',
  de_1_a_30: '1 a 30 días',
  de_31_a_60: '31 a 60 días',
  de_61_a_90: '61 a 90 días',
  mas_de_90: 'Más de 90 días',
  sin_vencimiento: 'Sin vencimiento',
};

const NOMBRE_DEL_ESTADO: Record<EstadoDePago, string> = {
  pendiente: 'Pendiente',
  en_parte: 'Pagado en parte',
  comprometido_en_parte: 'Comprometido en parte',
  comprometido: 'Comprometido',
  pagado: 'Pagado',
};

const SIN_DATOS: FilaExportadaDeDocumentos = {
  seccion: '',
  proveedor: '',
  nit: null,
  tipo: null,
  documento: null,
  emision: null,
  vence: null,
  diasVencido: null,
  tramo: null,
  total: null,
  retenciones: null,
  neto: null,
  anterioresAlInicio: null,
  notasAplicadas: null,
  pagado: null,
  ajustado: null,
  saldo: null,
  comprometido: null,
  estadoDePago: null,
  autorizado: null,
  contrasena: null,
  pagoPrometido: null,
  retencionesPorPracticar: null,
};

export const numeroDelDocumento = (serie: string | null, numero: string): string =>
  serie ? `${serie}-${numero}` : numero;

type DatosDelCargo = Pick<
  FilaExportadaDeDocumentos,
  | 'proveedor'
  | 'nit'
  | 'tipo'
  | 'documento'
  | 'emision'
  | 'vence'
  | 'diasVencido'
  | 'tramo'
  | 'estadoDePago'
  | 'autorizado'
  | 'contrasena'
  | 'pagoPrometido'
>;

/** Quién, qué documento y cómo va: lo que no es dinero en una fila del Excel. */
function datosDelCargo(fila: FilaDeDocumentoAlCorteDto): DatosDelCargo {
  return {
    proveedor: fila.proveedorNombre,
    nit: fila.proveedorNit,
    tipo: fila.tipo,
    documento: numeroDelDocumento(fila.serie, fila.numero),
    emision: fila.fechaEmision,
    vence: fila.vencimiento,
    diasVencido: fila.diasVencido,
    tramo: NOMBRE_DEL_TRAMO[fila.tramo],
    estadoDePago: NOMBRE_DEL_ESTADO[fila.estadoDePago],
    autorizado: fila.autorizado,
    contrasena: fila.contrasena?.numero ?? null,
    pagoPrometido: fila.contrasena?.pagoPrometido ?? null,
  };
}

/** Los montos se llaman igual en la API y en el Excel: se copian tal cual. */
function deCargo({ filas }: ReporteDeDocumentosAUnaFechaDto): FilaExportadaDeDocumentos[] {
  return filas.map((fila) => ({ ...SIN_DATOS, ...fila, ...datosDelCargo(fila), seccion: 'Documentos' }));
}

const nota = (texto: string): FilaExportadaDeDocumentos => ({ ...SIN_DATOS, seccion: 'Nota', proveedor: texto });

/** R2 en filas planas: los cargos, el total de todo lo filtrado y, al final, el corte, los avisos y las leyendas. */
export function aFilasExportadasDeDocumentos(reporte: ReporteDeDocumentosAUnaFechaDto): FilaExportadaDeDocumentos[] {
  const { totales } = reporte;
  return [
    ...deCargo(reporte),
    {
      ...SIN_DATOS,
      seccion: 'Total',
      proveedor: `${reporte.total} documentos`,
      total: totales.total,
      retenciones: totales.retenciones,
      pagado: totales.pagado,
      saldo: totales.saldo,
      comprometido: totales.comprometido,
    },
    nota(`Saldos al ${fechaLegible(reporte.corte)}.`),
    ...reporte.avisos.map(({ mensaje }) => nota(mensaje)),
    ...reporte.leyendas.map(nota),
  ];
}

const dinero = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'decimal' });
const texto = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'texto' });
const fecha = (clave: string, titulo: string): Columna => ({ clave, titulo, requerido: false, tipo: 'fecha' });

/** Las columnas del Excel de R2: solo se exporta, nunca se importa. */
export const columnasDeDocumentosAUnaFecha: Columna[] = [
  { clave: 'seccion', titulo: 'Sección', requerido: true, tipo: 'texto' },
  { clave: 'proveedor', titulo: 'Proveedor', requerido: true, tipo: 'texto' },
  texto('nit', 'NIT'),
  texto('tipo', 'Tipo'),
  texto('documento', 'Documento'),
  fecha('emision', 'Emisión'),
  fecha('vence', 'Vence'),
  { clave: 'diasVencido', titulo: 'Días vencido', requerido: false, tipo: 'entero' },
  texto('tramo', 'Tramo'),
  dinero('total', 'Total'),
  dinero('retenciones', 'Retenciones'),
  dinero('neto', 'Neto'),
  dinero('anterioresAlInicio', 'Pagos y notas anteriores a la fecha de inicio'),
  dinero('notasAplicadas', 'Notas aplicadas'),
  dinero('pagado', 'Pagado'),
  dinero('ajustado', 'Ajustado'),
  dinero('saldo', 'Saldo'),
  dinero('comprometido', 'Comprometido'),
  texto('estadoDePago', 'Estado de pago'),
  { clave: 'autorizado', titulo: 'Autorizado', requerido: false, tipo: 'siNo' },
  texto('contrasena', 'Contraseña'),
  fecha('pagoPrometido', 'Pago prometido'),
  dinero('retencionesPorPracticar', 'Retenciones por practicar'),
];
