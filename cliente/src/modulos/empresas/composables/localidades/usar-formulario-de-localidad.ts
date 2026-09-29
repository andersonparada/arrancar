import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { apiLocalidades, type DatosLocalidad, type Localidad } from '../../servicios/localidades.api';
import { datosDeLocalidad, edicionDe } from './edicion-de-localidad';
import { usarReferenciasDeLocalidad } from './referencias-de-localidad';

const guardarLocalidad = (id: string | null, datos: DatosLocalidad) =>
  id ? apiLocalidades.actualizar(id, datos) : apiLocalidades.crear(datos);

/** Un 409 (código, nombre o establecimiento repetido) no es un fallo: se devuelve su mensaje para mostrarlo. */
async function intentarGuardar(id: string | null, datos: DatosLocalidad): Promise<Localidad | string> {
  try {
    return await guardarLocalidad(id, datos);
  } catch (error) {
    if (error instanceof ErrorApi && error.estado === 409) return error.message;
    throw error;
  }
}

/** Registrar una localidad o editarla en página completa; sin id es nueva. */
export function usarFormularioDeLocalidad(localidadId: string | null) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const { datos: edicion, cargando } = usarCarga(
    async () => edicionDe(localidadId ? await apiLocalidades.obtener(localidadId) : undefined),
    edicionDe(),
    'No se pudo cargar la localidad.',
  );
  const referencias = usarReferenciasDeLocalidad(edicion);
  const conflicto = ref('');

  /** @returns La localidad guardada, o `null` si el servidor no lo aceptó. */
  async function guardar(): Promise<Localidad | null> {
    let guardado: Localidad | null = null;
    conflicto.value = '';
    const aceptado = await enviar(async () => {
      const resultado = await intentarGuardar(localidadId, datosDeLocalidad(edicion.value));
      if (typeof resultado === 'string') conflicto.value = resultado;
      else guardado = resultado;
    });
    if (aceptado && guardado) avisos.exito(localidadId ? 'Localidad actualizada.' : 'Localidad registrada.');
    return guardado;
  }

  return { edicion, cargando, enviando, errores, referencias, conflicto, guardar };
}
