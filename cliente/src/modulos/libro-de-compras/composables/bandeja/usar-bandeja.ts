import type { EstadoDeDte } from '../../servicios/dte-recibidos.api';
import { usarCatalogosDeLaBandeja } from './usar-catalogos-de-la-bandeja';
import { usarCompletarFilas } from './usar-completar-filas';
import { usarConfirmacionDeFilas } from './usar-confirmacion-de-filas';
import { usarDescarteDeFilas } from './usar-descarte-de-filas';
import { usarListaDeLaBandeja } from './usar-lista-de-la-bandeja';
import { usarMarcas } from './usar-marcas';

/** Las filas que se pueden marcar: las pendientes (para completarlas y confirmarlas) y las bloqueadas (para descartarlas). */
export const SE_PUEDE_MARCAR: readonly EstadoDeDte[] = ['pendiente', 'bloqueado'];

/** Una pestaña de la bandeja con todo lo que se hace en ella: la lista filtrada, lo marcado, completar, confirmar y descartar. */
export function usarBandeja(estado: EstadoDeDte, busquedaInicial: string) {
  const lista = usarListaDeLaBandeja(estado, busquedaInicial);
  const marcas = usarMarcas(estado, lista.filas, { filtros: lista.filtros, total: lista.total });

  const descarte = usarDescarteDeFilas(async () => {
    marcas.limpiar();
    await lista.cargar();
  });

  // Lo registrado sale de lo marcado; lo que falló sigue marcado para corregirlo y reintentar.
  const confirmacion = usarConfirmacionDeFilas(async (registradas) => {
    marcas.quitar(registradas);
    await lista.cargar();
  });

  const completar = usarCompletarFilas((cambiadas) => {
    lista.reemplazar(cambiadas);
    marcas.refrescar(cambiadas);
  });

  return {
    ...lista,
    marcas,
    ...usarCatalogosDeLaBandeja(),
    sePuedeMarcar: SE_PUEDE_MARCAR.includes(estado),
    completar,
    confirmacion,
    descarte,
  };
}
