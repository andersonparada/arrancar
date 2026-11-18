import { computed, reactive, type Ref } from 'vue';
import type { CargaInicial } from '../servicios/datos-de-empresa.api';
import { usarBalanceDeApertura } from './usar-balance-de-apertura';
import { usarCierreDeCarga } from './usar-cierre-de-carga';
import { usarCierresGuardados } from './usar-cierres-guardados';
import { usarReaperturaDeCarga } from './usar-reapertura-de-carga';

/** Todo lo de la carga inicial de la empresa que se edita, junto para pasarlo como un solo dato a la ventana. */
export function usarCargaInicial(empresaId: () => string | null, carga: Ref<CargaInicial | null>) {
  const cierre = usarCierreDeCarga(empresaId, carga);
  const reapertura = usarReaperturaDeCarga(empresaId, carga);
  const guardados = usarCierresGuardados(empresaId);
  const balance = usarBalanceDeApertura(empresaId, carga);
  /** Con alguna de estas ventanas encima, Escape debe cerrar solo esa y no la de la empresa. */
  const hayVentanaEncima = computed(
    () =>
      cierre.abierta.value ||
      reapertura.abierta.value ||
      guardados.historialAbierto.value ||
      guardados.cierre.value !== null ||
      balance.visorAbierto.value,
  );
  return reactive({ carga, cierre, reapertura, guardados, balance, hayVentanaEncima });
}

export type CargaInicialEnEdicion = ReturnType<typeof usarCargaInicial>;
