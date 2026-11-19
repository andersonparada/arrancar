import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiInmuebles, type DatosInmueble, type Inmueble } from '../../servicios/inmuebles.api';
import { datosDeInmueble, edicionDe } from './edicion-de-inmueble';
import { usarReferenciasDeInmueble } from './referencias-de-inmueble';

const guardarInmueble = (id: string | null, datos: DatosInmueble) =>
  id ? apiInmuebles.actualizar(id, datos) : apiInmuebles.crear(datos);

/** Registrar un inmueble o editarlo en página completa; sin id es nuevo. */
export function usarFormularioDeInmueble(inmuebleId: string | null) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const { datos: edicion, cargando } = usarCarga(
    async () => edicionDe(inmuebleId ? await apiInmuebles.obtener(inmuebleId) : undefined),
    edicionDe(),
    'No se pudo cargar el inmueble.',
  );
  const referencias = usarReferenciasDeInmueble(edicion);

  /** @returns El inmueble guardado, o `null` si el servidor no lo aceptó. */
  async function guardar(): Promise<Inmueble | null> {
    let guardado: Inmueble | null = null;
    const aceptado = await enviar(async () => {
      guardado = await guardarInmueble(inmuebleId, datosDeInmueble(edicion.value));
    });
    if (aceptado) avisos.exito(inmuebleId ? 'Inmueble actualizado.' : 'Inmueble registrado.');
    return guardado;
  }

  return { edicion, cargando, enviando, errores, referencias, guardar };
}
