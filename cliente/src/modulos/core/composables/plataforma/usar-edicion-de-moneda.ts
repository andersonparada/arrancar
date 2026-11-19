import { ref } from 'vue';
import { usarAvisos } from '../../almacenes/avisos';
import { apiMonedas, type Moneda } from '../../servicios/monedas.api';
import { usarFormulario } from '../usar-formulario';
import {
  cambiosDeLaMoneda,
  confirmacionDeGuardar,
  erroresDelFormulario,
  formularioDeMoneda,
  formularioDeMonedaVacio,
  type FormularioDeMoneda,
} from './edicion-de-moneda';
import { usarMuestraDelBanguat } from './usar-muestra-del-banguat';

/** Desactivar o quitar el código piden confirmar con el resumen de lo que va a pasar; lo demás se guarda directo. */
async function aceptaLosCambios(avisos: ReturnType<typeof usarAvisos>, form: FormularioDeMoneda) {
  const confirmacion = confirmacionDeGuardar(form, cambiosDeLaMoneda(form));
  return !confirmacion || avisos.confirmar({ ...confirmacion, peligroso: true });
}

/**
 * La ventana de edición de una moneda: abrirla, validar, pedir confirmación si se desactiva o se quita el código, y
 * guardar solo lo que cambió. `alGuardar` recarga la lista.
 */
export function usarEdicionDeMoneda(alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const edicion = ref(formularioDeMonedaVacio());
  const { enviando, errores, enviar } = usarFormulario();
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };

  async function guardar(): Promise<void> {
    const { moneda } = edicion.value;
    errores.value = erroresDelFormulario(edicion.value);
    if (!moneda || Object.keys(errores.value).length > 0) return;
    const cambios = cambiosDeLaMoneda(edicion.value);
    if (Object.keys(cambios).length === 0) return cerrar();
    if (!(await aceptaLosCambios(avisos, edicion.value))) return;
    if (!(await enviar(() => apiMonedas.editar(moneda.codigo, cambios)))) return;
    avisos.exito(`${moneda.codigo} guardada.`);
    cerrar();
    await alGuardar();
  }

  const abrir = (moneda: Moneda): void => {
    errores.value = {};
    edicion.value = formularioDeMoneda(moneda);
  };
  return { edicion, enviando, errores, muestra: usarMuestraDelBanguat(edicion), abrir, cerrar, guardar };
}
