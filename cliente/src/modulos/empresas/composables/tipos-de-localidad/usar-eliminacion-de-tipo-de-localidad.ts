import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiTiposDeLocalidad, type TipoDeLocalidad } from '../../servicios/tipos-de-localidad.api';
import { mensajeDeEliminacion } from './edicion-de-tipo-de-localidad';

/** Eliminar un tipo de localidad con confirmación; si está en uso, el aviso del servidor dice qué hacer. */
export function usarEliminacionDeTipoDeLocalidad(alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  async function eliminar(tipo: TipoDeLocalidad): Promise<void> {
    const mensaje = mensajeDeEliminacion(tipo.nombre);
    if (!(await avisos.confirmar({ mensaje, textoConfirmar: 'Eliminar', peligroso: true }))) return;
    if (!(await enviar(() => apiTiposDeLocalidad.eliminar(tipo.id)))) return;
    avisos.exito('Tipo de localidad eliminado.');
    await alTerminar();
  }

  return { eliminar };
}
