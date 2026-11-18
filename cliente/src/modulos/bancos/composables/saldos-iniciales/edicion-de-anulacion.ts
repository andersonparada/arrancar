import type { DatosDeAnulacionDePartida, PartidaDeApertura } from '../../servicios/tipos-de-saldos-iniciales';

/**
 * Lo que se manda al anular una partida de apertura: el pagador solo viaja en el depósito en tránsito (quién debe ese
 * dinero) y vacío va como `null`; el servidor decide si es obligatorio.
 */
export function datosDeAnulacion(
  partida: Pick<PartidaDeApertura, 'parte'>,
  escrito: { motivo: string; fecha: string; pagador: string },
): DatosDeAnulacionDePartida {
  const esDeposito = partida.parte === 'deposito_en_transito';
  return {
    motivo: escrito.motivo,
    fecha: escrito.fecha,
    pagador: esDeposito ? escrito.pagador.trim() || null : null,
  };
}
