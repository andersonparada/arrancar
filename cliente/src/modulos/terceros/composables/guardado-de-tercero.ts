import { apiTerceros, type PapelTercero } from '../servicios/terceros.api';
import { conConfirmacionDeDuplicado, DESISTIO } from './confirmar-duplicado';
import { altaCompleta } from './datos-de-tercero';
import type { DatosDelFormulario } from './usar-datos-del-formulario';

type Formulario = Pick<DatosDelFormulario, 'datos' | 'papeles' | 'contactos'>;

/** Lo registra con el papel de la pantalla y sus contactos, en un solo paso. */
export async function registrarTercero(papel: PapelTercero, { datos, papeles, contactos }: Formulario) {
  const alta = altaCompleta(datos.value, papel, { papeles: papeles.value, contactos: contactos.value });
  const creado = await conConfirmacionDeDuplicado((confirmarDuplicado) =>
    apiTerceros.crear({ ...alta, confirmarDuplicado }),
  );
  return creado === DESISTIO ? null : creado.id;
}

/**
 * Guarda los datos y, si el usuario puede cambiarlo, el papel de la pantalla.
 * @returns el id, o `null` si el usuario desistió al ver que se parece a otro.
 */
export async function editarTercero(
  id: string,
  { datos, papeles }: Formulario,
  papelQueCambia: PapelTercero | null,
): Promise<string | null> {
  const guardado = await conConfirmacionDeDuplicado((confirmarDuplicado) =>
    apiTerceros.actualizar(id, { ...datos.value, confirmarDuplicado }),
  );
  if (guardado === DESISTIO) return null;
  if (papelQueCambia === 'cliente') await apiTerceros.asignarCliente(id, papeles.value.cliente);
  if (papelQueCambia === 'proveedor') await apiTerceros.asignarProveedor(id, papeles.value.proveedor);
  return id;
}
