import { computed, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiConceptos, type Concepto } from '../../servicios/conceptos.api';
import { datosDeConcepto, edicionDe, type EdicionDeConcepto } from './edicion-de-concepto';
import { ordenarPorNombre } from './reglas-de-concepto';
import { usarAccionesDeConcepto } from './usar-acciones-de-concepto';

const guardarConcepto = (edicion: EdicionDeConcepto) =>
  edicion.id
    ? apiConceptos.actualizar(edicion.id, datosDeConcepto(edicion))
    : apiConceptos.crear(datosDeConcepto(edicion));

/** Los conceptos de la empresa por nombre: listarlos, registrarlos, editarlos e inactivarlos o eliminarlos. */
export function usarConceptos() {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const {
    datos: recibidos,
    cargando,
    cargar,
  } = usarCarga(() => apiConceptos.listar(), [] as Concepto[], 'No se pudieron cargar los conceptos.');
  const registros = computed(() => ordenarPorNombre(recibidos.value));
  const edicion = ref<EdicionDeConcepto>({ ...edicionDe(), abierta: false });

  function abrir(concepto?: Concepto): void {
    edicion.value = edicionDe(concepto);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarConcepto(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Concepto registrado.' : 'Concepto actualizado.');
    edicion.value.abierta = false;
    await cargar();
  }

  const intercambio = usarIntercambio(apiConceptos.intercambio, cargar);
  const acciones = usarAccionesDeConcepto(cargar);

  return { registros, cargando, intercambio, edicion, enviando, errores, abrir, guardar, ...acciones };
}
