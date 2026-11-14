import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCuentasPorPagar } from '../servicios/cuentas-por-pagar.api';
import { errorDelMotivo } from './reglas-de-acciones';

/** Lo que se ve en una ventana que pide un motivo para deshacer algo: qué es (`id`), qué pasará (`resumen`) y el motivo. */
export interface EdicionConMotivo {
  abierta: boolean;
  id: string;
  resumen: string;
  motivo: string;
}

const vacia = (): EdicionConMotivo => ({ abierta: false, id: '', resumen: '', motivo: '' });

/** El estado de una ventana de motivo: se abre con el registro y lo que pasará, y se cierra sin perder el formulario. */
function usarVentanaDeMotivo() {
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref(vacia());
  const abrir = (id: string, resumen: string): void => {
    edicion.value = { abierta: true, id, resumen, motivo: '' };
    errores.value = {};
  };
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };
  return { edicion, enviando, errores, enviar, abrir, cerrar };
}

/** Una acción que se hace sobre un registro por su id con un motivo: quitar una aplicación, anular un ajuste. */
function usarAccionConMotivo(
  accion: (id: string, motivo: string) => Promise<unknown>,
  exito: string,
  alTerminar: () => Promise<void>,
) {
  const { edicion, enviando, errores, enviar, abrir, cerrar } = usarVentanaDeMotivo();

  async function confirmar(): Promise<void> {
    const error = errorDelMotivo(edicion.value.motivo);
    if (error) {
      errores.value = { motivo: error };
      return;
    }
    const { id, motivo } = edicion.value;
    if (!(await enviar(() => accion(id, motivo.trim())))) return;
    cerrar();
    usarAvisos().exito(exito);
    await alTerminar();
  }

  return { edicion, enviando, errores, abrir, cerrar, confirmar };
}

export const usarQuitarAplicacion = (alTerminar: () => Promise<void>) =>
  usarAccionConMotivo(
    (id, motivo) => apiCuentasPorPagar.quitarAplicacion(id, motivo),
    'Aplicación quitada: el monto volvió al saldo a favor de la nota.',
    alTerminar,
  );

export const usarAnularAjuste = (alTerminar: () => Promise<void>) =>
  usarAccionConMotivo(
    (id, motivo) => apiCuentasPorPagar.anularAjuste(id, motivo),
    'Ajuste anulado: el monto volvió al saldo a favor de la nota.',
    alTerminar,
  );
