import { computed, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiClases, type Clase } from '../../servicios/clases.api';
import { datosDeClase, edicionDe, type EdicionDeClase } from './edicion-de-clase';
import { ordenarPorNombre } from './reglas-de-clase';
import { usarAccionesDeClase } from './usar-acciones-de-clase';

const SIN_REGISTROS: Clase[] = [];

const guardarClase = (edicion: EdicionDeClase) =>
  edicion.id ? apiClases.actualizar(edicion.id, datosDeClase(edicion)) : apiClases.crear(datosDeClase(edicion));

/** La ventana de las clases de activos: abrirla y guardar lo escrito, avisando y recargando la lista. */
function usarVentanaDeClases(cargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeClase>({ ...edicionDe(), abierta: false });

  function abrir(clase?: Clase): void {
    edicion.value = edicionDe(clase);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarClase(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Clase de activo registrada.' : 'Clase de activo actualizada.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}

/** Las clases de activos de la empresa: listarlas por nombre, registrarlas, editarlas, inactivarlas y eliminarlas. */
export function usarClases() {
  const {
    datos: recibidos,
    cargando,
    cargar,
  } = usarCarga(() => apiClases.listar(), SIN_REGISTROS, 'No se pudieron cargar las clases de activos.');
  const registros = computed(() => ordenarPorNombre(recibidos.value));
  const ventana = usarVentanaDeClases(cargar);
  const acciones = usarAccionesDeClase(cargar);

  const intercambio = usarIntercambio(apiClases.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, ...ventana, ...acciones };
}
