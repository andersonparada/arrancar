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

/** Falta contestar alguna de las preguntas planteadas. */
export const faltaContestar = (preguntas: PreguntaFiscal[], respuestas: RespuestasFiscales): boolean =>
  preguntas.some(({ campo }) => !respuestas[campo]);

/** Las respuestas como las espera el servidor; `null` mientras falte alguna. */
export function datosFiscalesContestados(respuestas: RespuestasFiscales): DatosFiscalesContestados | null {
  const regimen = respuestas[CAMPO_DEL_REGIMEN];
  const agente = respuestas[CAMPO_DEL_AGENTE];
  if (!regimen || !agente) return null;
  return { regimenIsr: regimen, esAgenteDeRetencionIva: agente === 'true' };
}
