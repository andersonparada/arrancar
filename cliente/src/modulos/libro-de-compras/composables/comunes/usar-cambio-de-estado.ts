import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { avisoDeCambioDeEstado, mensajeDeCambioDeEstado, type NombreDeCatalogo } from './cambio-de-estado';

/**
 * Inactivar o reactivar un registro de un catálogo, con una confirmación que explica el efecto.
 * `actualizar` manda el registro con `activo` invertido; si el servidor lo rechaza, avisa con su mensaje.
 */
export function usarCambioDeEstado<R extends { nombre: string; activo: boolean }>(
  catalogo: NombreDeCatalogo,
  actualizar: (registro: R) => Promise<unknown>,
  alTerminar: () => Promise<void>,
) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  async function cambiarEstado(registro: R): Promise<void> {
    const reactivar = !registro.activo;
    const confirmado = await avisos.confirmar({
      titulo: reactivar ? 'Reactivar' : 'Inactivar',
      mensaje: mensajeDeCambioDeEstado(catalogo, registro),
      textoConfirmar: reactivar ? 'Reactivar' : 'Inactivar',
    });
    if (!confirmado || !(await enviar(() => actualizar(registro)))) return;
    avisos.exito(avisoDeCambioDeEstado(catalogo, reactivar));
    await alTerminar();
  }

  return { cambiarEstado };
}
