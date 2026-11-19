import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiClases, type Clase } from '../../servicios/clases.api';
import { datosParaCambiarEstado, mensajeDeCambioDeEstado, mensajeDeEliminacion } from './reglas-de-clase';

/** Inactivar, reactivar y eliminar una clase de activos, cada una con su confirmación. */
export function usarAccionesDeClase(alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  async function cambiarEstado(clase: Clase): Promise<void> {
    const reactivar = !clase.activo;
    const mensaje = mensajeDeCambioDeEstado(clase);
    if (!(await avisos.confirmar({ mensaje, textoConfirmar: reactivar ? 'Reactivar' : 'Inactivar' }))) return;
    if (!(await enviar(() => apiClases.actualizar(clase.id, datosParaCambiarEstado(clase))))) return;
    avisos.exito(reactivar ? 'Clase de activo reactivada.' : 'Clase de activo inactivada.');
    await alTerminar();
  }

  async function eliminar(clase: Clase): Promise<void> {
    if (!(await avisos.confirmar({ mensaje: mensajeDeEliminacion(clase), textoConfirmar: 'Eliminar' }))) return;
    if (!(await enviar(() => apiClases.eliminar(clase.id)))) return;
    avisos.exito('Clase de activo eliminada.');
    await alTerminar();
  }

  return { cambiarEstado, eliminar };
}
