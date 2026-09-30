import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiVigenciasDeCombustible, type VigenciaDeCombustible } from '../../servicios/vigencias-de-combustible.api';
import { mensajeDeEliminacion } from './reglas-de-vigencia-de-combustible';

/** Eliminar una tasa de un combustible, después de confirmarlo: no se puede deshacer. */
export function usarEliminacionDeVigenciaDeCombustible(alEliminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  async function eliminar(vigencia: VigenciaDeCombustible): Promise<void> {
    const confirmado = await avisos.confirmar({
      titulo: 'Eliminar tasa',
      mensaje: mensajeDeEliminacion(vigencia),
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado || !(await enviar(() => apiVigenciasDeCombustible.eliminar(vigencia.id)))) return;
    avisos.exito('Tasa eliminada.');
    await alEliminar();
  }

  return { eliminar };
}
