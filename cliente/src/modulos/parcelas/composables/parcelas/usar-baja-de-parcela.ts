import type { Ref } from 'vue';
import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiParcelas, type FichaDeParcela } from '../../servicios/parcelas.api';
import { mensajeDeEliminacion, mensajeDeInactivacion } from './edicion-de-parcela';

/** Inactivar y reactivar: reactivar se hace directo; inactivar pide confirmar con lo que va a pasar. */
function usarCambioDeEstado(registro: Ref<FichaDeParcela | null>, recargar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  return async function cambiarEstado(): Promise<void> {
    if (!registro.value) return;
    const { id, activo, nombre, hijasActivas } = registro.value;
    if (activo) {
      const mensaje = mensajeDeInactivacion(nombre, hijasActivas);
      if (!(await avisos.confirmar({ mensaje, textoConfirmar: 'Inactivar', peligroso: true }))) return;
    }
    if (!(await enviar(() => (activo ? apiParcelas.inactivar(id) : apiParcelas.reactivar(id))))) return;
    avisos.exito(activo ? 'Parcela inactivada.' : 'Parcela reactivada.');
    await recargar();
  };
}

/** Confirma y elimina; si ya tiene subparcelas o mediciones, el aviso del servidor dice qué hacer. */
function usarEliminacion(registro: Ref<FichaDeParcela | null>) {
  const router = useRouter();
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  return async function eliminar(): Promise<void> {
    if (!registro.value) return;
    const { id, nombre } = registro.value;
    const mensaje = mensajeDeEliminacion(nombre);
    if (!(await avisos.confirmar({ mensaje, textoConfirmar: 'Eliminar', peligroso: true }))) return;
    if (!(await enviar(() => apiParcelas.eliminar(id)))) return;
    avisos.exito('Parcela eliminada.');
    await router.push({ name: 'parcelas.parcelas' });
  };
}

/** Inactivar, reactivar y eliminar la parcela de la ficha; tras cambiarle el estado se vuelve a leer. */
export function usarBajaDeParcela(registro: Ref<FichaDeParcela | null>, recargar: () => Promise<void>) {
  return { cambiarEstado: usarCambioDeEstado(registro, recargar), eliminar: usarEliminacion(registro) };
}
