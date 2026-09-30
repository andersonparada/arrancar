import { computed, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiConceptosDeGasto, type ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import { ordenarPorNombre } from '../comunes/cambio-de-estado';
import { usarCambioDeEstado } from '../comunes/usar-cambio-de-estado';
import { datosDeConceptoDeGasto, edicionDe, type EdicionDeConceptoDeGasto } from './edicion-de-concepto-de-gasto';
import { NOMBRE_DE_CONCEPTO_DE_GASTO, datosParaCambiarEstado } from './reglas-de-concepto-de-gasto';

const SIN_REGISTROS: ConceptoDeGasto[] = [];

const guardarConceptoDeGasto = (edicion: EdicionDeConceptoDeGasto) =>
  edicion.id
    ? apiConceptosDeGasto.actualizar(edicion.id, datosDeConceptoDeGasto(edicion))
    : apiConceptosDeGasto.crear(datosDeConceptoDeGasto(edicion));

/** La ventana de los conceptos de gasto: abrirla y guardar lo escrito, avisando y recargando la lista. */
function usarVentanaDeConceptosDeGasto(cargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeConceptoDeGasto>({ ...edicionDe(), abierta: false });

  function abrir(conceptoDeGasto?: ConceptoDeGasto): void {
    edicion.value = edicionDe(conceptoDeGasto);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarConceptoDeGasto(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Concepto de gasto registrado.' : 'Concepto de gasto actualizado.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}

/** Los conceptos de gasto de la empresa por nombre: listarlos, registrarlos, editarlos e inactivarlos. */
export function usarConceptosDeGasto() {
  const {
    datos: recibidos,
    cargando,
    cargar,
  } = usarCarga(() => apiConceptosDeGasto.listar(), SIN_REGISTROS, 'No se pudieron cargar los conceptos de gasto.');
  const registros = computed(() => ordenarPorNombre(recibidos.value));
  const ventana = usarVentanaDeConceptosDeGasto(cargar);
  const { cambiarEstado } = usarCambioDeEstado(
    NOMBRE_DE_CONCEPTO_DE_GASTO,
    (concepto: ConceptoDeGasto) => apiConceptosDeGasto.actualizar(concepto.id, datosParaCambiarEstado(concepto)),
    cargar,
  );
  const intercambio = usarIntercambio(apiConceptosDeGasto.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, cambiarEstado, ...ventana };
}
