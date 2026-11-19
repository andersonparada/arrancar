import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosDePartida, ParteQueSeAgrega, PartidaDeApertura } from '../../servicios/tipos-de-saldos-iniciales';

/** Lo que muestra cada campo de la ventana mientras se agrega o corrige una partida de apertura. */
export interface EdicionDePartida {
  abierta: boolean;
  /** Nulo al agregar; el movimiento de la partida al corregir. */
  movimientoId: string | null;
  parte: ParteQueSeAgrega;
  fecha: string;
  monto: string | number;
  sentido: 'credito' | 'debito';
  conceptoId: string | null;
  serie: string;
  numeroDeCheque: string | number;
  beneficiario: string;
  referencia: string;
  observaciones: string;
}

/** Solo los cheques llevan serie, número y beneficiario. */
export const esParteDeCheque = (parte: ParteQueSeAgrega): boolean =>
  parte === 'cheque_en_circulacion' || parte === 'cheque_posfechado';

/**
 * La ventana para agregar una partida. La fecha de las partidas de apertura se propone con la de corte (lo más común
 * es que sea de esa fecha o cercana); el posfechado, que debe ser posterior, empieza vacía.
 */
export function edicionNuevaDePartida(parte: ParteQueSeAgrega, fechaDeCorte: string | null): EdicionDePartida {
  return {
    abierta: true,
    movimientoId: null,
    parte,
    fecha: parte === 'cheque_posfechado' ? '' : (fechaDeCorte ?? ''),
    monto: '',
    sentido: 'credito',
    conceptoId: null,
    serie: '',
    numeroDeCheque: '',
    beneficiario: '',
    referencia: '',
    observaciones: '',
  };
}

/** La ventana abierta con los datos de una partida que se corrige (la parte no se cambia). */
export function edicionDePartida(partida: PartidaDeApertura): EdicionDePartida {
  return {
    abierta: true,
    movimientoId: partida.movimientoId,
    parte: partida.parte as ParteQueSeAgrega,
    fecha: textoDeEdicion(partida.fecha),
    monto: textoDeEdicion(partida.monto),
    sentido: partida.tipo === 'debito' ? 'debito' : 'credito',
    conceptoId: partida.conceptoId,
    serie: textoDeEdicion(partida.serie),
    numeroDeCheque: textoDeEdicion(partida.numeroDeCheque),
    beneficiario: textoDeEdicion(partida.beneficiario),
    referencia: textoDeEdicion(partida.referencia),
    observaciones: textoDeEdicion(partida.observaciones),
  };
}

const numeroOnulo = (valor: string | number): number | null => {
  const texto = textoONulo(valor);
  return texto === null ? null : Number(texto);
};

/** Lo que se manda al servidor: lo que no aplica a la parte va como `null` y lo vacío también. */
export function datosDePartida(edicion: EdicionDePartida): DatosDePartida {
  const cheque = esParteDeCheque(edicion.parte);
  return {
    fecha: edicion.fecha,
    monto: textoDeEdicion(edicion.monto),
    sentido: edicion.parte === 'error_del_banco' ? edicion.sentido : null,
    conceptoId: edicion.parte === 'cheque_posfechado' ? edicion.conceptoId : null,
    serie: cheque ? textoONulo(edicion.serie) : null,
    numeroDeCheque: cheque ? numeroOnulo(edicion.numeroDeCheque) : null,
    beneficiario: textoONulo(edicion.beneficiario),
    referencia: textoONulo(edicion.referencia),
    observaciones: textoONulo(edicion.observaciones),
  };
}

const ROTULO_DEL_BENEFICIARIO: Partial<Record<ParteQueSeAgrega, string>> = {
  cheque_en_circulacion: 'Beneficiario',
  cheque_posfechado: 'Beneficiario',
  deposito_en_transito: 'Origen del depósito',
};

/** Cómo se llama el campo del beneficiario en cada parte; sin rótulo, la parte no lo lleva. */
export const rotuloDelBeneficiario = (parte: ParteQueSeAgrega): string | null => ROTULO_DEL_BENEFICIARIO[parte] ?? null;

export const TITULO_DE_PARTE: Record<ParteQueSeAgrega, { agregar: string; corregir: string }> = {
  cheque_en_circulacion: { agregar: 'Agregar cheque en circulación', corregir: 'Corregir cheque en circulación' },
  deposito_en_transito: { agregar: 'Agregar depósito en tránsito', corregir: 'Corregir depósito en tránsito' },
  debito_en_transito: { agregar: 'Agregar débito en tránsito', corregir: 'Corregir débito en tránsito' },
  error_del_banco: { agregar: 'Agregar error del banco', corregir: 'Corregir error del banco' },
  cheque_posfechado: { agregar: 'Agregar cheque posfechado', corregir: 'Corregir cheque posfechado' },
};

export const tituloDeLaVentanaDePartida = (edicion: EdicionDePartida): string =>
  TITULO_DE_PARTE[edicion.parte][edicion.movimientoId ? 'corregir' : 'agregar'];
