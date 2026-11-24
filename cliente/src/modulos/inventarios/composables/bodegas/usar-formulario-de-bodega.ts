import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { apiBodegas, type DatosBodega, type Bodega } from '../../servicios/bodegas.api';
import { datosDeBodega, edicionDe } from './edicion-de-bodega';
import { usarReferenciasDeBodega } from './referencias-de-bodega';

const guardarBodega = (id: string | null, datos: DatosBodega) =>
  id ? apiBodegas.actualizar(id, datos) : apiBodegas.crear(datos);

/** Un 409 (por ejemplo, inactivar con existencias) no es un fallo: se devuelve su mensaje para mostrarlo. */
async function intentarGuardar(id: string | null, datos: DatosBodega): Promise<Bodega | string> {
  try {
    return await guardarBodega(id, datos);
  } catch (error) {
    if (error instanceof ErrorApi && error.estado === 409) return error.message;
    throw error;
  }
}

/** Registrar una bodega o editarla en página completa; sin id es nueva. */
export function usarFormularioDeBodega(bodegaId: string | null) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const { datos: edicion, cargando } = usarCarga(
    async () => edicionDe(bodegaId ? await apiBodegas.obtener(bodegaId) : undefined),
    edicionDe(),
    'No se pudo cargar la bodega.',
  );
  const referencias = usarReferenciasDeBodega(edicion);
  const conflicto = ref('');

  /** @returns La bodega guardada, o `null` si el servidor no lo aceptó. */
  async function guardar(): Promise<Bodega | null> {
    let guardado: Bodega | null = null;
    conflicto.value = '';
    const aceptado = await enviar(async () => {
      const resultado = await intentarGuardar(bodegaId, datosDeBodega(edicion.value));
      if (typeof resultado === 'string') conflicto.value = resultado;
      else guardado = resultado;
    });
    if (aceptado && guardado) avisos.exito(bodegaId ? 'Bodega actualizada.' : 'Bodega registrada.');
    return guardado;
  }

  return { edicion, cargando, enviando, errores, referencias, conflicto, guardar };
}
