import { computed } from 'vue';
import { usarSesion } from '@/modulos/core/almacenes/sesion';
import { formatearCantidad, formatearTexto } from '@/modulos/core/utilidades/formato';
import { decimalesDe } from './edicion-de-superficie';
import {
  ABREVIATURAS_DE_UNIDAD,
  ajustesDeSuperficie,
  convertirParaMostrar,
  type SuperficieConvertida,
} from './unidades-de-superficie';

/** Cómo se escribe una superficie ya convertida: «1.4312 mz», con los decimales de su unidad. */
export const textoDeSuperficie = ({ cifra, unidad }: SuperficieConvertida): string =>
  formatearCantidad(cifra, ABREVIATURAS_DE_UNIDAD[unidad], decimalesDe(unidad));

/** Los factores y la unidad de la empresa (llegan con la sesión) y cómo mostrar con ellos una superficie en m². */
export function usarAjustesDeSuperficie() {
  const sesion = usarSesion();
  const ajustes = computed(() => ajustesDeSuperficie(sesion.config));

  /** Los m² del servidor en la unidad de la empresa; una raya si la parcela no tiene medición. */
  function mostrar(metrosCuadrados: string | null): string {
    const convertida = convertirParaMostrar(metrosCuadrados, ajustes.value.unidadParaMostrar, ajustes.value);
    return convertida ? textoDeSuperficie(convertida) : formatearTexto(null);
  }

  return { ajustes, mostrar };
}
