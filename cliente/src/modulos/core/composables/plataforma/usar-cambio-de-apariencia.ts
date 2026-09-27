import { usarApariencia } from '../../almacenes/apariencia';
import type { Apariencia } from '../../servicios/apariencia.api';
import { usarFormulario } from '../usar-formulario';

/** Envía un cambio de apariencia y aplica al instante la que devuelve el servidor. */
export function usarCambioDeApariencia() {
  const apariencia = usarApariencia();
  const { enviando, errores, enviar } = usarFormulario();

  /** @returns la apariencia nueva, o nada si el servidor rechazó el cambio. */
  async function aplicar(accion: () => Promise<Apariencia>): Promise<Apariencia | undefined> {
    let nueva: Apariencia | undefined;
    const exito = await enviar(async () => apariencia.establecer((nueva = await accion())));
    return exito ? nueva : undefined;
  }

  return { enviando, errores, aplicar };
}
