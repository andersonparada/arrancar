import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiTiposDeLocalidad, type TipoDeLocalidad } from '../../servicios/tipos-de-localidad.api';
import { datosDeTipoDeLocalidad, edicionDe, type EdicionDeTipoDeLocalidad } from './edicion-de-tipo-de-localidad';
import { usarEliminacionDeTipoDeLocalidad } from './usar-eliminacion-de-tipo-de-localidad';

const SIN_REGISTROS: TipoDeLocalidad[] = [];

const guardarTipoDeLocalidad = (edicion: EdicionDeTipoDeLocalidad) =>
  edicion.id
    ? apiTiposDeLocalidad.actualizar(edicion.id, datosDeTipoDeLocalidad(edicion))
    : apiTiposDeLocalidad.crear(datosDeTipoDeLocalidad(edicion));

/** La ventana de tipos de localidad: abrirla y guardar lo escrito, avisando y recargando la lista. */
function usarVentanaDeTiposDeLocalidad(cargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeTipoDeLocalidad>({ ...edicionDe(), abierta: false });

  function abrir(tipoDeLocalidad?: TipoDeLocalidad): void {
    edicion.value = edicionDe(tipoDeLocalidad);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarTipoDeLocalidad(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Tipo de localidad registrado.' : 'Tipo de localidad actualizado.');
    edicion.value.abierta = false;
    await cargar();
  }

  return { edicion, enviando, errores, abrir, guardar };
}

/** Los tipos de localidad de la empresa: listarlos, registrarlos y editarlos en una ventana. */
export function usarTiposDeLocalidad() {
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiTiposDeLocalidad.listar(), SIN_REGISTROS, 'No se pudieron cargar los tipos de localidad.');
  const ventana = usarVentanaDeTiposDeLocalidad(cargar);
  const intercambio = usarIntercambio(apiTiposDeLocalidad.intercambio, cargar);

  const { eliminar } = usarEliminacionDeTipoDeLocalidad(cargar);

  return { registros, cargando, cargar, intercambio, eliminar, ...ventana };
}
