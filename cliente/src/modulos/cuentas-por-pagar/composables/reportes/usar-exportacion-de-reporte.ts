import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import type { IntercambioDeDatos } from '@/modulos/core/servicios/intercambio';

/** Baja el reporte a Excel con los mismos filtros de la pantalla; con un corte que no sirve no pide nada. */
export function usarExportacionDeReporte(
  intercambio: IntercambioDeDatos,
  consulta: () => Consulta,
  corteInvalido: () => boolean,
) {
  const { exportar } = usarIntercambio(intercambio, async () => {});
  return (): Promise<void> => (corteInvalido() ? Promise.resolve() : exportar(consulta()));
}
