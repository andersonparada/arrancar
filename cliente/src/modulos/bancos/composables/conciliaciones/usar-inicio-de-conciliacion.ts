import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiConciliaciones, type Periodo } from '../../servicios/conciliaciones.api';

/** La ventana "Nueva conciliación": propone el periodo que da el servidor; sin saldo que escribir. */
export function usarInicioDeConciliacion(cuentaBancariaId: () => string | null, alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const abierta = ref(false);
  const anio = ref(0);
  const mes = ref(0);

  function abrir(propuesto: Periodo): void {
    ({ anio: anio.value, mes: mes.value } = propuesto);
    errores.value = {};
    abierta.value = true;
  }

  const cerrar = (): void => void (abierta.value = false);

  async function confirmar(): Promise<void> {
    const cuentaBancaria = cuentaBancariaId();
    if (!cuentaBancaria) return;
    const solicitud = { cuentaBancariaId: cuentaBancaria, anio: anio.value, mes: mes.value };
    if (!(await enviar(() => apiConciliaciones.iniciar(solicitud)))) return;
    avisos.exito('Conciliación iniciada.');
    cerrar();
    await alGuardar();
  }

  return { abierta, anio, mes, enviando, errores, abrir, cerrar, confirmar };
}
