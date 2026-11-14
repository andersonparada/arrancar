import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiCuentasPorPagar } from '../servicios/cuentas-por-pagar.api';
import { datosDeAjuste, edicionDeAjuste, edicionDeAjusteVacia, erroresDeAjuste } from './ajuste-de-saldo';
import { fechaDeHoy } from './dinero';
import type { FichaActual } from './usar-acciones-con-ventana';

/** Ajustar (dar de baja) el saldo libre de la nota, con causa y motivo. */
export function usarAjusteDeNota(ficha: FichaActual, alTerminar: () => Promise<void>) {
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref(edicionDeAjusteVacia());

  const abrir = (): void => {
    if (!ficha.value) return;
    edicion.value = edicionDeAjuste(ficha.value.saldo, fechaDeHoy());
    errores.value = {};
  };
  const cerrar = (): void => {
    edicion.value.abierta = false;
  };

  async function ajustar(): Promise<void> {
    if (!ficha.value) return;
    errores.value = erroresDeAjuste(edicion.value, ficha.value, fechaDeHoy());
    if (Object.keys(errores.value).length > 0) return;
    const { id } = ficha.value;
    if (!(await enviar(() => apiCuentasPorPagar.ajustar(id, datosDeAjuste(edicion.value))))) return;
    cerrar();
    usarAvisos().exito('Ajuste registrado. Queda en la auditoría.');
    await alTerminar();
  }

  return { edicion, enviando, errores, abrir, cerrar, ajustar };
}
