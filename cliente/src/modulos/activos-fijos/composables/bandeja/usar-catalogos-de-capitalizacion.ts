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

/** Trae clases, activos y ubicaciones una sola vez, la primera vez que se pide (`cargar`). */
function usarCargaDeCatalogos() {
  const avisos = usarAvisos();
  const clases = ref<Clase[]>([]);
  const activos = ref<Activo[]>([]);
  const ubicaciones = ref<UbicacionesDeActivos>(SIN_UBICACIONES);
  const cargando = ref(false);
  let hecha = false;

  async function cargar(): Promise<void> {
    if (hecha || cargando.value) return;
    cargando.value = true;
    try {
      const todo = await Promise.all([apiClases.listar(), apiActivos.listar(), apiActivos.ubicaciones()]);
      [clases.value, activos.value, ubicaciones.value] = todo;
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
