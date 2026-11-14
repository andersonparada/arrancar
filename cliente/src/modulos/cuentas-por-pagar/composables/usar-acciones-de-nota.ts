import type { FichaActual } from './usar-acciones-con-ventana';
import { usarAjusteDeNota } from './usar-ajuste-de-nota';
import { usarAplicacionDeNota } from './usar-aplicacion-de-nota';
import { usarAnularAjuste, usarQuitarAplicacion } from './usar-baja-con-motivo';

/** Lo que se hace con el saldo a favor de una nota y con lo ya hecho: aplicar, ajustar, quitar y anular. */
export function usarAccionesDeNota(ficha: FichaActual, recargar: () => Promise<void>) {
  return {
    aplicacion: usarAplicacionDeNota(ficha, recargar),
    ajuste: usarAjusteDeNota(ficha, recargar),
    quitar: usarQuitarAplicacion(recargar),
    anularAjuste: usarAnularAjuste(recargar),
  };
}

export type AccionesDeNota = ReturnType<typeof usarAccionesDeNota>;
