import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { PERMISO_DEL_PAPEL } from '../papeles';
import type { PapelTercero } from '../servicios/terceros.api';
import { editarTercero, registrarTercero } from './guardado-de-tercero';
import { usarDatosDelFormulario } from './usar-datos-del-formulario';

/**
 * El formulario completo de un cliente o proveedor, para crearlo o editarlo. Al
 * crearlo entra con el papel de la pantalla y con sus contactos, en un solo paso.
 */
export function usarFormularioDeTercero(papel: PapelTercero, terceroId: string | null) {
  const avisos = usarAvisos();
  const sesion = usarSesion();
  const { enviando, errores, enviar } = usarFormulario();
  const formulario = usarDatosDelFormulario(terceroId);
  const papelQueCambia = sesion.puede(PERMISO_DEL_PAPEL[papel]) ? papel : null;

  /** @returns el id del cliente o proveedor guardado, o `null` si no se guardó. */
  async function guardar(): Promise<string | null> {
    let id: string | null = null;
    const exito = await enviar(async () => {
      id = terceroId
        ? await editarTercero(terceroId, formulario, papelQueCambia)
        : await registrarTercero(papel, formulario);
    });
    if (exito && id) avisos.exito('Guardado.');
    return exito ? id : null;
  }

  return { ...formulario, esNuevo: !terceroId, enviando, errores, guardar };
}
