import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiNotas } from '../../servicios/notas.api';
import type { Movimiento } from '../../servicios/movimientos.api';
import { datosDeNota, edicionDe, type EdicionDeNota } from './edicion-de-nota';
import { usarConceptosDeNota } from './usar-conceptos-de-nota';

const guardarNota = (edicion: EdicionDeNota) =>
  edicion.id ? apiNotas.actualizar(edicion.id, datosDeNota(edicion)) : apiNotas.crear(datosDeNota(edicion));

/** Enviar la nota: avisar, cerrar la ventana y recargar la lista; los errores se reparten por campo. */
function usarGuardadoDeNota(edicion: Ref<EdicionDeNota>, alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();

  async function guardar(): Promise<void> {
    const esNueva = edicion.value.id === null;
    if (!(await enviar(() => guardarNota(edicion.value)))) return;
    avisos.exito(esNueva ? 'Nota registrada.' : 'Nota actualizada.');
    edicion.value.abierta = false;
    await alGuardar();
  }

  return { enviando, errores, guardar };
}

/**
 * La ventana de registrar o corregir una nota: abrirla (nueva, de un tipo, o para editar) y guardarla, con su
 * concepto (`notasConocidas` alimenta la sugerencia por beneficiario).
 */
export function usarFormularioDeNota(alGuardar: () => Promise<void>, notasConocidas: () => Movimiento[]) {
  const edicion = ref<EdicionDeNota>({ ...edicionDe(), abierta: false });
  const conceptoGuardado = ref<string | null>(null);
  const conceptos = usarConceptosDeNota(edicion, conceptoGuardado, notasConocidas);
  const guardado = usarGuardadoDeNota(edicion, alGuardar);

  function abrir(nota: Movimiento | undefined, tipo: 'credito' | 'debito'): void {
    edicion.value = edicionDe(nota, tipo);
    conceptoGuardado.value = nota?.conceptoId ?? null;
    guardado.errores.value = {};
  }

  return {
    edicion,
    ...guardado,
    ...conceptos,
    nueva: (tipo: 'credito' | 'debito') => abrir(undefined, tipo),
    editar: (nota: Movimiento) => abrir(nota, nota.tipo === 'credito' ? 'credito' : 'debito'),
  };
}
