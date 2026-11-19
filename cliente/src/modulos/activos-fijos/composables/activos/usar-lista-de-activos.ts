import { computed, reactive, watch } from 'vue';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiActivos, type Activo } from '../../servicios/activos.api';
import { apiClases, type Clase } from '../../servicios/clases.api';
import { consultaDeActivos, filtrosVacios, type FiltrosDeLaLista } from './filtros-de-activos';

/** Los activos de la empresa para la lista, con sus filtros; el texto espera a que se deje de escribir. */
export function usarListaDeActivos() {
  const filtros = reactive<FiltrosDeLaLista>(filtrosVacios());
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(
    () => apiActivos.listar(consultaDeActivos(filtros)),
    [] as Activo[],
    'No se pudieron cargar los activos.',
  );
  alDejarDeEscribir(() => filtros.texto, cargar);
  watch(() => [filtros.estado, filtros.tipoDeRegistro, filtros.claseId, filtros.marca], cargar);
  const { datos: clases } = usarCarga(() => apiClases.listar(), [] as Clase[], 'No se pudieron cargar las clases.');
  const opcionesDeClase = computed(() => [
    { valor: null, texto: 'Todas' },
    ...clases.value.map((clase) => ({ valor: clase.id, texto: clase.nombre })),
  ]);
  return { registros, cargando, filtros, opcionesDeClase };
}
