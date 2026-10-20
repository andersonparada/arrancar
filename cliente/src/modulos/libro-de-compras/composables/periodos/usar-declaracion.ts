import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiPeriodos, type ResultadoDeCambioDePeriodo } from '../../servicios/periodos.api';
import { VENTANA_DE_DECLARACION as textos } from '../../textos-de-periodos';
import { cuerpoDeDeclaracion, declaracionVacia } from './datos-de-periodos';

/**
 * La ventana de declarar un período: lo que se escribe, el envío y los errores por campo. `mes` es `AAAA-MM`;
 * `alTerminar` vuelve a pedir el período. Los avisos del servidor se muestran uno por uno.
 */
export function usarDeclaracion(mes: () => string, alTerminar: () => Promise<void>) {
  const { enviando, errores, enviar } = usarFormulario();
  const abierta = ref(false);
  const edicion = ref(declaracionVacia());

  function abrir(): void {
    edicion.value = declaracionVacia();
    errores.value = {};
    abierta.value = true;
  }

  async function guardar(esRectificacion: boolean): Promise<void> {
    const resultado = ref<ResultadoDeCambioDePeriodo | null>(null);
    const bien = await enviar(async () => {
      resultado.value = await apiPeriodos.declarar(mes(), cuerpoDeDeclaracion(edicion.value));
    });
    if (!bien) return;
    abierta.value = false;
    const avisos = usarAvisos();
    avisos.exito(esRectificacion ? textos.exitoRectificacion : textos.exito);
    resultado.value?.avisos.forEach((aviso) => avisos.info(aviso));
    await alTerminar();
  }

  return { abierta, edicion, enviando, errores, abrir, guardar };
}
