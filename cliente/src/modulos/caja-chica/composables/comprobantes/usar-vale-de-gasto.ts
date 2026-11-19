import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiComprobantes } from '../../servicios/comprobantes.api';
import { catalogosDeCajaChica, type ConceptoParaElVale } from '../../servicios/catalogos.api';
import { usarVentanaDeAccion } from '../usar-ventana-de-accion';
import { cuerpoDeVale, edicionDeVale } from './edicion-de-vale';

/** El vale de gasto de un fondo: gasto menor sin factura. Trae los conceptos de gasto la primera vez que se abre. */
export function usarValeDeGasto(fondoId: () => string, alTerminar: () => Promise<unknown>) {
  const avisos = usarAvisos();
  const conceptos = ref<ConceptoParaElVale[]>([]);
  let traidos = false;

  async function traerConceptos(): Promise<void> {
    if (traidos) return;
    try {
      conceptos.value = await catalogosDeCajaChica.conceptosDeGasto();
      traidos = true;
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar los conceptos de gasto.');
    }
  }

  const ventana = usarVentanaDeAccion({
    inicial: edicionDeVale,
    alAbrir: traerConceptos,
    enviar: (edicion) => apiComprobantes.registrarVale(fondoId(), cuerpoDeVale(edicion)),
    exito: 'Vale de gasto registrado.',
    alTerminar: async (resultado) => {
      resultado.avisos.forEach((aviso) => avisos.info(aviso));
      await alTerminar();
    },
  });
  return { ...ventana, conceptos };
}
