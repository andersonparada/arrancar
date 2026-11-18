import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiRetiros, type RetiroResumen } from '../../servicios/retiros.api';
import { opcionesParaElegirRetiro } from './opciones-de-retiros';

/**
 * Cuando se llega a «Pagar en efectivo» sin retiro (desde la contraseña): trae los retiros abiertos con efectivo disponible
 * para escoger uno. Con uno solo, pasa directo a repartir con él; el proveedor y la contraseña del enlace se conservan.
 */
export function usarEleccionDeRetiro() {
  const router = useRouter();
  const route = useRoute();
  const { datos: retiros, cargando } = usarCarga<RetiroResumen[]>(
    async () => {
      const pagina = await apiRetiros.listar({ estado: 'abierto', soloConDisponible: true, pagina: 1, limite: 100 });
      return pagina.elementos;
    },
    [],
    'No se pudieron cargar los retiros.',
  );

  /** A repartir con el retiro, sin dejar el enlace anterior en el historial. */
  const elegir = (id: string): Promise<unknown> =>
    router.replace({ name: 'cuentas-por-pagar.retiros.pagar', params: { id }, query: route.query });

  // Con un solo retiro no hay nada que escoger.
  watch(cargando, (sigue) => {
    if (!sigue && retiros.value.length === 1) void elegir(retiros.value[0]!.id);
  });

  return { retiros, cargando, elegir, opciones: computed(() => opcionesParaElegirRetiro(retiros.value)) };
}
