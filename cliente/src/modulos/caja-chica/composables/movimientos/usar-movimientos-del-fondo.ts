import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiArqueos } from '../../servicios/arqueos.api';
import { apiReposiciones } from '../../servicios/reposiciones.api';
import type { ArqueoResumen } from '../../servicios/tipos-de-arqueos';
import type { ReposicionResumen } from '../../servicios/tipos-de-reposiciones';
import type { ValeResumen } from '../../servicios/tipos-de-vales';
import { apiValesProvisionales } from '../../servicios/vales-provisionales.api';

/** Lo que ha pasado con el dinero del fondo: sus reposiciones, arqueos y vales provisionales, del más nuevo al más viejo. */
export function usarMovimientosDelFondo(fondoId: string) {
  const reposiciones = usarCarga(
    () => apiReposiciones.delFondo(fondoId),
    [] as ReposicionResumen[],
    'No se pudieron cargar las reposiciones.',
  );
  const arqueos = usarCarga(
    () => apiArqueos.delFondo(fondoId),
    [] as ArqueoResumen[],
    'No se pudieron cargar los arqueos.',
  );
  const vales = usarCarga(
    () => apiValesProvisionales.delFondo(fondoId),
    [] as ValeResumen[],
    'No se pudieron cargar los vales provisionales.',
  );
  return {
    reposiciones: reposiciones.datos,
    arqueos: arqueos.datos,
    vales: vales.datos,
    recargar: () => Promise.all([reposiciones.cargar(), arqueos.cargar(), vales.cargar()]),
  };
}
