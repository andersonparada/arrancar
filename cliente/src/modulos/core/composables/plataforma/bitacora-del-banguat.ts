import type { ResultadoDeConsulta } from '../../servicios/monedas.api';
import type { ConsultaDeLaCarga, VueltaDeCarga } from '../../servicios/tipos-de-cambio.api';

type Tono = 'campo' | 'trigo' | 'tierra' | 'rojo';

const VUELTAS: Record<VueltaDeCarga, string> = {
  madrugada: 'Madrugada (dólar)',
  manana: 'Mañana (demás monedas)',
  noche: 'Noche (adelanta mañana)',
  arranque: 'Al arrancar',
  relleno: 'Relleno de huecos',
  manual: 'A pedido',
  lista: 'Lista de monedas',
  muestra: 'Muestra',
};

const RESULTADOS: Record<ResultadoDeConsulta, { texto: string; tono: Tono }> = {
  exito: { texto: 'Correcto', tono: 'campo' },
  sin_datos: { texto: 'Sin datos', tono: 'tierra' },
  error: { texto: 'Falló', tono: 'rojo' },
  valor_fuera_de_rango: { texto: 'Valor fuera de rango', tono: 'rojo' },
  valor_ambiguo: { texto: 'Compra y venta distintas', tono: 'rojo' },
  variacion_excesiva: { texto: 'Cambió demasiado', tono: 'rojo' },
  sin_dolar_del_dia: { texto: 'Falta el dólar del día', tono: 'trigo' },
  convencion_dudosa: { texto: 'Convención dudosa', tono: 'rojo' },
  sin_convencion: { texto: 'Código sin convención', tono: 'rojo' },
};

/** Cómo corregirlo: lo que soporte puede hacer con cada resultado que no es un éxito. */
const QUE_HACER: Partial<Record<ResultadoDeConsulta, string>> = {
  error: 'El Banguat no respondió. Se reintenta en la próxima vuelta; si urge, use «Cargar ahora» o ingrese el valor.',
  sin_datos: 'El Banguat no tenía valores para esas fechas. Los fines de semana y asuetos no se publican.',
  valor_fuera_de_rango: 'El dólar vino fuera de lo razonable y no se guardó. Si el valor es cierto, ingréselo a mano.',
  valor_ambiguo: 'El Banguat dio compra y venta distintas y no se guardó. Ingrese el valor a mano con su motivo.',
  variacion_excesiva:
    'El valor cambió más de 25 % contra el de la semana anterior y no se guardó. Revise el código en Monedas; si la variación es real (una devaluación), ingrese el tipo a mano con su motivo.',
  sin_dolar_del_dia:
    'Todavía no está guardado el dólar de esa fecha, y sin él no se puede pasar a quetzales. Queda como hueco y se vuelve a pedir en la vuelta de la noche o al día siguiente; si urge, cargue primero el dólar.',
  convencion_dudosa:
    'El valor llegó con aspecto de estar al revés (por ejemplo, unidades por dólar en vez de dólares por unidad) y no se guardó. Revise el código en Monedas; si el valor es cierto, ingréselo a mano con su motivo.',
  sin_convencion:
    'Este código del Banguat aún no tiene su convención comprobada y no se carga. Quítelo en Monedas o pida que se compruebe antes de usarlo.',
};

const MOTIVOS_DE_RECHAZO: Record<string, string> = {
  variacion_excesiva: 'cambió más de 25 % y no se guardó',
  valor_ambiguo: 'compra y venta distintas, no se guardó',
  valor_fuera_de_rango: 'fuera de rango, no se guardó',
  dato_invalido: 'dato inválido, no se guardó',
  sin_dolar_del_dia: 'sin el dólar de esa fecha, no se guardó (queda como hueco)',
  convencion_dudosa: 'parece venir al revés, no se guardó',
  sin_convencion: 'el código no tiene convención comprobada, no se guardó',
};

export const nombreDeLaVuelta = (vuelta: VueltaDeCarga): string => VUELTAS[vuelta];

export const resultadoDeLaConsulta = (resultado: ResultadoDeConsulta) => RESULTADOS[resultado];

export const quehacerConElResultado = (resultado: ResultadoDeConsulta): string | null => QUE_HACER[resultado] ?? null;

const FECHA_ISO = /\d{4}-\d{2}-\d{2}/g;
const RECHAZO = /^(\S+ \S+): (\w+)$/;

/**
 * El detalle de una consulta, línea por línea y en palabras: los rechazos (`EUR 2026-11-17: variacion_excesiva`) y los
 * avisos de más de 3 % de cambio. Las fechas van como las muestra la empresa.
 */
export function lineasDelDetalle(detalle: string | null, formatearFecha: (fecha: string) => string): string[] {
  if (!detalle) return [];
  return detalle.split(' | ').map((linea) => {
    const rechazo = RECHAZO.exec(linea);
    const motivo = rechazo?.[2] ? MOTIVOS_DE_RECHAZO[rechazo[2]] : undefined;
    const texto = rechazo && motivo ? `${rechazo[1]}: ${motivo}` : linea;
    return texto.replace(FECHA_ISO, formatearFecha);
  });
}

/** Una línea con lo que se pidió: «USD · 18/11/2026» o «EUR · 12/11/2026 al 18/11/2026». */
export function resumenDeLaConsulta(consulta: ConsultaDeLaCarga, formatearFecha: (fecha: string) => string): string {
  const moneda = consulta.moneda ?? (consulta.operacion === 'VariablesDisponibles' ? 'Lista' : 'Dólar y otras');
  const { desde, hasta } = consulta;
  if (!desde || !hasta) return moneda;
  const fechas = desde === hasta ? formatearFecha(desde) : `${formatearFecha(desde)} al ${formatearFecha(hasta)}`;
  return `${moneda} · ${fechas}`;
}
