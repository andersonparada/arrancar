import { computed } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import { usarCarga } from '@/modulos/core/composables/usar-carga';
import {
  apiSaldosIniciales,
  type ListaDeSaldosIniciales,
  type SaldoInicial,
} from '../../servicios/saldos-iniciales.api';
import { motivoDeCargaBloqueada } from './detalles-de-saldo';

const SIN_SALDOS: ListaDeSaldosIniciales = {
  fechaDeInicio: null,
  fechaDeCorte: null,
  cargaCerrada: false,
  totales: {
    activos: 0,
    costo: '0.00',
    depreciacionAcumuladaContable: '0.00',
    valorEnLibros: '0.00',
    costoFiscal: '0.00',
    baseFiscal: '0.00',
    depreciacionAcumuladaFiscal: '0.00',
  },
  porClase: [],
  saldos: [],
};

/** Eliminar un saldo con confirmación; `alEliminar` recarga la lista. */
function usarEliminacionDeSaldo(alEliminar: () => Promise<void>) {
  const avisos = usarAvisos();
  async function eliminar(saldo: SaldoInicial): Promise<void> {
    const confirmado = await avisos.confirmar({
      titulo: 'Eliminar saldo inicial',
      mensaje: `Se eliminará ${saldo.codigo} · ${saldo.descripcion} con su costo de saldo inicial. Quedará en la auditoría.`,
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado) return;
    try {
      await apiSaldosIniciales.eliminar(saldo.activoId);
      avisos.exito('Saldo inicial eliminado.');
      await alEliminar();
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo eliminar el saldo inicial.');
    }
  }

  return eliminar;
}

/** Los saldos iniciales: la lista con su cuadre, eliminar uno (con confirmación) y el Excel. */
export function usarSaldosIniciales() {
  const {
    datos: lista,
    cargando,
    cargar,
  } = usarCarga(() => apiSaldosIniciales.listar(), SIN_SALDOS, 'No se pudieron cargar los saldos iniciales.');
  const intercambio = usarIntercambio(apiSaldosIniciales.intercambio, cargar);
  const bloqueo = computed(() => motivoDeCargaBloqueada(lista.value, lista.value.saldos.length > 0));
  const eliminar = usarEliminacionDeSaldo(cargar);

  return { lista, cargando, bloqueo, intercambio, eliminar };
}
