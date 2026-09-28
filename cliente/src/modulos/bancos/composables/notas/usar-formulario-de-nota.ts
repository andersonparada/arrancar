import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiNotas } from '../../servicios/notas.api';
import type { Movimiento } from '../../servicios/movimientos.api';
import { datosDeNota, edicionDe, type EdicionDeNota } from './edicion-de-nota';

const guardarNota = (edicion: EdicionDeNota) =>
  edicion.id ? apiNotas.actualizar(edicion.id, datosDeNota(edicion)) : apiNotas.crear(datosDeNota(edicion));

/** La ventana de registrar o corregir una nota: abrirla (nueva, de un tipo, o para editar) y guardarla. */
export function usarFormularioDeNota(alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeNota>({ ...edicionDe(), abierta: false });

  function nueva(tipo: 'credito' | 'debito'): void {
    edicion.value = edicionDe(undefined, tipo);
    errores.value = {};
  }

  function editar(nota: Movimiento): void {
    edicion.value = edicionDe(nota);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNueva = edicion.value.id === null;
    if (!(await enviar(() => guardarNota(edicion.value)))) return;
    avisos.exito(esNueva ? 'Nota registrada.' : 'Nota actualizada.');
    edicion.value.abierta = false;
    await alGuardar();
  }

  return { edicion, enviando, errores, nueva, editar, guardar };
}
