import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiDteRecibidos } from '../../servicios/dte-recibidos.api';

/** Lo que la ventana de descarte tiene escrito y a qué filas se aplica. */
function usarVentanaDeDescarte(limpiarErrores: () => void) {
  const abierta = ref(false);
  const motivo = ref('');
  const ids = ref<string[]>([]);

  function abrir(aDescartar: string[]): void {
    ids.value = aDescartar;
    motivo.value = '';
    limpiarErrores();
    abierta.value = true;
  }

  return { abierta, motivo, ids, abrir, cerrar: () => (abierta.value = false) };
}

/** Descartar con motivo y restaurar; sirve para la bandeja y para la conciliación. `alTerminar` recarga la lista. */
export function usarDescarteDeFilas(alTerminar: () => unknown) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const ventana = usarVentanaDeDescarte(() => (errores.value = {}));

  async function descartar(): Promise<void> {
    const motivo = ventana.motivo.value.trim();
    if (!motivo) {
      errores.value = { motivo: 'Escriba por qué no se registra; queda en el historial.' };
      return;
    }
    const cantidad = ventana.ids.value.length;
    if (!(await enviar(() => apiDteRecibidos.descartar(ventana.ids.value, motivo)))) return;
    avisos.exito(cantidad === 1 ? 'Se descartó el DTE.' : `Se descartaron ${cantidad} DTE.`);
    ventana.cerrar();
    await alTerminar();
  }

  async function restaurar(id: string): Promise<void> {
    if (!(await enviar(() => apiDteRecibidos.restaurar(id)))) return;
    avisos.exito('Se restauró el DTE.');
    await alTerminar();
  }

  return { ...ventana, enviando, errores, descartar, restaurar };
}
