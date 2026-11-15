import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { avisoDeNotasPosteriores } from '../notas-del-sistema-anterior';
import { apiSaldosIniciales, type SaldoInicial } from '../../servicios/saldos-iniciales.api';
import {
  datosDeSaldoInicial,
  edicionDe,
  edicionNueva,
  edicionVacia,
  errorDeRetencionesPorPracticar,
  type EdicionDeSaldoInicial,
} from './edicion-de-saldo-inicial';

const guardarSaldo = (edicion: EdicionDeSaldoInicial) =>
  edicion.id
    ? apiSaldosIniciales.actualizar(edicion.id, datosDeSaldoInicial(edicion))
    : apiSaldosIniciales.crear(datosDeSaldoInicial(edicion));

/** Confirma el guardado y, si hay notas que citan la factura sin aplicarse, dice dónde aplicarlas. */
function avisarDelGuardado(avisos: ReturnType<typeof usarAvisos>, esNuevo: boolean, saldo: SaldoInicial | null): void {
  avisos.exito(esNuevo ? 'Saldo inicial cargado.' : 'Saldo inicial corregido.');
  const notas = avisoDeNotasPosteriores(saldo?.notasPosteriores);
  if (notas) avisos.info(notas);
}

/** La ventana de cargar o corregir un saldo inicial: abrirla y guardarla. `alGuardar` recarga la lista y el cuadre. */
export function usarFormularioDeSaldoInicial(alGuardar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviando, errores, enviar } = usarFormulario();
  const edicion = ref<EdicionDeSaldoInicial>(edicionVacia());

  function cargar(): void {
    edicion.value = edicionNueva();
    errores.value = {};
  }

  function corregir(saldo: SaldoInicial): void {
    edicion.value = edicionDe(saldo);
    errores.value = {};
  }

  async function guardar(): Promise<void> {
    const errorLocal = errorDeRetencionesPorPracticar(edicion.value);
    if (errorLocal) return void (errores.value = { retencionesPorPracticar: errorLocal });
    const esNuevo = edicion.value.id === null;
    let guardado: SaldoInicial | null = null;
    if (!(await enviar(async () => void (guardado = await guardarSaldo(edicion.value))))) return;
    avisarDelGuardado(avisos, esNuevo, guardado);
    edicion.value.abierta = false;
    await alGuardar();
  }

  return { edicion, enviando, errores, cargar, corregir, guardar };
}
