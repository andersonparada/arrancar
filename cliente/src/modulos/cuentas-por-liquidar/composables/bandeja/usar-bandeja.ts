import { computed, onMounted, reactive, ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { alDejarDeEscribir } from '@/modulos/core/composables/al-dejar-de-escribir';
import { apiGastos, type GastoDeBandeja } from '../../servicios/gastos.api';
import { filtrosInicialesDeBandeja, consultaDeBandeja, gastosMarcados, sePuedeAsignar } from './bandeja';
import { usarAsignacionDeLaBandeja } from './usar-asignacion-de-la-bandeja';

/** Pide la bandeja; si llegan dos respuestas, solo vale la de la última petición. */
function usarPeticionDeLaBandeja(filtros: ReturnType<typeof filtrosInicialesDeBandeja>) {
  const avisos = usarAvisos();
  const gastos = ref<GastoDeBandeja[]>([]);
  const cargando = ref(true);
  let ultima = 0;

  async function cargar(): Promise<void> {
    const peticion = ++ultima;
    cargando.value = true;
    try {
      const respuesta = await apiGastos.bandeja(consultaDeBandeja(filtros));
      if (peticion === ultima) gastos.value = respuesta;
    } catch (error) {
      if (peticion === ultima) avisos.error(error instanceof Error ? error.message : 'No se pudo cargar la bandeja.');
    }
    if (peticion === ultima) cargando.value = false;
  }
  return { gastos, cargando, cargar };
}

/** Lo marcado en la bandeja: lo que ya no está (se asignó) se desmarca solo. */
function usarMarcas(gastos: Ref<GastoDeBandeja[]>) {
  const marcados = ref<Set<string>>(new Set());
  const alternar = (id: string): void => {
    const nuevo = new Set(marcados.value);
    if (!nuevo.delete(id)) nuevo.add(id);
    marcados.value = nuevo;
  };
  const asignables = computed(() => gastos.value.filter(sePuedeAsignar));
  const todosMarcados = computed(
    () => asignables.value.length > 0 && asignables.value.every(({ id }) => marcados.value.has(id)),
  );
  const marcarTodos = (): void => {
    marcados.value = todosMarcados.value ? new Set() : new Set(asignables.value.map(({ id }) => id));
  };
  watch(gastos, (lista) => {
    marcados.value = new Set([...marcados.value].filter((id) => lista.some((gasto) => gasto.id === id)));
  });
  return { marcados, alternar, marcarTodos, todosMarcados, asignables };
}

/** La bandeja de Cuentas por liquidar: documentos que llegaron sin anticipo, para marcar y asignar a uno. */
export function usarBandeja() {
  const filtros = reactive(filtrosInicialesDeBandeja());
  const { gastos, cargando, cargar } = usarPeticionDeLaBandeja(filtros);
  const marcas = usarMarcas(gastos);
  const seleccion = computed(() => gastosMarcados(gastos.value, marcas.marcados.value));
  const asignacion = usarAsignacionDeLaBandeja(seleccion, cargar, String(useRoute().query.anticipo ?? ''));

  alDejarDeEscribir(filtros, cargar);
  onMounted(cargar);

  return {
    gastos,
    cargando,
    filtros,
    seleccion,
    ...marcas,
    asignacion,
    quitarFiltros: () => Object.assign(filtros, filtrosInicialesDeBandeja()),
  };
}
