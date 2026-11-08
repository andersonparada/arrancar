import type {
  DatosFiscalesPorProveedor,
  DteRecibido,
  ErrorDeFila,
  ResultadoDeConfirmacion,
  ResultadoDeVistaPrevia,
} from '../../servicios/dte-recibidos.api';
import {
  datosFiscalesContestados,
  faltaContestar,
  preguntasDelError,
  type PreguntaFiscal,
  type RespuestasFiscales,
} from '../documentos/preguntas-fiscales';

export type FilaRegistrada = Extract<ResultadoDeConfirmacion, { documentoId: string }>;
export type FilaConError = { id: string; error: ErrorDeFila };

const CODIGO_DE_DATOS_FISCALES = 'faltan_datos_fiscales_del_proveedor';

const esDeError = (resultado: ResultadoDeConfirmacion): resultado is FilaConError => 'error' in resultado;

/** Separa lo que se registró de lo que quedó pendiente con su error. */
export function separarResultados(resultados: readonly ResultadoDeConfirmacion[]) {
  return {
    registradas: resultados.filter((resultado): resultado is FilaRegistrada => !esDeError(resultado)),
    conError: resultados.filter(esDeError),
  };
}

/** Qué hacer para corregir un error que el servidor ya explica; solo se agrega lo que el servidor no puede saber. */
const COMO_CORREGIR: Record<string, string> = {
  dte_sin_concepto: 'Use «Completar» para elegir el concepto y confirme de nuevo.',
  dte_sin_destino: 'Use «Completar» para elegir el destino y confirme de nuevo.',
  falta_la_fecha_de_recepcion: 'Use «Completar» y «Usar la fecha de emisión», o escriba la fecha de recepción.',
  dte_nota_sin_factura: 'Use «Completar» para elegir la factura que corrige y confirme de nuevo.',
  exento_negativo_del_dte: 'Los montos del archivo no cuadran: use «Abrir en el formulario» y revise los montos.',
  proveedor_inactivo: 'Reactívelo en Proveedores y vuelva a calcular.',
  tercero_inactivo: 'Reactívelo en Proveedores y vuelva a calcular.',
  montos_en_columnas_desconocidas: 'Use «Abrir en el formulario» para anotar esos montos.',
};

/** El error de una fila con lo que debe hacer el usuario. */
export function textoDelError({ codigo, mensaje }: ErrorDeFila): string {
  const como = COMO_CORREGIR[codigo];
  return como ? `${mensaje} ${como}` : mensaje;
}

/** Un proveedor del que el servidor necesita saber su régimen, con las filas que esperan por él. */
export interface ProveedorConPreguntas {
  nit: string;
  nombre: string;
  preguntas: PreguntaFiscal[];
  filas: string[];
}

/** Los proveedores de las filas que fallaron por falta de datos fiscales, uno por NIT. */
export function proveedoresConPreguntas(
  errores: readonly FilaConError[],
  filas: readonly DteRecibido[],
): ProveedorConPreguntas[] {
  const porId = new Map(filas.map((fila) => [fila.id, fila]));
  const porNit = new Map<string, ProveedorConPreguntas>();
  for (const { id, error } of errores) {
    const fila = porId.get(id);
    if (error.codigo !== CODIGO_DE_DATOS_FISCALES || !fila) continue;
    const actual = porNit.get(fila.nitEmisor);
    porNit.set(fila.nitEmisor, {
      nit: fila.nitEmisor,
      nombre: fila.nombreEmisor,
      preguntas: actual?.preguntas ?? preguntasDelError(error.detalles),
      filas: [...(actual?.filas ?? []), id],
    });
  }
  return [...porNit.values()];
}

/** Falta contestar alguna pregunta de algún proveedor. */
export const faltanRespuestas = (
  proveedores: readonly ProveedorConPreguntas[],
  respuestas: Readonly<Record<string, RespuestasFiscales>>,
): boolean => proveedores.some(({ nit, preguntas }) => faltaContestar(preguntas, respuestas[nit] ?? {}));

/** Lo contestado, como lo espera el servidor: por NIT del emisor. */
export function datosFiscalesContestadosPorNit(
  respuestas: Readonly<Record<string, RespuestasFiscales>>,
): DatosFiscalesPorProveedor {
  const datos: DatosFiscalesPorProveedor = {};
  for (const [nit, contestadas] of Object.entries(respuestas)) {
    const contestado = datosFiscalesContestados(contestadas);
    if (contestado) datos[nit] = contestado;
  }
  return datos;
}

/** Separa la vista previa: las filas que se pueden confirmar tal cual y las que traen un error que explicar. */
export function separarVistaPrevia(resultados: readonly ResultadoDeVistaPrevia[]) {
  const conError = resultados.filter((resultado): resultado is FilaConError => 'error' in resultado);
  const idsConError = new Set(conError.map(({ id }) => id));
  return { conError, listas: resultados.filter(({ id }) => !idsConError.has(id)) };
}
