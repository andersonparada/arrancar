import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiConciliaciones, type ConciliacionResumen } from '../../servicios/conciliaciones.api';
import { periodoPropuesto } from './periodo-propuesto';

/** La ventana "Nueva conciliación": propone el periodo (mes siguiente a la última); sin saldo que escribir. */
export function usarInicioDeConciliacion(cuentaBancariaId: () => string | null, alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const abierta = ref(false);
  const anio = ref(0);
  const mes = ref(0);

  function abrir(ultima: ConciliacionResumen | null): void {
    ({ anio: anio.value, mes: mes.value } = periodoPropuesto(ultima, new Date()));
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
