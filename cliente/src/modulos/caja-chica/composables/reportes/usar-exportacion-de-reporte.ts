import { usarIntercambio } from '@/modulos/core/composables/intercambio/usar-intercambio';
import type { Consulta } from '@/modulos/core/servicios/cliente-http';
import type { IntercambioDeDatos } from '@/modulos/core/servicios/intercambio';

/**
 * Baja el reporte a Excel con los mismos filtros de la pantalla; con un corte que no sirve no pide nada, y mientras
 * baja uno no pide otro (el doble clic no baja dos archivos).
 */
export function usarExportacionDeReporte(
  intercambio: IntercambioDeDatos,
  consulta: () => Consulta,
  corteInvalido: () => boolean,
) {
  const { exportar } = usarIntercambio(intercambio, async () => {});
  let exportando = false;
  return async (): Promise<void> => {
    if (exportando || corteInvalido()) return;
    exportando = true;
    try {
      await exportar(consulta());
    } finally {
      exportando = false;
    }
  };
}
