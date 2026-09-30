import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCombustibles, type Combustible } from '../../servicios/combustibles.api';
import { datosDeCombustible, edicionDe, type EdicionDeCombustible } from './edicion-de-combustible';

const SIN_REGISTROS: Combustible[] = [];

const guardarCombustible = (edicion: EdicionDeCombustible) =>
  edicion.id
    ? apiCombustibles.actualizar(edicion.id, datosDeCombustible(edicion))
    : apiCombustibles.crear(datosDeCombustible(edicion));

/** La ventana de los combustibles: abrirla y guardar lo escrito, avisando y recargando la lista. */
function usarVentanaDeCombustibles(cargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeCombustible>({ ...edicionDe(), abierta: false });

  function abrir(combustible?: Combustible): void {
    edicion.value = edicionDe(combustible);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarCombustible(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Combustible registrado.' : 'Combustible actualizado.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}

/** Los combustibles de la empresa: listarlos, registrarlos y editarlos en una ventana. */
export function usarCombustibles() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiCombustibles.listar(), SIN_REGISTROS, 'No se pudieron cargar los combustibles.');
  const ventana = usarVentanaDeCombustibles(cargar);

  const intercambio = usarIntercambio(apiCombustibles.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, ...ventana };
}
