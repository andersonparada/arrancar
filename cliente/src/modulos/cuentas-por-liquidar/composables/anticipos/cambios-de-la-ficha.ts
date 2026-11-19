import { apiAnticipos, type Anticipo } from '../../servicios/anticipos.api';
import { apiGastos, type Gasto } from '../../servicios/gastos.api';
import { tituloDelGasto } from '../gastos/gastos-del-anticipo';
import type { CambioConMotivo } from '../usar-cambio-con-motivo';
import { reabrirConFecha, resumenDeAnular, resumenDeReabrir } from './ficha-de-anticipo';

/** Anular el anticipo: Bancos anula el cheque o la nota, o crea su inverso con la fecha que se escriba. */
export const cambioDeAnular = (anticipo: Anticipo): CambioConMotivo => ({
  titulo: `Anular el anticipo ${anticipo.numero}`,
  resumen: resumenDeAnular(anticipo),
  textoDelBoton: 'Anular el anticipo',
  peligroso: true,
  conFecha: true,
  enviar: (solicitud) => apiAnticipos.anular(anticipo.id, solicitud),
  exito: `Anticipo ${anticipo.numero} anulado.`,
});

/** Reabrir una liquidación: la fecha del movimiento en Bancos solo se pide si hubo un depósito o reembolso que anular. */
export const cambioDeReabrir = (anticipo: Anticipo): CambioConMotivo => ({
  titulo: `Reabrir el anticipo ${anticipo.numero}`,
  resumen: resumenDeReabrir(anticipo),
  textoDelBoton: 'Reabrir el anticipo',
  conFecha: reabrirConFecha(anticipo),
  enviar: (solicitud) => apiAnticipos.reabrir(anticipo.id, solicitud),
  exito: `Anticipo ${anticipo.numero} reabierto: vuelve a estar por liquidar.`,
});

/** Lo que pasa con un gasto al quitarlo: un documento vuelve a la bandeja; uno sin documento queda anulado. */
export function resumenDeQuitar(gasto: Pick<Gasto, 'clase' | 'tipoDeDocumento' | 'etiqueta'>): string {
  const destino =
    gasto.clase === 'documento'
      ? 'El documento vuelve a la bandeja para asignarlo a otro anticipo.'
      : 'El gasto sin documento queda anulado.';
  return `Se quita «${tituloDelGasto(gasto)}» de este anticipo. ${destino}`;
}

export const cambioDeQuitar = (gasto: Gasto): CambioConMotivo => ({
  titulo: 'Quitar el gasto',
  resumen: resumenDeQuitar(gasto),
  textoDelBoton: 'Quitar el gasto',
  peligroso: true,
  enviar: ({ motivo }) => apiGastos.quitar(gasto.id, motivo),
  exito: 'Gasto quitado.',
});
