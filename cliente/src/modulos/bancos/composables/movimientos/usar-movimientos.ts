import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiMovimientos, type Movimiento } from '../../servicios/movimientos.api';
import { datosDeMovimiento, edicionDe, type EdicionDeMovimiento } from './edicion-de-movimiento';
import { usarReferenciasDeMovimiento } from './referencias-de-movimiento';

const guardarMovimiento = (edicion: EdicionDeMovimiento) =>
  edicion.id
    ? apiMovimientos.actualizar(edicion.id, datosDeMovimiento(edicion))
    : apiMovimientos.crear(datosDeMovimiento(edicion));

/** Los movimientos de la empresa: listarlos, registrarlos y editarlos en una ventana. */
export function usarMovimientos() {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const {
    datos: registros,
    cargando,
    cargar,
  } = usarCarga(() => apiMovimientos.listar(), [] as Movimiento[], 'No se pudieron cargar los movimientos.');
  const referencias = usarReferenciasDeMovimiento();
  const edicion = ref<EdicionDeMovimiento>({ ...edicionDe(), abierta: false });

  function abrir(movimiento?: Movimiento): void {
    edicion.value = edicionDe(movimiento);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarMovimiento(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Movimiento registrado.' : 'Movimiento actualizado.');
    edicion.value.abierta = false;
    await cargar();
  }

  const intercambio = usarIntercambio(apiMovimientos.intercambio, cargar);

  return { registros, cargando, cargar, intercambio, referencias, edicion, enviando, errores, abrir, guardar };
}
