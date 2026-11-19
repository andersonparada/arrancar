import { computed, reactive, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiActivos, type Activo, type UbicacionesDeActivos } from '../../servicios/activos.api';
import { apiClases, type Clase } from '../../servicios/clases.api';
import { altasConjuntasDe, opcionesDeAltas } from './altas-conjuntas';
import {
  opcionesDeActivos,
  opcionesDeClases,
  opcionesDeDepartamentos,
  opcionesDeLocalidades,
} from './opciones-de-capitalizacion';

const SIN_UBICACIONES: UbicacionesDeActivos = { localidades: [], departamentos: [] };

/** Trae todo; si ya se tenían las clases y las ubicaciones (`conocidas`), solo vuelve a pedir los activos. */
function traerCatalogos(conocidas: [Clase[], UbicacionesDeActivos] | null) {
  return Promise.all([
    conocidas ? conocidas[0] : apiClases.listar(),
    apiActivos.listar(),
    conocidas ? conocidas[1] : apiActivos.ubicaciones(),
  ]);
}

/**
 * Trae clases y ubicaciones la primera vez que se pide (`cargar`) y los activos cada vez, porque cambian al
 * capitalizar (nacen activos y compras conjuntas).
 */
function usarCargaDeCatalogos() {
  const avisos = usarAvisos();
  const clases = ref<Clase[]>([]);
  const activos = ref<Activo[]>([]);
  const ubicaciones = ref<UbicacionesDeActivos>(SIN_UBICACIONES);
  const cargando = ref(false);
  let hecha = false;

  async function cargar(): Promise<void> {
    if (cargando.value) return;
    cargando.value = true;
    try {
      [clases.value, activos.value, ubicaciones.value] = await traerCatalogos(
        hecha ? [clases.value, ubicaciones.value] : null,
      );
      hecha = true;
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar las clases y los activos.');
    } finally {
      cargando.value = false;
    }
  }

  return { clases, activos, ubicaciones, cargando, cargar };
}

/**
 * Lo que se puede elegir en la ventana «Capitalizar»: clases, activos y ubicaciones. Se trae al abrir la ventana
 * (no al abrir la bandeja), porque quien solo descarta líneas no los necesita.
 */
export function usarCatalogosDeCapitalizacion() {
  const { clases, activos, ubicaciones, cargando, cargar } = usarCargaDeCatalogos();
  const opciones = computed(() => ({
    claseId: opcionesDeClases(clases.value),
    activoId: opcionesDeActivos(activos.value),
    altaConjuntaId: opcionesDeAltas(altasConjuntasDe(activos.value)),
    localidadId: opcionesDeLocalidades(ubicaciones.value),
  }));
  const departamentosDe = (localidadId: string | null) => opcionesDeDepartamentos(ubicaciones.value, localidadId);
  return reactive({ clases, activos, cargando, cargar, opciones, departamentosDe });
}
