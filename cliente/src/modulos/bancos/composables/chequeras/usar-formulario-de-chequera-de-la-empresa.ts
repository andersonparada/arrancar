import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiChequeras } from '../../servicios/chequeras.api';
import { datosDeChequera, edicionDeChequera, type EdicionDeChequera } from './edicion-de-chequera';

/** La ventana de crear una chequera desde la pantalla de administración: primero se elige la cuenta. */
export function usarFormularioDeChequeraDeLaEmpresa(alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeChequera>({ ...edicionDeChequera(), abierta: false });

  function nueva(): void {
    edicion.value = edicionDeChequera();
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const { cuentaBancariaId } = edicion.value;
    if (!cuentaBancariaId) return;
    if (!(await enviar(() => apiChequeras.crear(cuentaBancariaId, datosDeChequera(edicion.value))))) return;
    avisos.exito('Chequera creada.');
    edicion.value.abierta = false;
    await alGuardar();
  }

  return { edicion, enviando, errores, nueva, guardar };
}
