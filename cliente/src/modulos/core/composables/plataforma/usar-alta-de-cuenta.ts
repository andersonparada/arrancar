import { ref } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { usarSesion } from '../../almacenes/sesion';
import { apiPlataforma } from '../../servicios/plataforma.api';
import { usarFormulario } from '../usar-formulario';
import { altaVacia, avisoDelAlta, datosDelAlta } from './alta-de-cuenta';

/** La ventana de alta: cuenta, primera empresa, propietario y módulos, en un solo paso. */
export function usarAltaDeCuenta(alGuardar: () => Promise<void>) {
  const sesion = usarSesion();
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const alta = ref(altaVacia());

  function abrir(): void {
    alta.value = { ...altaVacia(), abierta: true };
    errores.value = {};
  }

  /** La sesión se recarga porque soporte ve la empresa nueva entre las disponibles. */
  async function darDeAlta(): Promise<void> {
    let aviso = '';
    const guardar = async () => (aviso = avisoDelAlta(await apiPlataforma.crearCuenta(datosDelAlta(alta.value))));
    if (!(await enviar(guardar))) return;
    avisos.exito(aviso);
    alta.value.abierta = false;
    await Promise.all([alGuardar(), sesion.cargar()]);
  }

  return { alta, enviando, errores, abrir, darDeAlta };
}
