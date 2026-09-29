import { computed, reactive, ref, watch, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { apiMovimientos, type FilaDelReporte } from '../../servicios/movimientos.api';
import { apiNotas } from '../../servicios/notas.api';
import { conceptoSinClasificar, conceptoVigente, opcionesParaClasificar } from '../conceptos/opciones-de-concepto';
import { usarCatalogoDeConceptos } from '../conceptos/usar-catalogo-de-conceptos';
import { cantidadConSugerido, conSugerido, type SugerenciasPorMovimiento } from '../sugerencias/lote-de-sugerencias';
import { filtroDeLaConsulta, type FiltrosDeMovimientos } from './filtros-de-movimientos';
import { usarAceptacionDeSugerencias } from './usar-aceptacion-de-sugerencias';
import { usarSugerenciasDeBandeja } from './usar-sugerencias-de-bandeja';
import {
  conAlternado,
  conTodosAlternados,
  marcasVigentes,
  ordenadosPorBeneficiario,
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
  const filas = computed(() => ordenadosPorBeneficiario(pendientesDeClasificar(datos.value)));
  return { filtros, filas, cargando, cargar };
}

/** Qué está marcado, cuánto suma y con qué conceptos se puede clasificar (los que sirven a todo lo marcado). */
function usarSeleccion(filas: Ref<FilaDelReporte[]>) {
  const { conceptos } = usarCatalogoDeConceptos();
  const sesion = usarSesion();
  const seleccion = ref(new Set<string>());
  const conceptoElegido = ref<string | null>(null);
  const resumen = computed(() => resumenDeSeleccion(filas.value, seleccion.value));
  const opciones = computed(() =>
    opcionesParaClasificar(
      conceptos.value,
      tiposDeSeleccion(filas.value, seleccion.value),
      sesion.moduloActivo('cuentas-por-pagar'),
    ),
  );
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

/** Las filas que se ven: los pendientes con sus sugerencias y, si se pide, solo los que tienen sugerido. */
function usarFilasVisibles(todas: Ref<FilaDelReporte[]>, sugerencias: ReturnType<typeof usarSugerenciasDeBandeja>) {
  return computed(() =>
    sugerencias.soloConSugerencia.value ? conSugerido(todas.value, sugerencias.porMovimiento.value) : todas.value,
  );
}

/** Marcar y desmarcar: una fila, todas las que se ven, y cuántas de lo marcado tienen sugerido. */
function usarMarcas(
  filas: Ref<FilaDelReporte[]>,
  estado: ReturnType<typeof usarSeleccion>,
  porMovimiento: Ref<SugerenciasPorMovimiento>,
) {
  const { seleccion } = estado;
  return {
    todosMarcados: computed(() => todosMarcados(filas.value, seleccion.value)),
    cantidadSugerida: computed(() => cantidadConSugerido(filas.value, seleccion.value, porMovimiento.value)),
    alternar: (id: string) => (seleccion.value = conAlternado(seleccion.value, id)),
    alternarTodos: () => (seleccion.value = conTodosAlternados(filas.value, seleccion.value)),
  };
}

/**
 * La bandeja «Sin clasificar»: los originales que quedaron sin concepto (así los dejó la migración), ordenados por
 * beneficiario, con la sugerencia del servidor en cada uno (`Usar` con un clic, o aceptar lo sugerido de varios con
 * una ventana de confirmación) y, además, «Clasificar como…» con un concepto para todo lo marcado. Recargar
 * conserva las marcas que siguen vigentes.
 */
export function usarBandejaDeSinClasificar() {
  const { conceptos } = usarCatalogoDeConceptos();
  const sinClasificarId = computed(() => conceptoSinClasificar(conceptos.value)?.id ?? null);
  const { filtros, filas: todas, cargando, cargar } = usarPendientes(sinClasificarId);
  const sugerencias = usarSugerenciasDeBandeja(filtros);
  const filas = usarFilasVisibles(todas, sugerencias);
  const estado = usarSeleccion(filas);

  async function recargar(): Promise<void> {
    await Promise.all([cargar(), sugerencias.cargar()]);
    estado.seleccion.value = marcasVigentes(filas.value, estado.seleccion.value);
  }

  watch(filas, (visibles) => (estado.seleccion.value = marcasVigentes(visibles, estado.seleccion.value)));
  const aceptacion = usarAceptacionDeSugerencias(recargar);
  const { seleccion } = estado;
  const abrirLote = () => aceptacion.abrirLote(filas.value, seleccion.value, sugerencias.porMovimiento.value);

  return {
    ...{ filtros, filas, cargando, sugerencias, aceptacion, ...estado },
    ...usarMarcas(filas, estado, sugerencias.porMovimiento),
    clasificar: async () => (await clasificarMarcados(estado)) && (await recargar()),
    usar: aceptacion.usar,
    aceptarLoSugerido: abrirLote,
  };
}
