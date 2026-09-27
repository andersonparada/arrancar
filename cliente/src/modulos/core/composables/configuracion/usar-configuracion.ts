import { ref, watch } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { usarSesion } from '../../almacenes/sesion';
import { apiConfiguracion, type NivelEditable, type VariableConfiguracion } from '../../servicios/configuracion.api';
import { usarCarga } from '../usar-carga';
import { usarFormulario } from '../usar-formulario';
import { borradoresDe, llaveDelBorrador, valorParaGuardar } from './valores-de-configuracion';

/** Las variables de la cuenta y la empresa activa: cambiarlas o volver a heredar el valor. */
export function usarConfiguracion() {
  const sesion = usarSesion();
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();
  const { datos: variables, cargar } = usarCarga(
    () => apiConfiguracion.listar(),
    [] as VariableConfiguracion[],
    'No se pudo cargar la configuración.',
  );
  const borradores = ref<Record<string, unknown>>({});
  watch(variables, (lista) => (borradores.value = borradoresDe(lista)));

  /** La sesión también se recarga: el formato regional y otros ajustes salen de ahí. */
  async function aplicar(accion: () => Promise<unknown>, aviso: string): Promise<void> {
    if (!(await enviar(accion))) return;
    avisos.exito(aviso);
    await Promise.all([cargar(), sesion.cargar()]);
  }

  const guardar = (variable: VariableConfiguracion, nivel: NivelEditable) => {
    const valor = valorParaGuardar(variable, borradores.value[llaveDelBorrador(variable, nivel)]);
    return aplicar(() => apiConfiguracion.establecer(variable.clave, nivel, valor), 'Configuración guardada.');
  };
  const restablecer = (variable: VariableConfiguracion, nivel: NivelEditable) =>
    aplicar(() => apiConfiguracion.restablecer(variable.clave, nivel), 'Se usará el valor heredado.');

  return { variables, borradores, guardar, restablecer };
}
