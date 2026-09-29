import { computed, reactive, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiMovimientos, type FilaDelReporte } from '../../servicios/movimientos.api';
import { apiNotas } from '../../servicios/notas.api';
import { conceptoSinClasificar, conceptoVigente, opcionesDeConcepto } from '../conceptos/opciones-de-concepto';
import { usarCatalogoDeConceptos } from '../conceptos/usar-catalogo-de-conceptos';
import { filtroDeLaConsulta, type FiltrosDeMovimientos } from './filtros-de-movimientos';
import {
  conAlternado,
  conTodosAlternados,
  marcasVigentes,
  pendientesDeClasificar,
  resumenDeSeleccion,
  tiposDeSeleccion,
  todosMarcados,
} from './seleccion-de-pendientes';

const SIN_FILTRO: FiltrosDeMovimientos = { cuentaBancariaId: null, desde: '', hasta: '', conceptoId: null };

/** Lo que está sin clasificar, según la cuenta y las fechas del filtro; recarga solo al cambiarlos. */
function usarPendientes(sinClasificarId: Ref<string | null>) {
  const filtros = reactive<FiltrosDeMovimientos>({ ...SIN_FILTRO });
  const { datos, cargando, cargar } = usarCarga(
    async () => {
      if (!sinClasificarId.value) return [] as FilaDelReporte[];
      const consulta = filtroDeLaConsulta({ ...filtros, conceptoId: sinClasificarId.value });
      return (await apiMovimientos.reporte(consulta)).filas;
    },
    [] as FilaDelReporte[],
    'No se pudieron cargar los movimientos sin clasificar.',
  );
  watch([filtros, sinClasificarId], cargar);
  const filas = computed(() => pendientesDeClasificar(datos.value));
  return { filtros, filas, cargando, cargar };
}

/** Qué está marcado, cuánto suma y con qué conceptos se puede clasificar (los que sirven a todo lo marcado). */
function usarSeleccion(filas: Ref<FilaDelReporte[]>) {
  const { conceptos } = usarCatalogoDeConceptos();
  const seleccion = ref(new Set<string>());
  const conceptoElegido = ref<string | null>(null);
  const resumen = computed(() => resumenDeSeleccion(filas.value, seleccion.value));
  const opciones = computed(() => opcionesDeConcepto(conceptos.value, tiposDeSeleccion(filas.value, seleccion.value)));
  const nombreElegido = computed(() => opciones.value.find((o) => o.valor === conceptoElegido.value)?.texto ?? '');
  const puedeClasificar = computed(() => resumen.value.cantidad > 0 && conceptoElegido.value !== null);
  watch(opciones, (nuevas) => (conceptoElegido.value = conceptoVigente(nuevas, conceptoElegido.value)));
  return { seleccion, conceptoElegido, resumen, opciones, nombreElegido, puedeClasificar };
}

type Seleccion = ReturnType<typeof usarSeleccion>;

/** Pide confirmar con un resumen claro, clasifica lo marcado y avisa; `true` si se clasificó. */
async function clasificarMarcados(estado: Seleccion): Promise<boolean> {
  const avisos = usarAvisos();
  const { cantidad, montoDeEntradas, montoDeSalidas } = estado.resumen.value;
  const nombre = estado.nombreElegido.value;
  const aceptado = await avisos.confirmar({
    titulo: 'Clasificar movimientos',
    mensaje: `Se clasificarán ${cantidad} movimientos (${montoDeEntradas} de entradas y ${montoDeSalidas} de salidas) como «${nombre}». Solo cambia el concepto, aunque el mes esté conciliado, y queda en la auditoría.`,
    textoConfirmar: 'Clasificar',
  });
  const conceptoId = estado.conceptoElegido.value;
  if (!aceptado || !conceptoId) return false;
  try {
    await apiNotas.reclasificar({ movimientoIds: [...estado.seleccion.value], conceptoId });
  } catch (error) {
    avisos.error(error instanceof Error ? error.message : 'No se pudo clasificar.');
    return false;
  }
  avisos.exito(`${cantidad} movimientos clasificados como «${nombre}».`);
  return true;
}

/**
 * La bandeja «Sin clasificar»: los originales que quedaron sin concepto (así los dejó la migración), con selección
 * múltiple y «Clasificar como…» sobre el caso de uso de reclasificar. Recargar conserva las marcas que siguen vigentes.
 */
export function usarBandejaDeSinClasificar() {
  const { conceptos } = usarCatalogoDeConceptos();
  const sinClasificarId = computed(() => conceptoSinClasificar(conceptos.value)?.id ?? null);
  const { filtros, filas, cargando, cargar } = usarPendientes(sinClasificarId);
  const estado = usarSeleccion(filas);

  async function clasificar(): Promise<void> {
    if (!(await clasificarMarcados(estado))) return;
    await cargar();
    estado.seleccion.value = marcasVigentes(filas.value, estado.seleccion.value);
  }

  return {
    filtros,
    filas,
    cargando,
    ...estado,
    clasificar,
    todosMarcados: computed(() => todosMarcados(filas.value, estado.seleccion.value)),
    alternar: (id: string) => (estado.seleccion.value = conAlternado(estado.seleccion.value, id)),
    alternarTodos: () => (estado.seleccion.value = conTodosAlternados(filas.value, estado.seleccion.value)),
  };
}
