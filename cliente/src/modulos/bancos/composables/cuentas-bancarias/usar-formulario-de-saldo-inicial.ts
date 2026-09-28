import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiSaldosIniciales } from '../../servicios/saldos-iniciales.api';
import type { Movimiento } from '../../servicios/movimientos.api';
import { datosDeSaldoInicial, edicionDe, type EdicionDeSaldoInicial } from './edicion-de-saldo-inicial';

const guardarSaldoInicial = (edicion: EdicionDeSaldoInicial) =>
  edicion.id
    ? apiSaldosIniciales.actualizar(edicion.id, datosDeSaldoInicial(edicion))
    : apiSaldosIniciales.crear(datosDeSaldoInicial(edicion));

/** La ventana de registrar o corregir el saldo inicial de una cuenta: abrirla y guardarla. */
export function usarFormularioDeSaldoInicial(cuentaBancariaId: string, alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeSaldoInicial>({ ...edicionDe(cuentaBancariaId), abierta: false });

  function registrar(): void {
    edicion.value = edicionDe(cuentaBancariaId);
    errores.value = {};
  }

  function corregir(vigente: Movimiento): void {
    edicion.value = edicionDe(cuentaBancariaId, vigente);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const esNuevo = edicion.value.id === null;
    if (!(await enviar(() => guardarSaldoInicial(edicion.value)))) return;
    avisos.exito(esNuevo ? 'Saldo inicial registrado.' : 'Saldo inicial actualizado.');
    edicion.value.abierta = false;
    await alGuardar();
  }

  return { edicion, enviando, errores, registrar, corregir, guardar };
}
