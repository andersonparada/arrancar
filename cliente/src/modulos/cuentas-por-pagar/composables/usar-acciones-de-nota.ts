import type { FichaActual } from './usar-acciones-con-ventana';
import { usarAjusteDeNota } from './usar-ajuste-de-nota';
import { usarAplicacionDeNota } from './usar-aplicacion-de-nota';
import { apiReintegros } from '../servicios/reintegros.api';
import { usarReintegro } from './reintegros/usar-reintegro';
import { usarAccionConMotivo, usarAnularAjuste, usarQuitarAplicacion } from './usar-baja-con-motivo';

/** Lo que se hace con el saldo a favor de una nota y con lo ya hecho: aplicar, ajustar, quitar, anular y reintegrar. */
export function usarAccionesDeNota(ficha: FichaActual, recargar: () => Promise<void>) {
  return {
    aplicacion: usarAplicacionDeNota(ficha, recargar),
    ajuste: usarAjusteDeNota(ficha, recargar),
    quitar: usarQuitarAplicacion(recargar),
    anularAjuste: usarAnularAjuste(recargar),
    reintegro: usarReintegro(),
    anularReintegro: usarAccionConMotivo(
      (id, motivo) => apiReintegros.anular(id, { motivo }),
      'Reintegro anulado: el monto volvió al saldo a favor de la nota.',
      recargar,
    ),
  };
}

export type AccionesDeNota = ReturnType<typeof usarAccionesDeNota>;
