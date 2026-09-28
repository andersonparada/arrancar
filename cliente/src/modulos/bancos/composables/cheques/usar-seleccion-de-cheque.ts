import { ref, watch, type Ref } from 'vue';
import type { OpcionDeRegistro } from '@/modulos/core/utilidades/edicion';
import { apiChequeras } from '../../servicios/chequeras.api';
import { apiCheques } from '../../servicios/cheques.api';

/** Los cheques disponibles de una chequera activa, con su serie, listos para una opción del selector. */
async function opcionesDeLaChequera(chequeraId: string, serie: string | null): Promise<OpcionDeRegistro[]> {
  const disponibles = await apiCheques.listarDeLaChequera(chequeraId, 'disponible');
  return disponibles.map((cheque) => ({ valor: cheque.id, texto: `${serie ?? ''}${cheque.numero}` }));
}

/**
 * Los cheques disponibles de la cuenta elegida, para elegir cuál emitir, con el
 * siguiente disponible ya sugerido; se recargan al cambiar de cuenta.
 */
export function usarSeleccionDeCheque(cuentaElegida: Ref<string | null>) {
  const opciones = ref<OpcionDeRegistro[]>([]);
  const sugerido = ref<string | null>(null);

  async function cargar(cuentaBancariaId: string | null): Promise<void> {
    if (!cuentaBancariaId) {
      opciones.value = [];
      sugerido.value = null;
      return;
    }
    const chequeras = (await apiChequeras.listarDeLaCuenta(cuentaBancariaId)).filter((c) => c.activa);
    const listas = await Promise.all(chequeras.map((c) => opcionesDeLaChequera(c.id, c.serie)));
    opciones.value = listas.flat();
    sugerido.value = (await apiCheques.siguienteDisponible(cuentaBancariaId))?.id ?? null;
  }

  watch(cuentaElegida, cargar, { immediate: true });

  return { opciones, sugerido };
}
