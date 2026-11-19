import { computed, ref } from 'vue';
import { apiArqueos } from '../../servicios/arqueos.api';
import { apiReposiciones } from '../../servicios/reposiciones.api';
import { apiValesProvisionales } from '../../servicios/vales-provisionales.api';
import { edicionDeMotivo, faltaElMotivo, type EdicionDeMotivo } from '../edicion-de-motivo';
import { usarVentanaDeAccion } from '../usar-ventana-de-accion';
import { textosDeLaAnulacion, type Movimiento } from './anulacion-de-movimientos';

/** Anula el movimiento elegido con su motivo (y la fecha del inverso en Bancos, solo en reposiciones). */
function anular(movimiento: Movimiento, { motivo, fecha }: EdicionDeMotivo): Promise<unknown> {
  const texto = motivo.trim();
  switch (movimiento.tipo) {
    case 'reposicion':
      return apiReposiciones.anular(movimiento.registro.id, {
        motivo: texto,
        ...(fecha.trim() ? { fecha: fecha.trim() } : {}),
      });
    case 'arqueo':
      return apiArqueos.anular(movimiento.registro.id, texto);
    case 'vale':
      return apiValesProvisionales.anular(movimiento.registro.id, texto);
  }
}

/**
 * Anular una reposición, un arqueo o un vale provisional desde la ficha del fondo: una sola ventana que dice qué va a
 * pasar, pide el motivo (queda en la auditoría) y, si el servidor lo rechaza, muestra por qué.
 */
export function usarAnulacionDeMovimientos(alTerminar: () => Promise<unknown>) {
  const objetivo = ref<Movimiento | null>(null);
  const ventana = usarVentanaDeAccion({
    inicial: edicionDeMotivo,
    validar: faltaElMotivo,
    enviar: (edicion) =>
      objetivo.value ? anular(objetivo.value, edicion) : Promise.reject(new Error('No hay nada elegido para anular.')),
    exito: () => (objetivo.value ? textosDeLaAnulacion(objetivo.value).exito : 'Anulado.'),
    alTerminar,
  });

  return {
    ...ventana,
    objetivo,
    textos: computed(() => (objetivo.value ? textosDeLaAnulacion(objetivo.value) : null)),
    pedir(movimiento: Movimiento): void {
      objetivo.value = movimiento;
      void ventana.abrir();
    },
  };
}
