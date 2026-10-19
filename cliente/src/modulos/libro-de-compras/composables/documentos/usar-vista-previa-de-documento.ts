import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { apiRegistroDeDocumentos, type RespuestaDeDocumento } from '../../servicios/registro-de-documentos.api';
import { ajustesVigentes } from './ajustes-de-retenciones';
import { cuerpoDeDocumento, type EdicionDeDocumento } from './edicion-de-documento';
import { problemaDeError, type ProblemaDelFormulario } from './errores-del-registro';

/** Cuánto espera la vista previa después de la última tecla antes de pedir el cálculo. */
export const PAUSA_DE_LA_VISTA_PREVIA = 400;

function crearEstado() {
  return {
    respuesta: ref<RespuestaDeDocumento | null>(null),
    problema: ref<ProblemaDelFormulario | null>(null),
    errores: ref<Record<string, string>>({}),
    calculando: ref(false),
    desactualizada: ref(false),
  };
}

type Estado = ReturnType<typeof crearEstado>;

function erroresDeValidacion(error: unknown): Record<string, string> {
  if (!(error instanceof ErrorApi)) return {};
  return Object.fromEntries(error.erroresCampos.map(({ campo, mensaje }) => [campo, mensaje]));
}

/** Muestra el cálculo nuevo y quita los ajustes de retenciones que ya no se proponen (el servidor los rechazaría). */
function mostrarRespuesta(estado: Estado, edicion: EdicionDeDocumento, resultado: RespuestaDeDocumento): void {
  estado.respuesta.value = resultado;
  estado.problema.value = null;
  estado.errores.value = {};
  estado.desactualizada.value = false;
  const vigentes = ajustesVigentes(edicion.ajustes, resultado.documento.retenciones);
  if (Object.keys(vigentes).length !== Object.keys(edicion.ajustes).length) edicion.ajustes = vigentes;
}

/** Explica por qué no se pudo calcular; las cifras anteriores se quedan, marcadas como desactualizadas. */
function mostrarFallo(estado: Estado, error: unknown): void {
  estado.problema.value = problemaDeError(error);
  estado.errores.value = erroresDeValidacion(error);
  estado.desactualizada.value = true;
}

/** Todavía no hay con qué calcular: no se muestra nada. */
function vaciar(estado: Estado): void {
  estado.respuesta.value = null;
  estado.problema.value = null;
  estado.errores.value = {};
  estado.calculando.value = false;
}

/** Pide el cálculo si el cuerpo cambió desde la última vez, y descarta las respuestas de peticiones viejas. */
function crearCalculador(edicion: EdicionDeDocumento, estado: Estado) {
  let numeroDePeticion = 0;
  let ultimoCuerpo = '';

  async function pedir(cuerpo: NonNullable<ReturnType<typeof cuerpoDeDocumento>>, peticion: number): Promise<void> {
    estado.calculando.value = true;
    try {
      const resultado = await apiRegistroDeDocumentos.calcular(cuerpo);
      if (peticion === numeroDePeticion) mostrarRespuesta(estado, edicion, resultado);
    } catch (error) {
      if (peticion === numeroDePeticion) mostrarFallo(estado, error);
    } finally {
      if (peticion === numeroDePeticion) estado.calculando.value = false;
    }
  }

  return async (): Promise<void> => {
    const cuerpo = cuerpoDeDocumento(edicion, estado.respuesta.value?.documento.retenciones ?? [], 'previa');
    const texto = JSON.stringify(cuerpo);
    if (texto === ultimoCuerpo) return;
    ultimoCuerpo = texto;
    const peticion = ++numeroDePeticion;
    if (cuerpo) await pedir(cuerpo, peticion);
    else vaciar(estado);
  };
}

/**
 * La vista previa en vivo: pide `POST …/documentos/calcular` cuando el usuario deja de escribir (400 ms) o sale de
 * un campo, sin repetir la misma petición. El servidor es la única fuente del cálculo: aquí solo se muestra lo que
 * responde.
 */
export function usarVistaPreviaDeDocumento(edicion: EdicionDeDocumento) {
  const estado = crearEstado();
  const calcular = crearCalculador(edicion, estado);
  let espera: ReturnType<typeof setTimeout> | undefined;

  const programar = () => {
    clearTimeout(espera);
    espera = setTimeout(calcular, PAUSA_DE_LA_VISTA_PREVIA);
  };
  watch(edicion, programar, { deep: true });
  onBeforeUnmount(() => clearTimeout(espera));

  return {
    ...estado,
    retenciones: computed(() => estado.respuesta.value?.documento.retenciones ?? []),
    /** Al salir de un campo no hace falta esperar: se calcula ya. */
    calcularYa: () => {
      clearTimeout(espera);
      return calcular();
    },
  };
}
