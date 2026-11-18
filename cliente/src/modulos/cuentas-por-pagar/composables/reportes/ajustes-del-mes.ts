import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  CausaDelAjusteEnReporte,
  EfectoDelAjusteEnReporte,
  FilaDeDocumentoRevertido,
  ReporteDeAjustesDelMes,
} from '../../servicios/tipos-de-reportes-de-control';
import type { TotalDelReporte } from './resumen-de-reportes';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const MESES_QUE_SE_OFRECEN = 36;

export interface FiltrosDeAjustes {
  /** `AAAA-MM`. */
  mes: string;
  proveedorId: string;
  causa: CausaDelAjusteEnReporte | '';
}

export const TEXTOS_DE_CAUSA: Record<CausaDelAjusteEnReporte, string> = {
  no_recuperable: 'No recuperable',
  diferencia_menor: 'Diferencia menor',
  compensado_con_otra_cuenta: 'Compensado con otra cuenta',
};

export const TEXTOS_DE_EFECTO: Record<EfectoDelAjusteEnReporte, string> = {
  perdida: 'Pérdida',
  transitoria: 'Cuenta transitoria',
  ingreso: 'Otros ingresos',
};

export const OPCIONES_DE_CAUSA: { valor: CausaDelAjusteEnReporte | ''; texto: string }[] = [
  { valor: '', texto: 'Todas las causas' },
  ...(Object.entries(TEXTOS_DE_CAUSA) as [CausaDelAjusteEnReporte, string][])
    .map(([valor, texto]) => ({ valor, texto }))
    .sort((a, b) => a.texto.localeCompare(b.texto, 'es')),
];

/** `AAAA-MM` a «octubre de 2026». */
export function textoDeMes(mes: string): string {
  const [anio, numero] = mes.split('-');
  return `${MESES[Number(numero) - 1] ?? mes} de ${anio}`;
}

/** `AAAA-MM` del mes `desplazamiento` meses antes del de `hoy` (`AAAA-MM-DD`). */
export function mesAntesDe(hoy: string, desplazamiento: number): string {
  const [anio, mes] = hoy.split('-').map(Number) as [number, number];
  const indice = anio * 12 + (mes - 1) - desplazamiento;
  return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, '0')}`;
}

/** Por omisión se revisa el mes anterior: se mira al cerrar. */
export const filtrosDeAjustesIniciales = (hoy: string, proveedorId = ''): FiltrosDeAjustes => ({
  mes: mesAntesDe(hoy, 1),
  proveedorId,
  causa: '',
});

/** Los últimos meses, del más reciente al más antiguo, para escoger uno sin escribir fechas. */
export const opcionesDeMeses = (hoy: string): { valor: string; texto: string }[] =>
  Array.from({ length: MESES_QUE_SE_OFRECEN }, (_, i) => {
    const valor = mesAntesDe(hoy, i);
    return { valor, texto: textoDeMes(valor) };
  });

export const consultaDeAjustes = (filtros: FiltrosDeAjustes): Consulta => ({
  mes: filtros.mes,
  proveedorId: filtros.proveedorId || undefined,
  causa: filtros.causa || undefined,
});

export const cantidadDeFiltrosDeAjustes = (filtros: FiltrosDeAjustes, hoy: string): number =>
  [filtros.mes !== mesAntesDe(hoy, 1), !!filtros.proveedorId, !!filtros.causa].filter(Boolean).length;

const aCentavos = (monto: string): number => Math.round(Number(monto) * 100);

/** Lo vigente de la sección de ajustes: la suma por causa (el total de la sección incluye los anulados). */
export function vigenteDeAjustes({ totales }: ReporteDeAjustesDelMes): { cantidad: number; monto: string } {
  const cantidad = totales.porCausa.reduce((suma, t) => suma + t.cantidad, 0);
  const centavos = totales.porCausa.reduce((suma, t) => suma + aCentavos(t.monto), 0);
  return { cantidad, monto: (centavos / 100).toFixed(2) };
}

/** Filas del cuadro «por causa y efecto» (vigentes), para saber a dónde va cada monto al cerrar. */
export const totalesPorCausaYEfecto = (
  r: ReporteDeAjustesDelMes,
): { clave: string; causa: string; efecto: string; cantidad: number; monto: string }[] =>
  r.totales.porCausa.map((t) => ({
    clave: `${t.causa}-${t.efecto}`,
    causa: TEXTOS_DE_CAUSA[t.causa],
    efecto: TEXTOS_DE_EFECTO[t.efecto],
    cantidad: t.cantidad,
    monto: formatearMonto(t.monto),
  }));

/** Las cifras de arriba de R8: lo que el contador revisa primero. */
export function totalesDeAjustes(r: ReporteDeAjustesDelMes): TotalDelReporte[] {
  const { totales } = r;
  const { porSeccion } = totales;
  const vigente = vigenteDeAjustes(r);
  return [
    { etiqueta: 'Ajustes vigentes del mes', valor: formatearMonto(vigente.monto), destacado: true },
    { etiqueta: 'Cantidad de ajustes vigentes', valor: String(vigente.cantidad) },
    { etiqueta: 'Ajustes anulados', valor: formatearMonto(totales.ajustesAnulados.monto) },
    {
      etiqueta: 'Anulaciones de ajustes de otros meses',
      valor: formatearMonto(porSeccion.anulacionesDeOtrosMeses.monto),
    },
    { etiqueta: 'Compensaciones sin dinero', valor: formatearMonto(porSeccion.aplicacionesManuales.monto) },
    { etiqueta: 'Pagos a la apertura (vigentes y anulados)', valor: formatearMonto(porSeccion.pagosAApertura.monto) },
    { etiqueta: 'Documentos anulados', ...resumenDe(porSeccion.documentosAnulados) },
    { etiqueta: 'Documentos devueltos a revisión', ...resumenDe(porSeccion.documentosDesautorizados) },
  ];
}

const resumenDe = (t: { cantidad: number; monto: string }): { valor: string } => ({
  valor: `${t.cantidad} · ${formatearMonto(t.monto)}`,
});

/** Cuántas filas trae el reporte en todas sus secciones. */
export const cantidadDeFilasDeAjustes = (r: ReporteDeAjustesDelMes): number =>
  r.ajustes.length +
  r.anulacionesDeOtrosMeses.length +
  r.aplicacionesManuales.length +
  r.pagosAApertura.length +
  r.documentosAnulados.length +
  r.documentosDesautorizados.length;

/** Qué se hizo con el documento, en palabras de quien lo revisa. */
export function textoDeLaBaja(fila: Pick<FilaDeDocumentoRevertido, 'tipoDeBaja' | 'estabaAutorizado'>): string {
  if (fila.tipoDeBaja === 'desautorizado') return 'Devuelto a revisión';
  return fila.estabaAutorizado ? 'Anulado (estaba autorizado)' : 'Anulado';
}

export const lineasDeImpresionDeAjustes = (filtros: FiltrosDeAjustes, proveedor: string | null): string[] => [
  `Ajustes de ${textoDeMes(filtros.mes)}`,
  `Proveedor: ${proveedor ?? 'todos'} · Causa: ${filtros.causa ? TEXTOS_DE_CAUSA[filtros.causa] : 'todas'}`,
];
