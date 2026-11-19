import type { Comprobante } from './comprobantes.js';
import { ComprobanteRepuesto, ComprobanteYaAnulado } from './errores-de-comprobantes.js';
import {
  ComprobanteNoEsDelFondo,
  FechaDeLaReposicionInvalida,
  ReposicionCobrada,
  ReposicionDelCierre,
  ReposicionSinComprobantes,
  ReposicionSinMonto,
  ReposicionYaAnulada,
  SeparacionDeFunciones,
} from './errores-de-reposiciones.js';
import type { Fondo } from './fondos.js';
import type { Reposicion } from './reposiciones.js';

/** Qué hace el sistema cuando el custodio vigente es quien repone (`caja-chica.control.separacion_de_funciones`). */
export type SeparacionDeFuncionesConfigurada = 'avisar' | 'bloquear';

export const AVISO_DE_SEPARACION_DE_FUNCIONES =
  'Usted es el custodio de este fondo y también lo repuso: lo recomendable es que lo reponga otra persona.';

/**
 * Los comprobantes que se piden deben existir, ser de este fondo, estar vigentes y no estar en otra reposición. Un id
 * repetido cuenta una sola vez.
 * @throws ReposicionSinComprobantes, ComprobanteNoEsDelFondo, ComprobanteYaAnulado, ComprobanteRepuesto
 */
export function exigirComprobantesPorReponer(
  pedidos: readonly string[],
  encontrados: readonly Comprobante[],
  fondoId: string,
): void {
  if (pedidos.length === 0) throw new ReposicionSinComprobantes();
  const distintos = new Set(pedidos);
  const delFondo = encontrados.filter((comprobante) => comprobante.fondoId === fondoId);
  if (delFondo.length !== distintos.size) throw new ComprobanteNoEsDelFondo();
  for (const comprobante of delFondo) {
    if (comprobante.estado === 'anulado') throw new ComprobanteYaAnulado();
    if (comprobante.reposicionNumero !== null) throw new ComprobanteRepuesto(comprobante.reposicionNumero);
  }
}

/**
 * Lo repuesto es la suma firmada: tiene que ser mayor que cero.
 * @throws ReposicionSinMonto
 */
export function exigirReposicionConMonto(totalCentavos: number): number {
  if (totalCentavos <= 0) throw new ReposicionSinMonto(totalCentavos);
  return totalCentavos;
}

/** Lo que se sabe para fechar la reposición. */
export interface ContextoDeLaFecha {
  hoy: string;
  fondo: Pick<Fondo, 'fechaDeApertura'>;
  comprobantes: readonly Pick<Comprobante, 'fecha'>[];
}

/**
 * La reposición no es futura ni anterior a la apertura ni a ningún comprobante que cubre.
 * @throws FechaDeLaReposicionInvalida
 */
export function exigirFechaDeLaReposicion(fecha: string, contexto: ContextoDeLaFecha): void {
  if (fecha > contexto.hoy) throw new FechaDeLaReposicionInvalida('La fecha de la reposición no puede ser futura.');
  if (fecha < contexto.fondo.fechaDeApertura) {
    throw new FechaDeLaReposicionInvalida('La fecha de la reposición no puede ser anterior a la apertura del fondo.');
  }
  if (contexto.comprobantes.some((comprobante) => comprobante.fecha > fecha)) {
    throw new FechaDeLaReposicionInvalida(
      'La fecha de la reposición no puede ser anterior a un comprobante que cubre.',
    );
  }
}

/**
 * Si quien repone es el custodio vigente: con «bloquear» se rechaza; con «avisar» se devuelve el aviso. Devuelve `null`
 * si no hay nada que avisar.
 * @throws SeparacionDeFunciones
 */
export function revisarLaSeparacionDeFunciones(
  esElCustodio: boolean,
  configurada: SeparacionDeFuncionesConfigurada,
): string | null {
  if (!esElCustodio) return null;
  if (configurada === 'bloquear') throw new SeparacionDeFunciones();
  return AVISO_DE_SEPARACION_DE_FUNCIONES;
}

/**
 * Una reposición se anula si está vigente y no es la del cierre del fondo.
 * @throws ReposicionYaAnulada, ReposicionDelCierre
 */
export function exigirReposicionAnulable(reposicion: Pick<Reposicion, 'estado' | 'forma' | 'numero'>): void {
  if (reposicion.estado === 'anulada') throw new ReposicionYaAnulada(reposicion.numero);
  if (reposicion.forma === 'compensada_al_cerrar') throw new ReposicionDelCierre(reposicion.numero);
}

/**
 * Un cheque o una nota que el banco ya pagó (está conciliado) no se anula.
 * @throws ReposicionCobrada
 */
export function exigirReposicionSinCobrar(reposicion: Pick<Reposicion, 'numero'>, conciliado: boolean): void {
  if (conciliado) throw new ReposicionCobrada(reposicion.numero);
}
