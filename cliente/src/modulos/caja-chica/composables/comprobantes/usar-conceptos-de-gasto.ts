import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { catalogosDeCajaChica, type ConceptoParaElVale } from '../../servicios/catalogos.api';

/** Los conceptos de gasto que se eligen en un vale de gasto: se traen la primera vez que se piden. */
export function usarConceptosDeGasto() {
  const avisos = usarAvisos();
  const conceptos = ref<ConceptoParaElVale[]>([]);
  let traidos = false;

  async function traer(): Promise<void> {
    if (traidos) return;
    try {
      conceptos.value = (await catalogosDeCajaChica.obtener()).conceptosDeGasto;
      traidos = true;
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudieron cargar los conceptos de gasto.');
    }
  }

  return { conceptos, traer };
}
