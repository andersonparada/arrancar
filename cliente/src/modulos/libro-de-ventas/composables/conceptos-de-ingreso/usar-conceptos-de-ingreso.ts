import { computed, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiConceptosDeIngreso, type ConceptoDeIngreso } from '../../servicios/conceptos-de-ingreso.api';
import { ordenarPorNombre } from '../comunes/cambio-de-estado';
import { usarCambioDeEstado } from '../comunes/usar-cambio-de-estado';
import { datosDeConceptoDeIngreso, edicionDe, type EdicionDeConceptoDeIngreso } from './edicion-de-concepto-de-ingreso';
import { NOMBRE_DE_CONCEPTO_DE_INGRESO, datosParaCambiarEstado } from './reglas-de-concepto-de-ingreso';

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

/** Los conceptos de ingreso de la empresa por nombre: listarlos, registrarlos, editarlos, inactivarlos y eliminarlos. */
export function usarConceptosDeIngreso() {
  const {
    datos: recibidos,
    cargando,
    cargar,
  } = usarCarga(() => apiConceptosDeIngreso.listar(), SIN_REGISTROS, 'No se pudieron cargar los conceptos de ingreso.');
  const registros = computed(() => ordenarPorNombre(recibidos.value));
  const ventana = usarVentanaDeConceptosDeIngreso(cargar);
  const { cambiarEstado, eliminar } = usarCambioDeEstado(NOMBRE_DE_CONCEPTO_DE_INGRESO, {
    actualizar: (concepto: ConceptoDeIngreso) =>
      apiConceptosDeIngreso.actualizar(concepto.id, datosParaCambiarEstado(concepto)),
    eliminar: (concepto: ConceptoDeIngreso) => apiConceptosDeIngreso.eliminar(concepto.id),
    alTerminar: cargar,
  });

  const intercambio = usarIntercambio(apiConceptosDeIngreso.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, cambiarEstado, eliminar, ...ventana };
}
