import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import type { TextosDeCatalogo } from './textos-de-catalogo';

/** Lo que cada catálogo aporta para inactivar, reactivar y eliminar sus registros. */
export interface AccionesDeCatalogo<Registro> {
  textos: TextosDeCatalogo;
  nombreDe(registro: Registro): string;
  /** Guarda el registro con su nuevo estado (inactivar y reactivar son un cambio de `activo`). */
  cambiarActivo(registro: Registro, activo: boolean): Promise<unknown>;
  eliminar(registro: Registro): Promise<unknown>;
}

/**
 * Inactivar, reactivar y eliminar un registro de un catálogo, cada acción con su confirmación y su aviso. `alTerminar`
 * recibe cuál se hizo: la lista recarga siempre; la ficha vuelve a la lista cuando el registro ya no existe.
 */
export function usarAccionesDeCatalogo<Registro extends { activo: boolean }>(
  acciones: AccionesDeCatalogo<Registro>,
  alTerminar: (accion: 'estado' | 'eliminar') => Promise<void>,
) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();
  const { textos, nombreDe } = acciones;

  async function cambiarEstado(registro: Registro): Promise<void> {
    const mensaje = textos.preguntaDeEstado(registro.activo, nombreDe(registro));
    const textoConfirmar = registro.activo ? 'Inactivar' : 'Reactivar';
    if (!(await avisos.confirmar({ mensaje, textoConfirmar }))) return;
    if (!(await enviar(() => acciones.cambiarActivo(registro, !registro.activo)))) return;
    avisos.exito(registro.activo ? textos.inactivado : textos.reactivado);
    await alTerminar('estado');
  }

  async function eliminar(registro: Registro): Promise<void> {
    const mensaje = textos.preguntaDeEliminar(nombreDe(registro));
    if (!(await avisos.confirmar({ mensaje, textoConfirmar: 'Eliminar' }))) return;
    if (!(await enviar(() => acciones.eliminar(registro)))) return;
    avisos.exito(textos.eliminado);
    await alTerminar('eliminar');
  }

  return { cambiarEstado, eliminar };
}
