import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiLocalidades, type DatosLocalidad, type Localidad } from '../../servicios/localidades.api';
import { datosDeLocalidad, edicionDe } from './edicion-de-localidad';
import { usarReferenciasDeLocalidad } from './referencias-de-localidad';

const guardarLocalidad = (id: string | null, datos: DatosLocalidad) =>
  id ? apiLocalidades.actualizar(id, datos) : apiLocalidades.crear(datos);

/** Registrar una localidad o editarla en página completa; sin id es nueva. */
export function usarFormularioDeLocalidad(localidadId: string | null) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const { datos: edicion, cargando } = usarCarga(
    async () => edicionDe(localidadId ? await apiLocalidades.obtener(localidadId) : undefined),
    edicionDe(),
    'No se pudo cargar la localidad.',
  );
  const referencias = usarReferenciasDeLocalidad();

  /** @returns La localidad guardada, o `null` si el servidor no lo aceptó. */
  async function guardar(): Promise<Localidad | null> {
    let guardado: Localidad | null = null;
    const aceptado = await enviar(async () => {
      guardado = await guardarLocalidad(localidadId, datosDeLocalidad(edicion.value));
    });
    if (aceptado) avisos.exito(localidadId ? 'Localidad actualizada.' : 'Localidad registrada.');
    return guardado;
  }

  return { edicion, cargando, enviando, errores, referencias, guardar };
}
