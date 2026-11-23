import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiConceptosDeIngreso, type ConceptoDeIngreso } from '../../servicios/conceptos-de-ingreso.api';
import { datosDeConceptoDeIngreso, edicionDe, type EdicionDeConceptoDeIngreso } from './edicion-de-concepto-de-ingreso';

const SIN_REGISTROS: ConceptoDeIngreso[] = [];

const guardarConceptoDeIngreso = (edicion: EdicionDeConceptoDeIngreso) =>
  edicion.id
    ? apiConceptosDeIngreso.actualizar(edicion.id, datosDeConceptoDeIngreso(edicion))
    : apiConceptosDeIngreso.crear(datosDeConceptoDeIngreso(edicion));

/** La ventana de los conceptos de ingreso: abrirla y guardar lo escrito, avisando y recargando la lista. */
function usarVentanaDeConceptosDeIngreso(cargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeConceptoDeIngreso>({ ...edicionDe(), abierta: false });

  function abrir(conceptoDeIngreso?: ConceptoDeIngreso): void {
    edicion.value = edicionDe(conceptoDeIngreso);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarConceptoDeIngreso(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Concepto de ingreso registrado.' : 'Concepto de ingreso actualizado.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}

/** Los conceptos de ingreso de la empresa: listarlos, registrarlos y editarlos en una ventana. */
export function usarConceptosDeIngreso() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiConceptosDeIngreso.listar(), SIN_REGISTROS, 'No se pudieron cargar los conceptos de ingreso.');
  const ventana = usarVentanaDeConceptosDeIngreso(cargar);

  const intercambio = usarIntercambio(apiConceptosDeIngreso.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, ...ventana };
}
