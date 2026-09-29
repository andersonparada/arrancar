import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiMovimientos, type FilaDelReporte } from '../../servicios/movimientos.api';
import { filtroDelDetalle, type FiltrosPorConcepto } from './filtros-por-concepto';

/** El detalle desplegado de un concepto: mientras se pide, `cargando`; después, sus movimientos. */
export interface DetalleDeConcepto {
  cargando: boolean;
  filas: FilaDelReporte[];
}

/**
 * Los detalles desplegables de cada concepto. Se piden al abrirlos, con el reporte de movimientos filtrado por ese
 * concepto y el mismo rango y cuenta; al cambiar el filtro de la pantalla se cierran todos.
 */
export function usarDetallesPorConcepto(filtros: FiltrosPorConcepto) {
  const avisos = usarAvisos();
  const detalles = ref<Record<string, DetalleDeConcepto>>({});

  const cerrar = (conceptoId: string): void => {
    const { [conceptoId]: _cerrado, ...abiertos } = detalles.value;
    detalles.value = abiertos;
  };

  async function abrir(conceptoId: string): Promise<void> {
    detalles.value = { ...detalles.value, [conceptoId]: { cargando: true, filas: [] } };
    try {
      const { filas } = await apiMovimientos.reporte(filtroDelDetalle(filtros, conceptoId));
      detalles.value = { ...detalles.value, [conceptoId]: { cargando: false, filas } };
    } catch (error) {
      cerrar(conceptoId);
      avisos.error(error instanceof Error ? error.message : 'No se pudo cargar el detalle del concepto.');
    }
  }

  const alternar = (conceptoId: string): Promise<void> | void =>
    detalles.value[conceptoId] ? cerrar(conceptoId) : abrir(conceptoId);
  const cerrarTodos = (): void => {
    detalles.value = {};
  };

  return { detalles, alternar, cerrarTodos };
}
