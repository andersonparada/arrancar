import { onMounted, ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiAnticipos, type Anticipo } from '../../servicios/anticipos.api';
import { apiGastos, type Gasto } from '../../servicios/gastos.api';

/** Trae el anticipo liquidado y sus gastos para la hoja; `imprimir` abre el diálogo de impresión del navegador. */
export function usarImpresionDeLiquidacion(id: () => string) {
  const avisos = usarAvisos();
  const anticipo = ref<Anticipo | null>(null);
  const gastos = ref<Gasto[]>([]);
  const cargando = ref(true);

  onMounted(async () => {
    try {
      [anticipo.value, gastos.value] = await Promise.all([apiAnticipos.obtener(id()), apiGastos.delAnticipo(id())]);
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo preparar la hoja de liquidación.');
    } finally {
      cargando.value = false;
    }
  });

  return { anticipo, gastos, cargando, imprimir: (): void => window.print() };
}
