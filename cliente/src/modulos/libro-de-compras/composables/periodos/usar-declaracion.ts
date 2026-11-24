import { ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import {
  apiPeriodos,
  type FormularioDeDeclaracion,
  type ResultadoDeCambioDePeriodo,
} from '../../servicios/periodos.api';
import { VENTANA_DE_DECLARACION as textos } from '../../textos-de-periodos';
import { cuerpoDeDeclaracion, declaracionVacia } from './datos-de-periodos';

function avisarResultado(esRectificacion: boolean, resultado?: ResultadoDeCambioDePeriodo): void {
  const avisos = usarAvisos();
  avisos.exito(esRectificacion ? textos.exitoRectificacion : textos.exito);
  resultado?.avisos.forEach((aviso) => avisos.info(aviso));
}

/**
 * La ventana de declarar un período: lo que se escribe, el envío y los errores por campo. `mes` es `AAAA-MM`;
 * `alTerminar` vuelve a pedir el período. Los avisos del servidor se muestran uno por uno.
 */
export function usarDeclaracion(
  mes: () => string,
  alTerminar: () => Promise<void>,
  formularioVigente: () => FormularioDeDeclaracion | null = () => null,
) {
  const { enviando, errores, enviar } = usarFormulario();
  const abierta = ref(false);
  const edicion = ref(declaracionVacia());

  function abrir(): void {
    edicion.value = declaracionVacia();
    errores.value = {};
    abierta.value = true;
  }

  async function guardar(esRectificacion: boolean): Promise<void> {
    let resultado: ResultadoDeCambioDePeriodo | undefined;
    const cuerpo = cuerpoDeDeclaracion(edicion.value, formularioVigente());
    const bien = await enviar(async () => void (resultado = await apiPeriodos.declarar(mes(), cuerpo)));
    if (!bien) return;
    abierta.value = false;
    avisarResultado(esRectificacion, resultado);
    await alTerminar();
  }

  return { abierta, edicion, enviando, errores, abrir, guardar };
}
