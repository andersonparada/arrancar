import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiCuentasPorPagar } from '../servicios/cuentas-por-pagar.api';
import { edicionDeAplicacion, edicionDeAplicacionVacia } from './aplicacion-de-nota';
import { fechaDeHoy } from './dinero';
import type { FichaActual } from './usar-acciones-con-ventana';

/** Abre la ventana de aplicar: trae los cargos del proveedor con la propuesta del servidor y los pone en la edición. */
export function usarVentanaDeAplicacion(ficha: FichaActual, errores: Ref<Record<string, string>>) {
  const edicion = ref(edicionDeAplicacionVacia());
  const abriendo = ref(false);

  async function abrir(): Promise<void> {
    if (!ficha.value || abriendo.value) return;
    abriendo.value = true;
    try {
      edicion.value = edicionDeAplicacion(await apiCuentasPorPagar.cargosParaAplicar(ficha.value.id), fechaDeHoy());
      errores.value = {};
    } catch {
      usarAvisos().error('No se pudieron leer los documentos del proveedor. Intente de nuevo.');
    } finally {
      abriendo.value = false;
    }
  }
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };

  return { edicion, abriendo, abrir, cerrar };
}
