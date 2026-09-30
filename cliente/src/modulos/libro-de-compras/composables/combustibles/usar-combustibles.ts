import { computed, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCombustibles, type Combustible } from '../../servicios/combustibles.api';
import { ordenarPorNombre } from '../comunes/cambio-de-estado';
import { usarCambioDeEstado } from '../comunes/usar-cambio-de-estado';
import { datosDeCombustible, edicionDe, type EdicionDeCombustible } from './edicion-de-combustible';
import { NOMBRE_DE_COMBUSTIBLE, datosParaCambiarEstado } from './reglas-de-combustible';

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

/** Los combustibles de la empresa por nombre: listarlos, registrarlos, editarlos e inactivarlos. */
export function usarCombustibles() {
  const {
    datos: recibidos,
    cargando,
    cargar,
  } = usarCarga(() => apiCombustibles.listar(), SIN_REGISTROS, 'No se pudieron cargar los combustibles.');
  const registros = computed(() => ordenarPorNombre(recibidos.value));
  const ventana = usarVentanaDeCombustibles(cargar);
  const { cambiarEstado } = usarCambioDeEstado(
    NOMBRE_DE_COMBUSTIBLE,
    (combustible: Combustible) => apiCombustibles.actualizar(combustible.id, datosParaCambiarEstado(combustible)),
    cargar,
  );
  const intercambio = usarIntercambio(apiCombustibles.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, cambiarEstado, ...ventana };
}
