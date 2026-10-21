import { emparejar, type Parejas } from './emparejar.js';
import { itemDeLaFila, itemDelDocumento } from './items-de-conciliacion.js';
import type {
  CoberturaDeLaSat,
  DocumentoConciliable,
  EntradaDeConciliacion,
  FilaConciliable,
  ItemDeConciliacion,
  ResultadoDeConciliacion,
} from './tipos-de-conciliacion.js';

function resultadoVacio(): ResultadoDeConciliacion {
  return {
    cuadra: [],
    conDiferencias: [],
    enLaSatYNoEnArrancar: [],
    registradoEnOtroPeriodo: [],
    enArrancarYNoEnLaSat: [],
    sinDatosDeLaSat: [],
    anuladoEnLaSatYVigenteAqui: [],
    descartado: [],
  };
}

/** Del lado de Arrancar: sin fila no hay faltante si la SAT no trajo datos de ese mes; con fila, cuadra o difiere. */
function clasificarDocumento(
  documento: DocumentoConciliable,
  fila: FilaConciliable | undefined,
  cobertura: CoberturaDeLaSat,
): [keyof ResultadoDeConciliacion, ItemDeConciliacion] {
  if (!fila) {
    const clave = cobertura.cubreElMesDe(documento.fechaEmision) ? 'enArrancarYNoEnLaSat' : 'sinDatosDeLaSat';
    return [clave, itemDelDocumento(documento, null)];
  }
  const item = itemDelDocumento(documento, fila);
  if (fila.estadoSat === 'anulado') return ['anuladoEnLaSatYVigenteAqui', item];
  return [item.diferencias.length > 0 ? 'conDiferencias' : 'cuadra', item];
}

/** Del lado de la SAT: una fila emitida en el mes que no cruzó con un documento del libro del período. */
function clasificarFila(
  fila: FilaConciliable,
  documento: DocumentoConciliable | undefined,
): [keyof ResultadoDeConciliacion, ItemDeConciliacion] | null {
  const item = itemDeLaFila(fila, documento ?? null);
  if (documento) return [fila.estadoSat === 'anulado' ? 'anuladoEnLaSatYVigenteAqui' : 'registradoEnOtroPeriodo', item];
  if (fila.estado === 'descartado') return ['descartado', item];
  return fila.estadoSat === 'anulado' ? null : ['enLaSatYNoEnArrancar', item];
}

const ordenar = (a: ItemDeConciliacion, b: ItemDeConciliacion): number =>
  a.fechaEmision.localeCompare(b.fechaEmision) ||
  (a.serie ?? '').localeCompare(b.serie ?? '') ||
  a.numero.localeCompare(b.numero, undefined, { numeric: true });

function delLibroDelPeriodo(periodo: string) {
  return (documento: DocumentoConciliable): boolean => documento.periodo === periodo && !documento.fueraDelLibro;
}

function delLado(parejas: Parejas, entrada: EntradaDeConciliacion, resultado: ResultadoDeConciliacion): void {
  for (const documento of entrada.documentos.filter(delLibroDelPeriodo(entrada.periodo))) {
    const clasificado = clasificarDocumento(documento, parejas.filaDelDocumento.get(documento.id), entrada.cobertura);
    resultado[clasificado[0]].push(clasificado[1]);
  }
  const mes = entrada.periodo.slice(0, 7);
  const enElLibro = delLibroDelPeriodo(entrada.periodo);
  for (const fila of entrada.filas.filter((f) => f.fechaEmision.startsWith(mes))) {
    const documento = parejas.documentoDeLaFila.get(fila.id);
    if (documento && enElLibro(documento)) continue;
    const clasificado = clasificarFila(fila, documento);
    if (clasificado) resultado[clasificado[0]].push(clasificado[1]);
  }
}

/**
 * Cruza lo que hay en Arrancar con lo que dice la SAT para un período (consulta pura, nada se guarda). Los dos lados del
 * período: los documentos del libro con ese período, y las filas emitidas en ese mes. Ver el diseño, §3.3b.9.
 */
export function conciliar(entrada: EntradaDeConciliacion): ResultadoDeConciliacion {
  const resultado = resultadoVacio();
  delLado(emparejar(entrada.documentos, entrada.filas), entrada, resultado);
  for (const lista of Object.values(resultado)) lista.sort(ordenar);
  return resultado;
}
