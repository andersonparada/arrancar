import type { DatosFiscalesContestados } from '../../servicios/registro-de-documentos.api';

/** Una opción de respuesta; el servidor manda `true` y `false` para las preguntas de sí o no. */
export interface OpcionDePregunta {
  valor: string | boolean;
  texto: string;
}

/** Una pregunta que el servidor hace cuando el proveedor no tiene datos fiscales guardados. */
export interface PreguntaFiscal {
  campo: string;
  pregunta: string;
  opciones: OpcionDePregunta[];
}

/** Lo contestado hasta ahora, por campo; los valores se guardan como texto (`'true'`, `'false'`, el régimen). */
export type RespuestasFiscales = Record<string, string>;

const CAMPO_DEL_REGIMEN = 'regimenIsr';
const CAMPO_DEL_AGENTE = 'esAgenteDeRetencionIva';
const CAMPO_DEL_REGIMEN_DE_IVA = 'regimenIva';

/** Solo el régimen general escoge su ISR y puede ser agente: con otro régimen de IVA esas preguntas no aplican. */
const dependeDelRegimenGeneral = (campo: string): boolean => campo === CAMPO_DEL_REGIMEN || campo === CAMPO_DEL_AGENTE;

const esOpcion = (valor: unknown): valor is OpcionDePregunta =>
  typeof valor === 'object' &&
  valor !== null &&
  'texto' in valor &&
  typeof valor.texto === 'string' &&
  'valor' in valor &&
  (typeof valor.valor === 'string' || typeof valor.valor === 'boolean');

function esPregunta(valor: unknown): valor is PreguntaFiscal {
  if (typeof valor !== 'object' || valor === null) return false;
  const { campo, pregunta, opciones } = valor as Record<string, unknown>;
  return (
    typeof campo === 'string' && typeof pregunta === 'string' && Array.isArray(opciones) && opciones.every(esOpcion)
  );
}

/** Las preguntas de `detalles.preguntas` del error `faltan_datos_fiscales_del_proveedor`; lo que no se entiende se omite. */
export function preguntasDelError(detalles: unknown): PreguntaFiscal[] {
  const preguntas = (detalles as { preguntas?: unknown } | null | undefined)?.preguntas;
  return Array.isArray(preguntas) ? preguntas.filter(esPregunta) : [];
}

/** Las preguntas que todavía hay que contestar: con un régimen de IVA especial ya no se pregunta ISR ni agente. */
export function preguntasVisibles(preguntas: PreguntaFiscal[], respuestas: RespuestasFiscales): PreguntaFiscal[] {
  const regimenIva = respuestas[CAMPO_DEL_REGIMEN_DE_IVA];
  const soloGeneral = !!regimenIva && regimenIva !== 'general';
  return soloGeneral ? preguntas.filter(({ campo }) => !dependeDelRegimenGeneral(campo)) : preguntas;
}

/** Falta contestar alguna de las preguntas planteadas. */
export const faltaContestar = (preguntas: PreguntaFiscal[], respuestas: RespuestasFiscales): boolean =>
  preguntasVisibles(preguntas, respuestas).some(({ campo }) => !respuestas[campo]);

/**
 * Las respuestas como las espera el servidor; `null` mientras falte alguna. Con un régimen de IVA especial el
 * servidor ignora el ISR y el agente (los fuerza a «no aplica» y falso), pero igual los pide en el cuerpo.
 */
export function datosFiscalesContestados(respuestas: RespuestasFiscales): DatosFiscalesContestados | null {
  const regimenIva = respuestas[CAMPO_DEL_REGIMEN_DE_IVA];
  const especial = !!regimenIva && regimenIva !== 'general';
  const regimen = respuestas[CAMPO_DEL_REGIMEN] ?? (especial ? 'utilidades' : undefined);
  const agente = especial ? 'false' : respuestas[CAMPO_DEL_AGENTE];
  if (!regimen || !agente) return null;
  return { ...(regimenIva ? { regimenIva } : {}), regimenIsr: regimen, esAgenteDeRetencionIva: agente === 'true' };
}
