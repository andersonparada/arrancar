import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiConceptosDeGasto, type ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import { datosDeConceptoDeGasto, edicionDe, type EdicionDeConceptoDeGasto } from './edicion-de-concepto-de-gasto';

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

/** Los conceptos de gasto de la empresa: listarlos, registrarlos y editarlos en una ventana. */
export function usarConceptosDeGasto() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiConceptosDeGasto.listar(), SIN_REGISTROS, 'No se pudieron cargar los conceptos de gasto.');
  const ventana = usarVentanaDeConceptosDeGasto(cargar);

  const intercambio = usarIntercambio(apiConceptosDeGasto.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, ...ventana };
}
