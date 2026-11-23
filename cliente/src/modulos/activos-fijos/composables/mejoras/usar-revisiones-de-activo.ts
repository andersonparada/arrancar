import { ref, type Ref } from 'vue';
import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import type { ActivoFicha } from '../../servicios/activos.api';
import { apiMejoras } from '../../servicios/mejoras.api';
import {
  datosDeEstimacion,
  datosDeMatricula,
  edicionDeEstimacionNueva,
  edicionDeMatriculaNueva,
  erroresDeEstimacion,
  erroresDeMatricula,
} from './edicion-de-revision';

type Ventana = 'estimacion' | 'matricula' | null;

/** Lo que comparten las dos ventanas: el activo, el formulario, cuál está abierta y qué hacer al terminar. */
interface Contexto {
  activo: () => ActivoFicha | null;
  formulario: ReturnType<typeof usarFormulario>;
  ventana: Ref<Ventana>;
  terminar: (aviso: string) => Promise<void>;
}

function usarEstimacion({ activo, formulario, ventana, terminar }: Contexto) {
  const edicion = ref(edicionDeEstimacionNueva({ valorResidual: null }));

  function abrir(): void {
    const actual = activo();
    if (!actual) return;
    edicion.value = edicionDeEstimacionNueva(actual);
    formulario.errores.value = {};
    ventana.value = 'estimacion';
  }

  async function guardar(): Promise<void> {
    const actual = activo();
    formulario.errores.value = erroresDeEstimacion(edicion.value);
    if (!actual || Object.keys(formulario.errores.value).length > 0) return;
    const datos = datosDeEstimacion(edicion.value);
    if (await formulario.enviar(() => apiMejoras.revisarEstimacion(actual.id, datos)))
      await terminar('Estimación revisada. Rige desde el primer mes abierto.');
  }

  return { estimacion: edicion, abrirEstimacion: abrir, guardarEstimacion: guardar };
}

function usarMatricula({ activo, formulario, ventana, terminar }: Contexto) {
  const vacia = { valorDeMatricula: null, valorCatastral: null, valoresDelInmuebleCompleto: false };
  const edicion = ref(edicionDeMatriculaNueva(vacia));

  function abrir(): void {
    const actual = activo();
    if (!actual) return;
    edicion.value = edicionDeMatriculaNueva(actual);
    formulario.errores.value = {};
    ventana.value = 'matricula';
  }

  async function guardar(): Promise<void> {
    const actual = activo();
    formulario.errores.value = erroresDeMatricula(edicion.value);
    if (!actual || Object.keys(formulario.errores.value).length > 0) return;
    const datos = datosDeMatricula(edicion.value);
    if (await formulario.enviar(() => apiMejoras.cambiarValorFiscal(actual.id, datos)))
      await terminar('Matrícula o catastro cambiados. Rigen desde el primer mes abierto.');
  }

  return { matricula: edicion, abrirMatricula: abrir, guardarMatricula: guardar };
}

/**
 * «Revisar estimación» y «Cambiar matrícula o catastro»: dos ventanas que cambian la depreciación hacia adelante.
 * `alCambiar` refresca la ficha.
 */
export function usarRevisionesDeActivo(activo: () => ActivoFicha | null, alCambiar: () => Promise<void>) {
  const avisos = usarAvisos();
  const formulario = usarFormulario();
  const ventana = ref<Ventana>(null);
  const terminar = async (aviso: string): Promise<void> => {
    ventana.value = null;
    avisos.exito(aviso);
    await alCambiar();
  };
  const contexto = { activo, formulario, ventana, terminar };
  return {
    ...usarEstimacion(contexto),
    ...usarMatricula(contexto),
    ventana,
    enviando: formulario.enviando,
    errores: formulario.errores,
    cerrar: () => (ventana.value = null),
  };
}
