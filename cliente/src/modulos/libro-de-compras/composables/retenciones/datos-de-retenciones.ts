import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import {
  GRUPOS_DE_ENTERO,
  type EstadoDelEntero,
  type FiltrosDelReporte,
  type GrupoDelMes,
  type RetencionDelMes,
} from '../../servicios/retenciones.api';
import {
  NOMBRES_CORTOS_DE_GRUPOS,
  NOMBRES_DE_FILTRO_DE_CONSTANCIA,
  NOMBRES_DE_FILTRO_DE_DOCUMENTOS,
  VENTANA_DE_RETENCIONES,
} from '../../textos-de-retenciones';
import { periodoAnterior } from '../libro/datos-del-libro';

/** Los cuatro grupos de entero en el orden del servidor. */
export const GRUPOS_EN_ORDEN = GRUPOS_DE_ENTERO;

/** Al abrir: el mes anterior (el que se está por pagar) y sin filtros. */
export const filtrosIniciales = (hoy: Date): FiltrosDelReporte => ({
  mes: periodoAnterior(hoy),
  grupo: '',
  constancia: 'todas',
  documentos: 'todos',
});

const porTexto = <T extends string>(a: OpcionBuscable<T>, b: OpcionBuscable<T>) =>
  a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' });

function opcionesPorNombre<T extends string>(nombres: Record<T, string>): OpcionBuscable<T>[] {
  return (Object.keys(nombres) as T[]).map((valor) => ({ valor, texto: nombres[valor] })).sort(porTexto);
}

/** «Todos los grupos» primero y los grupos en orden de nombre. */
export const opcionesDeGrupo = (): OpcionBuscable<string>[] => [
  { valor: '', texto: VENTANA_DE_RETENCIONES.todosLosGrupos },
  ...opcionesPorNombre(Object.fromEntries(GRUPOS_DE_ENTERO.map((g) => [g, NOMBRES_CORTOS_DE_GRUPOS[g]]))),
];

export const opcionesDeConstancia = () => opcionesPorNombre(NOMBRES_DE_FILTRO_DE_CONSTANCIA);
export const opcionesDeDocumentos = () => opcionesPorNombre(NOMBRES_DE_FILTRO_DE_DOCUMENTOS);

type Tono = 'campo' | 'trigo' | 'tierra' | 'rojo';

const TONOS_DE_ESTADO: Record<EstadoDelEntero, Tono> = {
  sin_retenciones: 'tierra',
  pendiente: 'trigo',
  vencido: 'rojo',
  enterado: 'campo',
  con_diferencia: 'trigo',
};

export const tonoDelEstado = (estado: EstadoDelEntero): Tono => TONOS_DE_ESTADO[estado];

/** «Vence el», «Venció el» o «Plazo»: cómo se lee la fecha límite según el estado. */
export function prefijoDelPlazo(estado: EstadoDelEntero): string {
  if (estado === 'vencido') return 'Venció el';
  return estado === 'pendiente' || estado === 'con_diferencia' ? 'Vence el' : 'Plazo:';
}

/** `true` si todavía queda algo por pagar o por revisar en el grupo. */
export const sePuedePagar = (grupo: GrupoDelMes): boolean => grupo.estado !== 'sin_retenciones';

/** «5 %» a partir de «5.00»; vacío si no hay porcentaje (ISR por escalones). */
export function textoDelPorcentaje(porcentaje: string | null): string {
  if (porcentaje === null) return '';
  return `${porcentaje.replace(/\.00$/, '')} %`;
}

/** «IVA 5 %» o «ISR» según la retención. */
export function nombreDelImpuesto(retencion: Pick<RetencionDelMes, 'impuesto' | 'porcentaje'>): string {
  const impuesto = retencion.impuesto.toUpperCase();
  const porcentaje = textoDelPorcentaje(retencion.porcentaje);
  return porcentaje ? `${impuesto} ${porcentaje}` : impuesto;
}

/** Las retenciones a las que se les puede anotar constancia en lote: tienen monto y todavía no tienen constancia. */
export const idsParaAnotar = (retenciones: readonly RetencionDelMes[]): string[] =>
  retenciones.filter((r) => !r.enCero && !r.constanciaNumero).map((r) => r.id);

/** Marca o desmarca una; el orden de marcado no importa. */
export const alternarId = (ids: readonly string[], id: string): string[] =>
  ids.includes(id) ? ids.filter((existente) => existente !== id) : [...ids, id];

/** Quita de la selección lo que ya no está en la lista (al cambiar de mes o de filtros). */
export const depurarSeleccion = (ids: readonly string[], retenciones: readonly RetencionDelMes[]): string[] =>
  ids.filter((id) => retenciones.some((r) => r.id === id));

/** `true` si ya están marcadas todas las que se pueden marcar (y hay al menos una). */
export const todasMarcadas = (ids: readonly string[], posibles: readonly string[]): boolean =>
  posibles.length > 0 && posibles.every((id) => ids.includes(id));

/** Las retenciones marcadas, en el orden de la tabla. */
export const marcadas = (ids: readonly string[], retenciones: readonly RetencionDelMes[]): RetencionDelMes[] =>
  retenciones.filter((r) => ids.includes(r.id));

/** «FACT A-123», o el número solo. */
export const nombreDelDocumento = (documento: RetencionDelMes['documento']): string => {
  const numero = documento.serie ? `${documento.serie}-${documento.numero}` : documento.numero;
  return documento.tipoDte ? `${documento.tipoDte} ${numero}` : numero;
};

/** Cuántas hay y de cuánto, para el texto de la selección: «3 retenciones». */
export const textoDeCantidad = (cantidad: number, singular: string, plural: string): string =>
  `${cantidad} ${cantidad === 1 ? singular : plural}`;
