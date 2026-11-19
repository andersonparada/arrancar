import { computed, reactive, ref, watch } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { guardarArchivo } from '@/modulos/core/utilidades/archivos';
import { apiChequeras, type Chequera } from '../../servicios/chequeras.api';
import {
  apiCorrelativosDeCheques,
  type EstadoDelNumero,
  type ReporteDeCorrelativosDeCheques,
} from '../../servicios/correlativos-de-cheques.api';
import { usarReferenciasDeCuenta } from '../cuentas-bancarias/referencias-de-cuenta';
import { opcionesDeChequera } from './resumen-de-correlativos-de-cheques';

/** Lo que se elige: la cuenta, su chequera y, opcionalmente, un estado para el detalle. */
export interface FiltrosDeCorrelativosDeCheques {
  cuentaBancariaId: string | null;
  chequeraId: string | null;
  estado: EstadoDelNumero | null;
}

const mensajeDe = (error: unknown, siNoHay: string): string => (error instanceof Error ? error.message : siNoHay);

/** Las chequeras de la cuenta elegida; al cambiar de cuenta se vacía la chequera (era de la otra). */
function usarChequerasDeLaCuenta(filtros: FiltrosDeCorrelativosDeCheques) {
  const avisos = usarAvisos();
  const chequeras = ref<Chequera[]>([]);
  watch(
    () => filtros.cuentaBancariaId,
    async (cuentaId) => {
      filtros.chequeraId = null;
      chequeras.value = [];
      if (!cuentaId) return;
      try {
        chequeras.value = await apiChequeras.listarDeLaCuenta(cuentaId);
        if (chequeras.value.length === 1) filtros.chequeraId = chequeras.value[0]!.id;
      } catch (error) {
        avisos.error(mensajeDe(error, 'No se pudieron cargar las chequeras.'));
      }
    },
  );
  return computed(() => opcionesDeChequera(chequeras.value));
}

/** El reporte de la chequera elegida: se recarga al cambiar la chequera o el estado. */
function usarCargaDelReporte(filtros: FiltrosDeCorrelativosDeCheques) {
  const avisos = usarAvisos();
  const reporte = ref<ReporteDeCorrelativosDeCheques | null>(null);
  const cargando = ref(false);

  async function cargar(): Promise<void> {
    reporte.value = null;
    if (!filtros.chequeraId) return;
    cargando.value = true;
    try {
      reporte.value = await apiCorrelativosDeCheques.reporte(filtros.chequeraId, filtros.estado ?? undefined);
    } catch (error) {
      avisos.error(mensajeDe(error, 'No se pudo cargar el reporte de correlativos.'));
    } finally {
      cargando.value = false;
    }
  }
  watch(() => [filtros.chequeraId, filtros.estado], cargar);
  return { reporte, cargando };
}

/** Exportar a Excel lo que se ve (la misma chequera y el mismo estado). */
function usarExportacion(filtros: FiltrosDeCorrelativosDeCheques) {
  const avisos = usarAvisos();
  return async (): Promise<void> => {
    if (!filtros.chequeraId) return;
    try {
      const consulta = filtros.estado ? { estado: filtros.estado } : undefined;
      guardarArchivo(await apiCorrelativosDeCheques.intercambioDe(filtros.chequeraId).exportar(consulta));
    } catch (error) {
      avisos.error(mensajeDe(error, 'No se pudo descargar el archivo.'));
    }
  };
}

/**
 * El reporte de correlativos de una chequera: elegir cuenta y chequera (si la cuenta tiene una sola, se elige sola), ver
 * el resumen y el detalle, filtrar por estado, imprimir y exportar.
 */
export function usarReporteDeCorrelativosDeCheques() {
  const filtros = reactive<FiltrosDeCorrelativosDeCheques>({ cuentaBancariaId: null, chequeraId: null, estado: null });
  const { filtroDeCuenta } = usarReferenciasDeCuenta();
  const opcionesDeLaChequera = usarChequerasDeLaCuenta(filtros);
  const opcionesDeCuenta = computed(() => filtroDeCuenta.value.filter((opcion) => opcion.valor !== null));
  return {
    filtros,
    opcionesDeCuenta,
    opcionesDeLaChequera,
    ...usarCargaDelReporte(filtros),
    exportar: usarExportacion(filtros),
  };
}
