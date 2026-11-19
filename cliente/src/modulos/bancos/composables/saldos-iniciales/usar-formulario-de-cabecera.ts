import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';
import type { CabeceraGuardada, SaldoInicialDeCuenta } from '../../servicios/tipos-de-saldos-iniciales';
import {
  datosDeCabecera,
  edicionDeSaldoInicial,
  edicionNuevaDeSaldoInicial,
  erroresDeCabecera,
  type EdicionDeSaldoInicial,
} from './edicion-de-saldo-inicial';

/** La ventana del saldo según el estado de cuenta: registrarlo, corregirlo o separar el saldo «de antes» en partidas. */
export function usarFormularioDeCabecera(cuentaBancariaId: string, alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeSaldoInicial>({ ...edicionNuevaDeSaldoInicial(), abierta: false });

  function abrir(saldo: SaldoInicialDeCuenta | null): void {
    edicion.value = saldo && saldo.forma !== 'sin_saldo' ? edicionDeSaldoInicial(saldo) : edicionNuevaDeSaldoInicial();
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    errores.value = erroresDeCabecera(edicion.value);
    if (Object.keys(errores.value).length) return;
    const resultado = ref<CabeceraGuardada | null>(null);
    const separando = edicion.value.separando;
    const guardado = await enviar(async () => {
      resultado.value = await apiSaldosIniciales.guardar(cuentaBancariaId, datosDeCabecera(edicion.value));
    });
    if (!guardado) return;
    avisos.exito(separando ? 'Saldo separado en partidas.' : 'Saldo inicial guardado.');
    resultado.value?.avisos.forEach((aviso) => avisos.info(aviso.mensaje));
    edicion.value.abierta = false;
    await alGuardar();
  }

  const cerrar = (): void => void (edicion.value.abierta = false);

  return { edicion, enviando, errores, abrir, guardar, cerrar };
}
