import { computed, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { opcionesDeRegistros } from '@/modulos/core/utilidades/edicion';
import { apiActivos, type UbicacionesDeActivos } from '../../servicios/activos.api';
import { alCambiarABodega, type EdicionDeTraslado } from './edicion-de-traslado';

const SIN_UBICACIONES: UbicacionesDeActivos = { localidades: [], departamentos: [] };
const porNombre = <T extends { nombre: string }>(a: T, b: T): number => a.nombre.localeCompare(b.nombre, 'es');

const nombreDe = (lista: { id: string; nombre: string }[], id: string | null): string | null =>
  lista.find((registro) => registro.id === id)?.nombre ?? null;

/** Sin bodega no hay ocio, y un departamento que no es de la localidad elegida se quita. */
function mantenerCoherente(edicion: Ref<EdicionDeTraslado>, deLaLocalidad: Ref<{ id: string }[]>): void {
  watch(
    () => edicion.value.aBodega,
    () => alCambiarABodega(edicion.value),
  );
  watch(
    () => edicion.value.localidadId,
    () => {
      if (!deLaLocalidad.value.some((d) => d.id === edicion.value.departamentoId)) edicion.value.departamentoId = null;
    },
  );
}

/**
 * Localidades y departamentos que se pueden elegir de destino, en orden por nombre; se traen al abrir la ventana.
 */
export function usarDestinosDeTraslado(edicion: Ref<EdicionDeTraslado>) {
  const ubicaciones = ref(SIN_UBICACIONES);
  const deLaLocalidad = computed(() =>
    ubicaciones.value.departamentos
      .filter((d) => d.localidadId === null || d.localidadId === edicion.value.localidadId)
      .sort(porNombre),
  );
  const opciones = computed(() => ({
    localidadId: opcionesDeRegistros([...ubicaciones.value.localidades].sort(porNombre), (l) => l.nombre, false),
    departamentoId: opcionesDeRegistros(deLaLocalidad.value, (d) => d.nombre, false),
  }));

  async function cargar(): Promise<void> {
    try {
      ubicaciones.value = await apiActivos.ubicaciones();
    } catch (error) {
      usarAvisos().error(error instanceof Error ? error.message : 'No se pudieron cargar las localidades.');
    }
  }

  const elegido = () => ({
    localidad: nombreDe(ubicaciones.value.localidades, edicion.value.localidadId),
    departamento: nombreDe(ubicaciones.value.departamentos, edicion.value.departamentoId),
  });
  mantenerCoherente(edicion, deLaLocalidad);
  return { opciones, cargar, elegido };
}
