import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiLocalidades, type Localidad } from '../../servicios/localidades.api';
import { mensajeDeEliminacion } from './edicion-de-localidad';

/** La ficha de la localidad: sus datos y lo que puede hacer con la localidad quien la gestiona. */
export function usarFichaDeLocalidad(localidadId: string) {
  const router = useRouter();
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();
  const { datos: registro, cargando } = usarCarga(
    () => apiLocalidades.obtener(localidadId),
    null as Localidad | null,
    'No se pudo cargar la localidad.',
  );
  const editar = () => router.push({ name: 'empresas.localidades.editar', params: { localidadId } });

  /** Confirma y elimina; si está en uso, el aviso del servidor dice qué hacer. */
  async function eliminar(): Promise<void> {
    if (!registro.value) return;
    const mensaje = mensajeDeEliminacion(registro.value.nombre);
    if (!(await avisos.confirmar({ mensaje, textoConfirmar: 'Eliminar', peligroso: true }))) return;
    if (!(await enviar(() => apiLocalidades.eliminar(localidadId)))) return;
    avisos.exito('Localidad eliminada.');
    await router.push({ name: 'empresas.localidades' });
  }

  return { registro, cargando, editar, eliminar };
}
