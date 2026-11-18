import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  FormaDelPago,
  LineaDePagoRealizado,
  ReporteDePagosRealizados,
} from '../../servicios/tipos-de-reportes-de-pagos';
import { esFechaCompleta, primerDiaDelMes } from './fechas-de-reportes';
import type { TotalDelReporte } from './resumen-de-reportes';

export const FILAS_DE_PAGOS_POR_PAGINA = 50;
/** Lo máximo que se imprime de una vez (CP5-h). */
export const TOPE_DE_IMPRESION_DE_PAGOS = 2000;
const MESES_MAXIMOS = 24;

export type EstadoPedido = 'vigentes' | 'anulados' | 'todos';

/** Lo que se elige en R6; los textos vacíos significan «todos». */
export interface FiltrosDePagos {
  desde: string;
  hasta: string;
  proveedorId: string;
  forma: FormaDelPago | '';
  estado: EstadoPedido;
  posfechados: boolean;
  mismaPersona: boolean;
}

export const TEXTOS_DE_FORMA: Record<FormaDelPago, string> = {
  cheque: 'Cheque',
  nota_de_debito: 'Nota de débito',
  nota_ligada: 'Nota de débito ligada',
  cuenta_de_apertura: 'Cuenta de apertura',
  efectivo: 'Efectivo',
};

