import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiMovimientos, type Movimiento } from '../../servicios/movimientos.api';
import { datosDeMovimiento, edicionDe, type EdicionDeMovimiento } from './edicion-de-movimiento';

const guardarMovimiento = (edicion: EdicionDeMovimiento) =>
  edicion.id
    ? apiMovimientos.actualizar(edicion.id, datosDeMovimiento(edicion))
    : apiMovimientos.crear(datosDeMovimiento(edicion));

/** La ventana de registrar o corregir un movimiento: abrirla (nueva, de un tipo, o para editar) y guardarla. */
export function usarFormularioDeMovimiento(alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeMovimiento>({ ...edicionDe(), abierta: false });

  function nuevo(tipo: 'credito' | 'debito'): void {
    edicion.value = edicionDe(undefined, tipo);
    errores.value = {};
  }

  function editar(movimiento: Movimiento): void {
    edicion.value = edicionDe(movimiento);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarMovimiento(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Movimiento registrado.' : 'Movimiento actualizado.');
    edicion.value.abierta = false;
    await alGuardar();
  }

  return { edicion, enviando, errores, nuevo, editar, guardar };
}
