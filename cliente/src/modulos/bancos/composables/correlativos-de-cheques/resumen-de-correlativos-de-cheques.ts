import type { Chequera } from '../../servicios/chequeras.api';
import type {
  CausaDelAnulado,
  EstadoDelNumero,
  NumeroDeCheque,
  ReporteDeCorrelativosDeCheques,
  ResumenDeCorrelativosDeCheques,
} from '../../servicios/correlativos-de-cheques.api';
import { rangoDeChequera } from '../chequeras/detalles-de-chequera';

/** El filtro por estado del detalle (el resumen siempre sale completo). */
export const OPCIONES_DE_ESTADO: Array<{ valor: EstadoDelNumero | null; texto: string }> = [
  { valor: null, texto: 'Todos los números' },
  { valor: 'disponible', texto: 'Disponibles' },
  { valor: 'emitido', texto: 'Emitidos' },
  { valor: 'anulado', texto: 'Anulados' },
  { valor: 'inutilizado', texto: 'Inutilizados' },
  { valor: 'sin_registro', texto: 'Sin registro' },
];

const TEXTO_DE_CAUSA: Record<CausaDelAnulado, string> = {
  manual: 'manual',
  caducidad: 'por caducidad',
  extraviado: 'extraviado',
};

/** Cómo se lee el estado de un número: «Anulado · extraviado», «Inutilizado → pasó al 1235». */
export function textoDelEstado(numero: Pick<NumeroDeCheque, 'estado' | 'causa' | 'pasoAlNumero'>): string {
  switch (numero.estado) {
    case 'disponible':
      return 'Disponible';
    case 'emitido':
      return 'Emitido';
    case 'anulado':
      return numero.causa ? `Anulado · ${TEXTO_DE_CAUSA[numero.causa]}` : 'Anulado';
    case 'inutilizado':
      return numero.pasoAlNumero === null ? 'Inutilizado' : `Inutilizado · su pago pasó al ${numero.pasoAlNumero}`;
    case 'sin_registro':
      return 'Sin registro: revise';
  }
}

/** Si el número necesita atención de quien revisa: un número sin fila del rango. */
export const esAlerta = (numero: Pick<NumeroDeCheque, 'estado'>): boolean => numero.estado === 'sin_registro';

/** Cuándo se imprimió, dicho para la tabla: «Sí» (con la fecha, si la dan) o «No». */
export const textoDeImpreso = (numero: Pick<NumeroDeCheque, 'impreso'>): string => (numero.impreso ? 'Sí' : 'No');

/** El desglose de los anulados: «3 (1 manual, 1 por caducidad, 1 extraviado)»; solo lo que no es cero. */
export function textoDeAnulados(anulados: ResumenDeCorrelativosDeCheques['anulados']): string {
  const partes = (Object.keys(TEXTO_DE_CAUSA) as CausaDelAnulado[])
    .filter((causa) => anulados[causa] > 0)
    .map((causa) => `${anulados[causa]} ${TEXTO_DE_CAUSA[causa]}`);
  return partes.length ? `${anulados.total} (${partes.join(', ')})` : String(anulados.total);
}

/** Las cifras de arriba del reporte, en el orden en que se lee el papel: emitidos, anulados, inutilizados, disponibles y rango. */
export function totalesDelResumen(resumen: ResumenDeCorrelativosDeCheques) {
  return [
    { etiqueta: 'Emitidos', valor: String(resumen.emitidos) },
    { etiqueta: 'Anulados', valor: textoDeAnulados(resumen.anulados) },
    { etiqueta: 'Inutilizados', valor: String(resumen.inutilizados) },
    { etiqueta: 'Disponibles', valor: String(resumen.disponibles), destacado: true },
    { etiqueta: 'Total del rango', valor: String(resumen.totalDelRango) },
  ];
}

/** Las líneas que encabezan el papel: la cuenta, la chequera (con su etiqueta si es de la carga inicial) y el filtro. */
export function lineasDelEncabezado(
  reporte: Pick<ReporteDeCorrelativosDeCheques, 'cuenta' | 'chequera'>,
  estado: EstadoDelNumero | null,
): string[] {
  const { cuenta, chequera } = reporte;
  const etiqueta = chequera.etiqueta ? ` (${chequera.etiqueta})` : '';
  const filtro = OPCIONES_DE_ESTADO.find((opcion) => opcion.valor === estado)?.texto ?? '';
  return [
    `Cuenta: ${cuenta.nombre} · ${cuenta.numero} · ${cuenta.banco}`,
    `Chequera: ${rangoDeChequera(chequera)}${etiqueta}${chequera.activa ? '' : ' · inactiva'}`,
    ...(estado ? [`Se muestran: ${filtro}`] : []),
  ];
}

/** Las chequeras de la cuenta para elegir, por serie y número: «A100-199». */
export function opcionesDeChequera(chequeras: readonly Chequera[]): Array<{ valor: string; texto: string }> {
  return [...chequeras]
    .sort((a, b) => `${a.serie ?? ''}`.localeCompare(`${b.serie ?? ''}`, 'es') || a.desde - b.desde)
    .map((chequera) => ({
      valor: chequera.id,
      texto: chequera.activa ? rangoDeChequera(chequera) : `${rangoDeChequera(chequera)} (inactiva)`,
    }));
}

/** Los números que el reporte pide revisar (sin fila en el rango), para avisarlo arriba. */
export const numerosSinRegistro = (cheques: readonly NumeroDeCheque[]): number[] =>
  cheques.filter(esAlerta).map((numero) => numero.numero);