export const OPCIONES_DE_FORMA: { valor: FormaDelPago | ''; texto: string }[] = [
  { valor: '', texto: 'Todas las formas' },
  ...(Object.entries(TEXTOS_DE_FORMA) as [FormaDelPago, string][])
    .map(([valor, texto]) => ({ valor, texto }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es')),
];

export const OPCIONES_DE_ESTADO: { valor: EstadoPedido; texto: string }[] = [
  { valor: 'vigentes', texto: 'Solo vigentes' },
  { valor: 'anulados', texto: 'Solo anulados' },
  { valor: 'todos', texto: 'Vigentes y anulados' },
];

/** El mes en curso, hasta hoy: así abre el reporte; un enlace puede pedir otro proveedor. */
export const filtrosDePagosIniciales = (hoy: string, proveedorId = ''): FiltrosDePagos => ({
  desde: primerDiaDelMes(hoy),
  hasta: hoy,
  proveedorId,
  forma: '',
  estado: 'vigentes',
  posfechados: false,
  mismaPersona: false,
});

/** Lo que se manda al servidor para exportar: lo que quedó en «todos» o «no» no se manda. */
export const consultaParaExportarPagos = (filtros: FiltrosDePagos): Consulta => ({
  desde: filtros.desde,
  hasta: filtros.hasta,
  proveedorId: filtros.proveedorId || undefined,
  forma: filtros.forma || undefined,
  estado: filtros.estado,
  posfechados: filtros.posfechados || undefined,
  mismaPersona: filtros.mismaPersona || undefined,
});

export const consultaDePagos = (filtros: FiltrosDePagos, pagina: number, limite: number): Consulta => ({
  ...consultaParaExportarPagos(filtros),
  pagina,
  limite,
});

/** El rango pasa de 24 meses si `hasta` queda después de `desde` más 24 meses. */
function superaElMaximo(desde: string, hasta: string): boolean {
  const [anio, mes, dia] = desde.split('-').map(Number) as [number, number, number];
  const limite = new Date(Date.UTC(anio, mes - 1 + MESES_MAXIMOS + 1, 0));
  limite.setUTCDate(Math.min(dia, limite.getUTCDate()));
  return hasta > limite.toISOString().slice(0, 10);
}

/** Qué decirle a quien escribió mal el rango; `undefined` si sirve. */
export function errorDeRangoDePagos(desde: string, hasta: string): string | undefined {
  if (!esFechaCompleta(desde) || !esFechaCompleta(hasta)) return 'Escriba las dos fechas completas.';
  if (desde > hasta) return 'La fecha inicial no puede ser posterior a la final.';
  if (superaElMaximo(desde, hasta)) return `El rango no puede pasar de ${MESES_MAXIMOS} meses: acórtelo.`;
  return undefined;
}

export function cantidadDeFiltrosDePagos(filtros: FiltrosDePagos, hoy: string): number {
  const base = filtrosDePagosIniciales(hoy);
  return [
    filtros.desde !== base.desde || filtros.hasta !== base.hasta,
    !!filtros.proveedorId,
    !!filtros.forma,
    filtros.estado !== 'vigentes',
    filtros.posfechados,
    filtros.mismaPersona,
  ].filter(Boolean).length;
}

type DeQuienRegistro = Pick<LineaDePagoRealizado, 'registroElDocumento' | 'completoElDocumento'>;

/** «Ingresó Ana · Completó Luis»; vacío si el servidor no sabe quién fue. */
export const textoDeQuienRegistro = (fila: DeQuienRegistro): string =>
  [
    fila.registroElDocumento ? `Ingresó ${fila.registroElDocumento}` : '',
    fila.completoElDocumento ? `Completó ${fila.completoElDocumento}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

/** «Serie-número» del documento pagado. */
export const textoDelDocumentoPagado = (fila: Pick<LineaDePagoRealizado, 'serie' | 'numeroDelDocumento'>): string =>
  fila.serie ? `${fila.serie}-${fila.numeroDelDocumento}` : fila.numeroDelDocumento;

/** Las cifras de arriba de R6: de todo lo filtrado, no solo de la página que se ve. */
export function totalesDePagos({ totales, total }: ReporteDePagosRealizados): TotalDelReporte[] {
  const cifras: TotalDelReporte[] = [
    { etiqueta: 'Monto pagado (vigentes)', valor: formatearMonto(totales.vigentes.monto), destacado: true },
    { etiqueta: 'Retenciones descontadas', valor: formatearMonto(totales.vigentes.retencionDescontada) },
    { etiqueta: 'Cubre (monto + retención)', valor: formatearMonto(totales.vigentes.cubre) },
    { etiqueta: total === 1 ? 'Línea' : 'Líneas', valor: String(total) },
  ];
  if (totales.anulados.lineas > 0) {
    cifras.push({ etiqueta: 'Anulados (no suman)', valor: formatearMonto(totales.anulados.monto) });
  }
  return cifras;
}

/** Los pagos vigentes por forma, para el cuadro de totales. */
export const totalesVigentesPorForma = ({ totales }: ReporteDePagosRealizados) =>
  totales.porForma.filter((t) => t.estado === 'vigente').map((t) => ({ ...t, texto: TEXTOS_DE_FORMA[t.forma] }));

const textoDeEstadoPedido = (estado: EstadoPedido): string =>
  OPCIONES_DE_ESTADO.find((o) => o.valor === estado)?.texto ?? estado;

export const lineasDeImpresionDePagos = (filtros: FiltrosDePagos, proveedor: string | null): string[] => [
  `Pagos del ${formatearFecha(filtros.desde)} al ${formatearFecha(filtros.hasta)}`,
  `Proveedor: ${proveedor ?? 'todos'} · Forma: ${filtros.forma ? TEXTOS_DE_FORMA[filtros.forma] : 'todas'}`,
  [
    textoDeEstadoPedido(filtros.estado),
    filtros.posfechados ? 'solo posfechados' : '',
    filtros.mismaPersona ? 'solo donde quien registró o autorizó el documento registró el pago' : '',
  ]
    .filter(Boolean)
    .join(', '),
];

/** Imprimir trae todo lo filtrado en una sola petición, hasta 2,000 filas; con más se acota el filtro o se exporta. */
export function estadoDeImpresionDePagos(total: number): { puede: boolean; mensaje: string } {
  if (total === 0) return { puede: false, mensaje: 'No hay filas que imprimir con este filtro.' };
  if (total > TOPE_DE_IMPRESION_DE_PAGOS) {
    const mensaje = `Son ${total} filas: acote el filtro o use Excel (se imprimen hasta ${TOPE_DE_IMPRESION_DE_PAGOS}).`;
    return { puede: false, mensaje };
  }
  return { puede: true, mensaje: '' };
}
