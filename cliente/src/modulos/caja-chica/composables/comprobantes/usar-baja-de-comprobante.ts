import { ref } from 'vue';
import { apiComprobantes } from '../../servicios/comprobantes.api';
import type { Comprobante } from '../../servicios/tipos-de-comprobantes';
import { edicionDeMotivo, faltaElMotivo } from '../edicion-de-motivo';
import { usarVentanaDeAccion } from '../usar-ventana-de-accion';
import { tituloDeComprobante } from './detalles-de-comprobante';

export type BajaDeComprobante = 'devolver' | 'anular';

/** Lo que se le dice al usuario antes de pedirle el motivo: qué pasa con el comprobante y con el dinero del fondo. */
export function resumenDeLaBaja(comprobante: Comprobante, baja: BajaDeComprobante): string {
  const titulo = tituloDeComprobante(comprobante);
  return baja === 'devolver'
    ? `${titulo} sale del fondo y vuelve a la bandeja: deja de contar como pendiente de reponer y podrá asignarse a otro fondo.`
    : `${titulo} se anula: deja de contar como gasto del fondo. Esto no se puede deshacer.`;
}

/** Devolver un documento a la bandeja o anular un vale de gasto: las dos piden el motivo, que queda en la auditoría. */
export function usarBajaDeComprobante(alTerminar: () => Promise<unknown>) {
  const objetivo = ref<{ comprobante: Comprobante; baja: BajaDeComprobante } | null>(null);

  const ventana = usarVentanaDeAccion({
    inicial: edicionDeMotivo,
    validar: faltaElMotivo,
    enviar: ({ motivo }) => {
      const actual = objetivo.value;
      if (!actual) return Promise.reject(new Error('No hay un comprobante elegido.'));
      const { comprobante, baja } = actual;
      return baja === 'devolver'
        ? apiComprobantes.devolver(comprobante.id, motivo.trim())
        : apiComprobantes.anular(comprobante.id, motivo.trim());
    },
    exito: () => (objetivo.value?.baja === 'devolver' ? 'Documento devuelto a la bandeja.' : 'Vale de gasto anulado.'),
    alTerminar,
  });

  function pedir(comprobante: Comprobante, baja: BajaDeComprobante): void {
    objetivo.value = { comprobante, baja };
    void ventana.abrir();
  }

  return { ...ventana, objetivo, pedir };
}
