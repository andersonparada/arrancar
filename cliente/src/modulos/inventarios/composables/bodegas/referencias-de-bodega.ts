import { computed, type Ref } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiAccesosABodegas, type UsuarioParaAccesos } from '../../servicios/accesos-a-bodegas.api';
import { apiUbicaciones, type LocalidadParaElegir } from '../../servicios/ubicaciones.api';
import { opcionesDeLocalidades, opcionesDeResponsables } from './opciones-de-bodega';

/**
 * Lo que se puede elegir en el formulario de la bodega. Las localidades solo se piden a quien las ve en Empresas, y
 * los usuarios a quien puede asignar bodegas: sin ese permiso el campo no se ofrece (y lo guardado se conserva).
 */
export function usarReferenciasDeBodega(edicion: Ref<{ localidadId: string | null }>) {
  const sesion = usarSesion();
  const puedeElegirLocalidad = sesion.puede('empresas.localidades.ver');
  const puedeElegirResponsable = sesion.puede('inventarios.bodegas.asignar');
  const { datos: localidades } = usarCarga(
    async () => (puedeElegirLocalidad ? apiUbicaciones.localidades() : []),
    [] as LocalidadParaElegir[],
    'No se pudieron cargar las localidades.',
  );
  const { datos: usuarios } = usarCarga(
    async () => (puedeElegirResponsable ? apiAccesosABodegas.listarUsuarios() : []),
    [] as UsuarioParaAccesos[],
    'No se pudieron cargar los usuarios.',
  );
  const opciones = computed(() => ({
    localidadId: opcionesDeLocalidades(localidades.value, edicion.value.localidadId),
    responsableUsuarioId: opcionesDeResponsables(usuarios.value),
  }));
  return { opciones, puedeElegirLocalidad, puedeElegirResponsable };
}
