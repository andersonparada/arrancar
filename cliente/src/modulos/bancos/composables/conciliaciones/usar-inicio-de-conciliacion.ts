import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import {
  apiConciliaciones,
  type ConciliacionResumen,
  type DatosDeInicioDeConciliacion,
} from '../../servicios/conciliaciones.api';
import { periodoPropuesto } from './periodo-propuesto';

const solicitudDeInicio = (
  cuentaBancariaId: string,
  periodo: { anio: number; mes: number },
  saldoSegunBanco: string,
): DatosDeInicioDeConciliacion => ({ cuentaBancariaId, ...periodo, saldoSegunBanco });

/** La ventana "Nueva conciliación": propone el periodo (mes siguiente a la última) y pide el saldo del banco. */
export function usarInicioDeConciliacion(cuentaBancariaId: () => string | null, alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const abierta = ref(false);
  const anio = ref(0);
  const mes = ref(0);
  const saldoSegunBanco = ref('');

  function abrir(ultima: ConciliacionResumen | null): void {
    ({ anio: anio.value, mes: mes.value } = periodoPropuesto(ultima, new Date()));
    saldoSegunBanco.value = '';
    errores.value = {};
    abierta.value = true;
  }

  const cerrar = (): void => void (abierta.value = false);

  async function confirmar(): Promise<void> {
    const cuenta = cuentaBancariaId();
    const solicitud = solicitudDeInicio(cuenta ?? '', { anio: anio.value, mes: mes.value }, saldoSegunBanco.value);
    if (!cuenta || !(await enviar(() => apiConciliaciones.iniciar(solicitud)))) return;
    avisos.exito('Conciliación iniciada.');
    cerrar();
    await alGuardar();
  }

  return { abierta, anio, mes, saldoSegunBanco, enviando, errores, abrir, cerrar, confirmar };
}
