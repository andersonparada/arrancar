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

/** Las cifras de arriba de R8: lo que el contador revisa primero. */
export function totalesDeAjustes({ totales }: ReporteDeAjustesDelMes): TotalDelReporte[] {
  const { porSeccion } = totales;
  return [
    { etiqueta: 'Ajustes vigentes del mes', valor: formatearMonto(porSeccion.ajustes.monto), destacado: true },
    { etiqueta: 'Cantidad de ajustes', valor: String(porSeccion.ajustes.cantidad) },
    { etiqueta: 'Ajustes anulados', valor: formatearMonto(totales.ajustesAnulados.monto) },
    { etiqueta: 'Compensaciones sin dinero', valor: formatearMonto(porSeccion.aplicacionesManuales.monto) },
    { etiqueta: 'Pagos a la apertura', valor: formatearMonto(porSeccion.pagosAApertura.monto) },
    { etiqueta: 'Documentos anulados', valor: String(porSeccion.documentosAnulados.cantidad) },
    { etiqueta: 'Documentos devueltos a revisión', valor: String(porSeccion.documentosDesautorizados.cantidad) },
  ];
}

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
