import type { ConsultaDeLaLista, Moneda, MuestraDelBanguat, OpcionDelBanguat } from '../../servicios/monedas.api';
import type { EstadoDeLaSerie } from '../../servicios/tipos-de-cambio.api';
import { textoDeLaConvencion } from './convenciones-del-banguat';

export interface FiltrosDeMonedas {
  conCodigo: boolean;
  activas: boolean;
}

/** Las monedas por nombre, solo las que cumplen los filtros marcados. */
export function filtrarMonedas(monedas: Moneda[], filtros: FiltrosDeMonedas): Moneda[] {
  return monedas
    .filter((m) => (!filtros.conCodigo || m.codigoBanguat !== null) && (!filtros.activas || m.activa))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Las monedas de las que hay tipos que ver: las extranjeras activas o con código del Banguat, por nombre. */
export function monedasParaTipos(monedas: Moneda[]): Moneda[] {
  return monedas
    .filter((m) => m.codigo !== 'GTQ' && (m.activa || m.codigoBanguat !== null))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** La moneda con que abre la pantalla: el dólar si está, si no la primera por nombre; vacío si no hay ninguna. */
export function monedaInicial(monedas: Moneda[]): string {
  const disponibles = monedasParaTipos(monedas);
  return (disponibles.find((m) => m.codigo === 'USD') ?? disponibles[0])?.codigo ?? '';
}

/** «Euro (24) · USD por unidad» o «—» si no tiene código; la convención sale de la lista del Banguat. */
export function textoDelCodigo(moneda: Moneda, lista: OpcionDelBanguat[] = []): string {
  if (moneda.codigoBanguat === null) return '—';
  const base = moneda.descripcionBanguat
    ? `${moneda.descripcionBanguat} (${moneda.codigoBanguat})`
    : `Código ${moneda.codigoBanguat}`;
  const convencion = textoDeLaConvencion(lista.find((o) => o.codigo === moneda.codigoBanguat)?.convencion);
  return convencion ? `${base} · ${convencion}` : base;
}

/** El estado de la serie de una moneda, si tiene código del Banguat. */
export const serieDe = (moneda: Moneda, series: EstadoDeLaSerie[]): EstadoDeLaSerie | undefined =>
  series.find((s) => s.moneda === moneda.codigo);

/** El aviso de atraso de una serie, con palabras; `null` si va al día o la moneda no se carga. */
export function avisoDeAtraso(serie: EstadoDeLaSerie | undefined): string | null {
  if (!serie?.atrasada) return null;
  if (serie.diasDeAtraso === null) return 'Nunca se ha cargado su tipo de cambio.';
  const dias = serie.diasDeAtraso;
  const [uno, varios] = serie.codigoBanguat === 2 ? ['día', 'días'] : ['día hábil', 'días hábiles'];
  return `Sin tipo nuevo hace ${dias} ${dias === 1 ? uno : varios}.`;
}

/** La última vez que el Banguat dio su lista de monedas, o `null` si nunca se actualizó. */
export function ultimaActualizacionDeLaLista(lista: OpcionDelBanguat[]): string | null {
  const vistas = lista.map((o) => o.vistaPorUltimaVez).sort();
  return vistas.at(-1) ?? null;
}

export interface MensajeDeResultado {
  tipo: 'exito' | 'info' | 'error';
  mensaje: string;
}

const plural = (cantidad: number, uno: string, varios: string) => `${cantidad} ${cantidad === 1 ? uno : varios}`;

/** Lo que se le dice a soporte tras «Actualizar lista»: qué pasó y, si falló, qué hacer. */
export function mensajeDeActualizacion(consulta: ConsultaDeLaLista): MensajeDeResultado {
  if (consulta.resultado === 'error')
    return {
      tipo: 'error',
      mensaje: 'El Banguat no respondió; la lista quedó como estaba. Intente de nuevo en unos minutos.',
    };
  if (consulta.resultado === 'sin_datos')
    return { tipo: 'info', mensaje: 'El Banguat respondió sin monedas; la lista quedó como estaba.' };
  if (consulta.nuevas === 0 && consulta.noDisponibles === 0)
    return { tipo: 'exito', mensaje: 'La lista ya estaba al día.' };
  const partes = [
    consulta.nuevas > 0 ? plural(consulta.nuevas, 'moneda nueva', 'monedas nuevas') : null,
    consulta.noDisponibles > 0 ? plural(consulta.noDisponibles, 'ya no disponible', 'ya no disponibles') : null,
  ].filter((parte) => parte !== null);
  return { tipo: 'exito', mensaje: `Lista actualizada: ${partes.join(' y ')}.` };
}

function motivoAmbiguo(moneda: string | null): string {
  return moneda === 'USD'
    ? 'El Banguat da compra distinta de venta para este código'
    : 'El Banguat da compra y venta con más de 3 % de diferencia para este código';
}

/** Qué dice la muestra del código, con palabras; el último valor es lo que se compara con lo que se espera. */
export function mensajeDeMuestra(muestra: MuestraDelBanguat): MensajeDeResultado {
  if (muestra.resultado === 'error')
    return { tipo: 'error', mensaje: 'No se pudo consultar al Banguat. Intente de nuevo en un momento.' };
  if (muestra.resultado === 'valor_ambiguo')
    return {
      tipo: 'error',
      mensaje: `${motivoAmbiguo(muestra.moneda)}: no se cargaría solo. Revise que sea el correcto.`,
    };
  if (muestra.valores.length === 0)
    return { tipo: 'info', mensaje: 'El Banguat no publicó valores para este código en los últimos 7 días.' };
  const sinDolar = muestra.valores.filter((valor) => valor.referencia === null).length;
  const base = `${plural(muestra.valores.length, 'valor', 'valores')} en los últimos 7 días`;
  if (sinDolar === 0) return { tipo: 'exito', mensaje: `${base}.` };
  const dias = plural(sinDolar, 'día', 'días');
  return {
    tipo: 'info',
    mensaje: `${base}; en ${dias} aún no está guardado el dólar y no se puede pasar a quetzales.`,
  };
}
