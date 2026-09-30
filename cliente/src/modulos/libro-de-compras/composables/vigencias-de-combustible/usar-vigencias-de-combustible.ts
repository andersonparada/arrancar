import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiVigenciasDeCombustible, type VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';
import {
  datosDeVigenciaDeCombustible,
  edicionDe,
  type EdicionDeVigenciaDeCombustible,
} from './edicion-de-vigencia-de-combustible';
import { usarReferenciasDeVigenciaDeCombustible } from './referencias-de-vigencia-de-combustible';

const SIN_REGISTROS: VigenciaDeCombustible[] = [];

const guardarVigenciaDeCombustible = (edicion: EdicionDeVigenciaDeCombustible) =>
  edicion.id
    ? apiVigenciasDeCombustible.actualizar(edicion.id, datosDeVigenciaDeCombustible(edicion))
    : apiVigenciasDeCombustible.crear(datosDeVigenciaDeCombustible(edicion));

/** La ventana de las vigencias de combustible: abrirla y guardar lo escrito, avisando y recargando la lista. */
function usarVentanaDeVigenciasDeCombustible(cargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeVigenciaDeCombustible>({ ...edicionDe(), abierta: false });

  function abrir(vigenciaDeCombustible?: VigenciaDeCombustible): void {
    edicion.value = edicionDe(vigenciaDeCombustible);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarVigenciaDeCombustible(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Vigencia de combustible registrada.' : 'Vigencia de combustible actualizada.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}

/** Las vigencias de combustible de la empresa: listarlos, registrarlos y editarlos en una ventana. */
export function usarVigenciasDeCombustible() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(
    () => apiVigenciasDeCombustible.listar(),
    SIN_REGISTROS,
    'No se pudieron cargar las vigencias de combustible.',
  );
  const referencias = usarReferenciasDeVigenciaDeCombustible();
  const ventana = usarVentanaDeVigenciasDeCombustible(cargar);

  const intercambio = usarIntercambio(apiVigenciasDeCombustible.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, referencias, ...ventana };
}
