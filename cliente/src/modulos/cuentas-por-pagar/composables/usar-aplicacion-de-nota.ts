import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCuentasPorPagar } from '../servicios/cuentas-por-pagar.api';
import { datosDeAplicacion, erroresDeAplicacion, erroresDelServidor } from './aplicacion-de-nota';
import { fechaDeHoy } from './dinero';
import type { FichaActual } from './usar-acciones-con-ventana';
import { usarVentanaDeAplicacion } from './usar-ventana-de-aplicacion';

/** Aplicar el saldo libre de la nota a varios cargos del proveedor, en una ventana con la propuesta del servidor. */
export function usarAplicacionDeNota(ficha: FichaActual, alTerminar: () => Promise<void>) {
  const { enviando, errores, enviar } = usarFormulario();
  const ventana = usarVentanaDeAplicacion(ficha, errores);

  async function aplicar(): Promise<void> {
    const invalidos = erroresDeAplicacion(ventana.edicion.value, fechaDeHoy());
    if (Object.keys(invalidos).length > 0 || !ficha.value) {
      errores.value = invalidos;
      return;
    }
    const datos = datosDeAplicacion(ventana.edicion.value);
    const { id } = ficha.value;
    if (!(await enviar(() => apiCuentasPorPagar.aplicar(id, datos)))) {
      errores.value = erroresDelServidor(errores.value, datos);
      return;
    }
    ventana.cerrar();
    usarAvisos().exito('Saldo a favor aplicado.');
    await alTerminar();
  }

  return { ...ventana, enviando, errores, aplicar };
}
