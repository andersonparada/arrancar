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
function mantenerCoherente(
  edicion: Ref<EdicionDeTraslado>,
  deLaLocalidad: Ref<{ id: string }[]>,
  cargadas: Ref<boolean>,
): void {
  watch(
    () => edicion.value.aBodega,
    () => alCambiarABodega(edicion.value),
  );
  watch(
    () => edicion.value.localidadId,
    () => {
      if (!cargadas.value) return; // sin ubicaciones traídas no se sabe qué departamento es de la localidad
      if (!deLaLocalidad.value.some((d) => d.id === edicion.value.departamentoId)) edicion.value.departamentoId = null;
    },
  );
}

/** Una localidad o departamento inactivo no se puede elegir: se quita y se dice en su campo cómo seguir. */
function limpiarInactivos(edicion: EdicionDeTraslado, ubicaciones: UbicacionesDeActivos): Record<string, string> {
  const avisos: Record<string, string> = {};
  const { localidadId, departamentoId } = edicion;
  if (localidadId && !ubicaciones.localidades.some((l) => l.id === localidadId)) {
    edicion.localidadId = null;
    avisos.localidadId = 'La localidad actual está inactiva: elija otra.';
  }
  if (departamentoId && !ubicaciones.departamentos.some((d) => d.id === departamentoId)) {
    edicion.departamentoId = null;
    avisos.departamentoId = 'El departamento actual está inactivo: elija otro.';
  }
  return avisos;
}

function opcionesDeDestino(ubicaciones: UbicacionesDeActivos, departamentos: { id: string; nombre: string }[]) {
  return {
    localidadId: opcionesDeRegistros([...ubicaciones.localidades].sort(porNombre), (l) => l.nombre, false),
    departamentoId: opcionesDeRegistros(departamentos, (d) => d.nombre, false),
  };
}

/** Trae las ubicaciones; devuelve los avisos por campo si el destino precargado ya no se puede elegir. */
async function traerUbicaciones(
  edicion: Ref<EdicionDeTraslado>,
  ubicaciones: Ref<UbicacionesDeActivos>,
  cargadas: Ref<boolean>,
): Promise<Record<string, string>> {
  try {
    ubicaciones.value = await apiActivos.ubicaciones();
    const avisos = limpiarInactivos(edicion.value, ubicaciones.value);
    cargadas.value = true;
    return avisos;
  } catch (error) {
    usarAvisos().error(error instanceof Error ? error.message : 'No se pudieron cargar las localidades.');
    return {};
  }
}

/**
 * Localidades y departamentos que se pueden elegir de destino, en orden por nombre; se traen al abrir la ventana.
 */
export function usarDestinosDeTraslado(edicion: Ref<EdicionDeTraslado>) {
  const ubicaciones = ref(SIN_UBICACIONES);
  const cargadas = ref(false);
  const deLaLocalidad = computed(() =>
    ubicaciones.value.departamentos
      .filter((d) => d.localidadId === null || d.localidadId === edicion.value.localidadId)
      .sort(porNombre),
  );
  const opciones = computed(() => opcionesDeDestino(ubicaciones.value, deLaLocalidad.value));

  const cargar = () => traerUbicaciones(edicion, ubicaciones, cargadas);
  const elegido = () => ({
    localidad: nombreDe(ubicaciones.value.localidades, edicion.value.localidadId),
    departamento: nombreDe(ubicaciones.value.departamentos, edicion.value.departamentoId),
  });
  mantenerCoherente(edicion, deLaLocalidad, cargadas);
  return { opciones, cargar, elegido };
}
