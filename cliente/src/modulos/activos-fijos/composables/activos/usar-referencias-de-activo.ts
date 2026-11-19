import { computed, type Ref } from 'vue';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { opcionesDeRegistros } from '@/modulos/core/utilidades/edicion';
import { apiActivos, type Activo, type UbicacionesDeActivos } from '../../servicios/activos.api';
import { apiClases, type Clase } from '../../servicios/clases.api';
import { incisoDe, type EdicionDeActivo } from './edicion-de-activo';

const SIN_UBICACIONES: UbicacionesDeActivos = { localidades: [], departamentos: [] };

/** Lo que trae el servidor para los selectores: clases, localidades y departamentos, y activos principales. */
function usarCatalogos() {
  const { datos: clases } = usarCarga(() => apiClases.listar(), [] as Clase[], 'No se pudieron cargar las clases.');
  const { datos: ubicaciones } = usarCarga(
    () => apiActivos.ubicaciones(),
    SIN_UBICACIONES,
    'No se pudieron cargar las localidades.',
  );
  const { datos: activos } = usarCarga(() => apiActivos.listar(), [] as Activo[], 'No se pudieron cargar los activos.');
  return { clases, ubicaciones, activos };
}

/**
 * Lo que se puede elegir en los selectores del alta: las clases activas, las localidades y departamentos de la
 * empresa (todos, vea o no el usuario la localidad en Empresas) y los activos principales de los que puede ser
 * componente.
 */
export function usarReferenciasDeActivo(edicion: Ref<EdicionDeActivo>) {
  const { clases, ubicaciones, activos } = usarCatalogos();
  const departamentos = computed(() => ubicaciones.value.departamentos);
  const deLaLocalidad = computed(() =>
    departamentos.value.filter((d) => d.localidadId === null || d.localidadId === edicion.value.localidadId),
  );
  const principales = computed(() =>
    activos.value.filter((activo) => activo.activoPadreId === null && activo.estado !== 'dado_de_baja'),
  );

  const activas = computed(() => clases.value.filter((clase) => clase.activo));
  const opciones = computed(() => ({
    claseId: opcionesDeRegistros(activas.value, (clase) => clase.nombre, true),
    localidadId: opcionesDeRegistros(ubicaciones.value.localidades, (localidad) => localidad.nombre, false),
    departamentoId: opcionesDeRegistros(deLaLocalidad.value, (departamento) => departamento.nombre, false),
    activoPadreId: opcionesDeRegistros(
      principales.value,
      (activo) => `${activo.codigo} · ${activo.descripcion}`,
      false,
    ),
  }));

  const inciso = computed(() => incisoDe(clases.value, edicion.value.claseId));
  return { opciones, inciso, departamentos };
}
