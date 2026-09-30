import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiVigenciasDeCombustible, type VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';

/** Eliminar una vigencia de combustible, después de confirmarlo: no se puede deshacer. */
export function usarEliminacionDeVigenciaDeCombustible(alEliminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  async function eliminar(vigenciaDeCombustible: VigenciaDeCombustible): Promise<void> {
    const mensaje = `¿Eliminar la vigencia de combustible "${vigenciaDeCombustible.vigenteDesde}"? Esta acción no se puede deshacer.`;
    const confirmado = await avisos.confirmar({
      titulo: 'Eliminar vigencia de combustible',
      mensaje,
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado || !(await enviar(() => apiVigenciasDeCombustible.eliminar(vigenciaDeCombustible.id)))) return;
    avisos.exito('Vigencia de combustible eliminada.');
    await alEliminar();
  }

  return { eliminar };
}
