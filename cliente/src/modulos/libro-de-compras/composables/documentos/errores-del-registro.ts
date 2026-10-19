import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import { lineaEnBlanco } from './edicion-de-documento';
import type { LineaEnEdicion } from './lineas-del-documento';
import { preguntasDelError, type PreguntaFiscal } from './preguntas-fiscales';

/** Un error del servidor que la pantalla explica y resuelve dentro del formulario, sin un aviso que desaparece. */
export type ProblemaDelFormulario =
  | { tipo: 'datos_fiscales'; mensaje: string; preguntas: PreguntaFiscal[] }
  | { tipo: 'regimen'; mensaje: string }
  | { tipo: 'empresa'; mensaje: string }
  | { tipo: 'repetido'; mensaje: string; documentoId: string | null }
  | { tipo: 'permiso'; mensaje: string }
  | { tipo: 'otro'; mensaje: string };

const TEXTO_SIN_PERMISO =
  'No tiene permiso para cambiar retenciones. Quite el ajuste de las retenciones, o pídale el permiso «Ajustar retenciones» al administrador.';

function documentoDelRepetido(detalles: unknown): string | null {
  const id = (detalles as { documentoId?: unknown } | null | undefined)?.documentoId;
  return typeof id === 'string' ? id : null;
}

const deLaEmpresa = (error: ErrorApi): ProblemaDelFormulario => ({ tipo: 'empresa', mensaje: error.message });

/** Cómo se explica cada código de error que el formulario sabe resolver. */
const PROBLEMAS_POR_CODIGO: Record<string, (error: ErrorApi) => ProblemaDelFormulario> = {
  faltan_datos_fiscales_del_proveedor: (error) => ({
    tipo: 'datos_fiscales',
    mensaje: error.message,
    preguntas: preguntasDelError(error.detalles),
  }),
  tipo_no_corresponde_al_proveedor: (error) => ({ tipo: 'regimen', mensaje: error.message }),
  empresa_sin_datos_fiscales: deLaEmpresa,
  empresa_sin_nit: deLaEmpresa,
  documento_repetido: (error) => ({
    tipo: 'repetido',
    mensaje: error.message,
    documentoId: documentoDelRepetido(error.detalles),
  }),
};

/**
 * Clasifica un error de calcular o registrar. Los errores de validación por campo no son un problema del formulario
 * entero (cada campo muestra el suyo): devuelve `null`.
 */
export function problemaDeError(error: unknown): ProblemaDelFormulario | null {
  if (!(error instanceof ErrorApi)) {
    return { tipo: 'otro', mensaje: error instanceof Error ? error.message : 'Ocurrió un error inesperado.' };
  }
  if (error.erroresCampos.length > 0) return null;
  const delCodigo = PROBLEMAS_POR_CODIGO[error.codigo];
  if (delCodigo) return delCodigo(error);
  if (error.estado === 403) return { tipo: 'permiso', mensaje: TEXTO_SIN_PERMISO };
  return { tipo: 'otro', mensaje: error.message };
}

/** Los errores por campo de una línea, por su clave en el formulario. */
export type ErroresDeLineas = Record<number, Record<string, string>>;

/**
 * Reparte `lineas.N.campo` entre las líneas del formulario. El servidor numera solo las líneas que se enviaron, es
 * decir, sin las filas en blanco.
 */
export function erroresDeLineas(lineas: LineaEnEdicion[], errores: Record<string, string>): ErroresDeLineas {
  const enviadas = lineas.filter((linea) => !lineaEnBlanco(linea));
  const resultado: ErroresDeLineas = {};
  for (const [campo, mensaje] of Object.entries(errores)) {
    const [raiz, indice, nombre] = campo.split('.');
    const linea = raiz === 'lineas' ? enviadas[Number(indice)] : undefined;
    if (linea && nombre) (resultado[linea.clave] ??= {})[nombre] = mensaje;
  }
  return resultado;
}

/** Los errores del encabezado: todo lo que no es de una línea ni de un ajuste. */
export const erroresDelEncabezado = (errores: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(errores).filter(([campo]) => !campo.startsWith('lineas.')));
