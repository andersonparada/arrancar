import { reactive } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiTerceros, type Contacto, type DatosContacto } from '../servicios/terceros.api';
import { contactoVacio } from './datos-de-tercero';

function edicionDe(existente?: Contacto) {
  const { id, ...datos } = existente ?? { id: null, ...contactoVacio() };
  return { abierta: true, id, datos };
}

/** Agregar, cambiar y eliminar las personas de contacto desde la ficha. */
export function usarContactosDelTercero(terceroId: string, alCambiar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = reactive({ abierta: false, id: null as string | null, datos: contactoVacio() });

  const abrir = (existente?: Contacto) => Object.assign(edicion, edicionDe(existente));

  async function guardar(datos: DatosContacto): Promise<void> {
    const { id } = edicion;
    const exito = await enviar(() =>
      id ? apiTerceros.actualizarContacto(terceroId, id, datos) : apiTerceros.crearContacto(terceroId, datos),
    );
    if (!exito) return;
    edicion.abierta = false;
    await alCambiar();
  }

  async function eliminar(contacto: Contacto): Promise<void> {
    if (!window.confirm(`¿Eliminar a ${contacto.nombre} de los contactos?`)) return;
    await apiTerceros
      .eliminarContacto(terceroId, contacto.id)
      .then(alCambiar, (error: Error) => avisos.error(error.message));
  }

  return { edicion, enviando, errores, abrir, guardar, eliminar };
}
