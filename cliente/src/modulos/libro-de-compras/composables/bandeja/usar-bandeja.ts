import { computed, watch, type Ref } from 'vue';
import type { DteRecibido, EstadoDeDte } from '../../servicios/dte-recibidos.api';
import { usarCatalogosDeLaBandeja } from './usar-catalogos-de-la-bandeja';
import { usarCompletarFilas } from './usar-completar-filas';
import { usarConfirmacionDeFilas } from './usar-confirmacion-de-filas';
import { usarDescarteDeFilas } from './usar-descarte-de-filas';
import { usarListaDeLaBandeja } from './usar-lista-de-la-bandeja';
import { usarSeleccion } from './usar-seleccion';

/** Las filas que se pueden marcar: las pendientes (para completarlas y confirmarlas) y las bloqueadas (para descartarlas). */
export const SE_PUEDE_MARCAR: readonly EstadoDeDte[] = ['pendiente', 'bloqueado'];

/** Lo marcado vale solo para las filas que se ven: al recargar se quitan las marcas de las que ya no están. */
function usarMarcas(filas: Ref<DteRecibido[]>) {
  const seleccion = usarSeleccion();
  const marcadas = computed(() => filas.value.filter(({ id }) => seleccion.estaMarcada(id)));
  const todasMarcadas = computed(() => filas.value.length > 0 && marcadas.value.length === filas.value.length);

  watch(filas, (nuevas) => {
    const visibles = new Set(nuevas.map(({ id }) => id));
    seleccion.quitar([...seleccion.marcadas.value].filter((id) => !visibles.has(id)));
  });

  function alternarTodas(): void {
    const ids = filas.value.map(({ id }) => id);
    if (todasMarcadas.value) seleccion.quitar(ids);
    else seleccion.marcar(ids);
  }

  return { seleccion, marcadas, todasMarcadas, alternarTodas };
}

/** Una pestaña de la bandeja con todo lo que se hace en ella: la lista filtrada, lo marcado, completar, confirmar y descartar. */
export function usarBandeja(estado: EstadoDeDte, busquedaInicial: string) {
  const lista = usarListaDeLaBandeja(estado, busquedaInicial);
  const marcas = usarMarcas(lista.filas);

  const descarte = usarDescarteDeFilas(async () => {
    marcas.seleccion.limpiar();
    await lista.cargar();
  });

  return {
    ...lista,
    ...marcas,
    ...usarCatalogosDeLaBandeja(),
    sePuedeMarcar: SE_PUEDE_MARCAR.includes(estado),
    completar: usarCompletarFilas(lista.reemplazar),
    confirmacion: usarConfirmacionDeFilas(() => lista.cargar()),
    descarte,
  };
}
