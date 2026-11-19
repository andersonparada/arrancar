import { computed, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { apiConceptos, type Concepto } from '../../servicios/conceptos.api';
import { opcionesDeConceptoDeCheque } from '../conceptos/opciones-de-concepto';

/**
 * Los conceptos de egreso del cheque posfechado, por nombre. Se piden la primera vez que hacen falta (al abrir esa
 * ventana), no al abrir la ficha: así quien no ve conceptos no recibe un error por una ventana que no usa.
 */
export function usarConceptosDelPosfechado() {
  const sesion = usarSesion();
  const avisos = usarAvisos();
  const conceptos = ref<Concepto[]>([]);
  let pedidos = false;

  async function cargar(): Promise<void> {
    if (pedidos) return;
    pedidos = true;
    try {
      conceptos.value = await apiConceptos.listar();
    } catch (error) {
      pedidos = false;
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar los conceptos.');
    }
  }

  const opciones = computed(() =>
    opcionesDeConceptoDeCheque(conceptos.value, sesion.moduloActivo('cuentas-por-pagar')),
  );
  return { opciones, cargar };
}
