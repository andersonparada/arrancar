import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiBodegas, type Bodega } from '../../servicios/bodegas.api';
import { mensajeDeEliminacion } from './edicion-de-bodega';

/** La ficha de la bodega: sus datos y lo que puede hacer con ella quien la gestiona. */
export function usarFichaDeBodega(bodegaId: string) {
  const router = useRouter();
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();
  const { datos: registro, cargando } = usarCarga(
    () => apiBodegas.obtener(bodegaId),
    null as Bodega | null,
    'No se pudo cargar la bodega.',
  );
  const editar = () => router.push({ name: 'inventarios.bodegas.editar', params: { bodegaId } });

  /** Confirma y elimina; si ya se usó, el aviso del servidor dice qué hacer. */
  async function eliminar(): Promise<void> {
    if (!registro.value) return;
    const mensaje = mensajeDeEliminacion(registro.value.nombre);
    if (!(await avisos.confirmar({ mensaje, textoConfirmar: 'Eliminar', peligroso: true }))) return;
    if (!(await enviar(() => apiBodegas.eliminar(bodegaId)))) return;
    avisos.exito('Bodega eliminada.');
    await router.push({ name: 'inventarios.bodegas' });
  }

  return { registro, cargando, editar, eliminar };
}
