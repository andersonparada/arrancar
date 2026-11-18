import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  ConsultaDeRetiros,
  EstadoBuscadoDeRetiro,
  EstadoDeRetiro,
  FormaDeRetiro,
  RetiroResumen,
} from '../../servicios/tipos-de-retiros';

export const RETIROS_POR_PAGINA = 24;

/** Lo que el usuario escoge en «Retiros de efectivo»; el texto vacío es «sin fecha». */
export interface FiltrosDeRetiros {
  estado: EstadoBuscadoDeRetiro;
  /** Con fecha, la lista dice el efectivo que estaba en manos de los custodios a esa fecha. */
  corte: string;
  desde: string;
  hasta: string;
  soloConDisponible: boolean;
}

/** Al abrir: lo que está por liquidar, que es el efectivo que anda en manos de alguien. */
export const filtrosInicialesDeRetiros = (): FiltrosDeRetiros => ({
  estado: 'abierto',
  corte: '',
  desde: '',
  hasta: '',
  soloConDisponible: false,
});

export const OPCIONES_DE_ESTADO_DE_RETIRO: { valor: EstadoBuscadoDeRetiro; texto: string }[] = [
  { valor: 'abierto', texto: 'Por liquidar' },
  { valor: 'liquidado', texto: 'Liquidados' },
  { valor: 'anulado', texto: 'Anulados' },
  { valor: 'todos', texto: 'Todos' },
];

const NOMBRES_DE_ESTADO: Record<EstadoDeRetiro, string> = {
  abierto: 'Por liquidar',
  liquidado: 'Liquidado',
  anulado: 'Anulado',
};

export const nombreDelEstadoDeRetiro = (estado: EstadoDeRetiro): string => NOMBRES_DE_ESTADO[estado];

const NOMBRES_DE_FORMA: Record<FormaDeRetiro, string> = { cheque: 'Cheque', nota_de_debito: 'Nota de débito' };

/** «Cheque 1523» o «Nota de débito 45»: el documento que Bancos creó para el retiro. */
export const documentoDelRetiro = (forma: FormaDeRetiro, numero: number): string =>
  `${NOMBRES_DE_FORMA[forma]} ${numero}`;

/** Lo que se manda al servidor: nada de lo que quedó en «sin fecha». */
export function consultaDeRetiros(filtros: FiltrosDeRetiros, pagina: number): ConsultaDeRetiros {
  return {
    estado: filtros.estado,
    corte: filtros.corte || undefined,
    desde: filtros.desde || undefined,
    hasta: filtros.hasta || undefined,
    soloConDisponible: filtros.soloConDisponible ? true : undefined,
    pagina,
    limite: RETIROS_POR_PAGINA,
  };
}

/** Cuántos filtros distintos de la forma de abrir hay. */
export function cantidadDeFiltrosDeRetiros(filtros: FiltrosDeRetiros): number {
  const { estado, soloConDisponible, ...fechas } = filtros;
  return Object.values(fechas).filter(Boolean).length + (estado === 'abierto' ? 0 : 1) + (soloConDisponible ? 1 : 0);
}

const MILISEGUNDOS_POR_DIA = 86_400_000;

/** Los días entre dos fechas `AAAA-MM-DD` (cero si la primera es posterior). */
export function diasEntre(desde: string, hasta: string): number {
  const dias = Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / MILISEGUNDOS_POR_DIA);
  return Number.isNaN(dias) ? 0 : Math.max(0, dias);
}

/** «hoy», «hace 1 día» o «hace 12 días»: cuánto lleva el efectivo en manos del custodio. */
export function textoDeAntiguedad(fecha: string, hoy: string): string {
  const dias = diasEntre(fecha, hoy);
  if (dias === 0) return 'hoy';
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;
}

/** Lo que se ve de un retiro abierto o cerrado en su tarjeta; con corte, el disponible es el de esa fecha. */
export function detallesDeLaFilaDeRetiro(retiro: RetiroResumen, hoy: string, corte: string): DetalleDeRegistro[] {
  const antiguedad = retiro.estado === 'abierto' ? ` (${textoDeAntiguedad(retiro.fecha, hoy)})` : '';
  return [
    { etiqueta: 'Custodio', valor: retiro.custodio },
    { etiqueta: 'Documento', valor: documentoDelRetiro(retiro.forma, retiro.documento) },
    { etiqueta: 'Fecha', valor: `${formatearFecha(retiro.fecha)}${antiguedad}` },
    { etiqueta: 'Retirado', valor: formatearMonto(retiro.monto) },
    { etiqueta: 'Pagado', valor: formatearMonto(retiro.pagado) },
    {
      etiqueta: corte ? `Disponible al ${formatearFecha(corte)}` : 'Disponible',
      valor: formatearMonto(retiro.disponible),
    },
  ];
}

/** La marca de la tarjeta: lo cerrado se nombra; un abierto de un mes anterior avisa que ya pasó el mes. */
export function marcaDeLaFilaDeRetiro(retiro: Pick<RetiroResumen, 'estado' | 'deMesAnterior'>): string | undefined {
  if (retiro.estado !== 'abierto') return nombreDelEstadoDeRetiro(retiro.estado);
  return retiro.deMesAnterior ? 'De un mes anterior' : undefined;
}

/** El aviso de fin de mes, una sola vez por texto, para mostrarlo arriba de la lista. */
export function avisosDeMesAnterior(retiros: readonly RetiroResumen[]): string[] {
  return [...new Set(retiros.flatMap(({ aviso }) => (aviso ? [aviso] : [])))];
}
