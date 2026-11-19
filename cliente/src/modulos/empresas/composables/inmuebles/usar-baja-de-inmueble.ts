import type { Ref } from 'vue';
import { useRouter } from 'vue-router';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiInmuebles, type Inmueble } from '../../servicios/inmuebles.api';
import { mensajeDeEliminacion } from './edicion-de-inmueble';

/** Inactivar, reactivar y eliminar el inmueble de la ficha; después de cambiarle el estado se vuelve a leer. */
export function usarBajaDeInmueble(registro: Ref<Inmueble | null>, recargar: () => Promise<void>) {
  const router = useRouter();
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();

  /** Inactiva o reactiva el inmueble según esté. */
  async function cambiarEstado(): Promise<void> {
    if (!registro.value) return;
    const { id, activo } = registro.value;
    const accion = () => (activo ? apiInmuebles.inactivar(id) : apiInmuebles.reactivar(id));
    if (!(await enviar(accion))) return;
    avisos.exito(activo ? 'Inmueble inactivado.' : 'Inmueble reactivado.');
    await recargar();
  }

  /** Confirma y elimina; si lo usan Parcelas o Activos fijos, el aviso del servidor dice qué hacer. */
  async function eliminar(): Promise<void> {
    if (!registro.value) return;
    const { id, nombre } = registro.value;
    const mensaje = mensajeDeEliminacion(nombre);
    if (!(await avisos.confirmar({ mensaje, textoConfirmar: 'Eliminar', peligroso: true }))) return;
    if (!(await enviar(() => apiInmuebles.eliminar(id)))) return;
    avisos.exito('Inmueble eliminado.');
    await router.push({ name: 'empresas.inmuebles' });
  }

  return { cambiarEstado, eliminar };
}
