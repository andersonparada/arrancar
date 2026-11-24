import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import {
  avisoDeCambioDeEstado,
  mensajeDeCambioDeEstado,
  mensajeDeEliminacion,
  type NombreDeCatalogo,
} from './cambio-de-estado';

interface Acciones<R> {
  actualizar: (registro: R) => Promise<unknown>;
  eliminar: (registro: R) => Promise<unknown>;
  alTerminar: () => Promise<void>;
}

/** Confirmar y eliminar un registro del catálogo; si el servidor lo rechaza avisa con su mensaje. */
function usarEliminacion<R extends { nombre: string }>(
  catalogo: NombreDeCatalogo,
  eliminar: (registro: R) => Promise<unknown>,
  alTerminar: () => Promise<void>,
) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  return async (registro: R): Promise<void> => {
    const confirmado = await avisos.confirmar({
      titulo: 'Eliminar',
      mensaje: mensajeDeEliminacion(catalogo, registro.nombre),
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado || !(await enviar(() => eliminar(registro)))) return;
    avisos.exito(`${catalogo.capitalizado} eliminado.`);
    await alTerminar();
  };
}

/**
 * Inactivar, reactivar y eliminar un registro de un catálogo, con una confirmación que explica el efecto. `actualizar`
 * manda el registro con `activo` invertido; si el servidor lo rechaza (p. ej. eliminar algo con documentos), avisa con
 * su mensaje.
 */
export function usarCambioDeEstado<R extends { nombre: string; activo: boolean }>(
  catalogo: NombreDeCatalogo,
  { actualizar, eliminar, alTerminar }: Acciones<R>,
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

  const eliminarRegistro = usarEliminacion(catalogo, eliminar, alTerminar);

  return { cambiarEstado, eliminar: eliminarRegistro };
}
