import { PdfDanado } from './documento.js';

/** Claves de diccionario que solo aparecen en PDF con programas, adjuntos, formularios o acciones automáticas. */
const CLAVES_PROHIBIDAS = new Set([
  '/JS',
  '/JavaScript',
  '/Launch',
  '/EmbeddedFile',
  '/EmbeddedFiles',
  '/EF',
  '/XFA',
  '/RichMedia',
  '/SubmitForm',
  '/ImportData',
  '/GoToE',
  '/GoToR',
  '/AA',
  '/Rendition',
  '/Movie',
  '/Sound',
]);

/** Valores de `/S` (tipo de acción) y de `/Type` que también delatan contenido activo. */
const NOMBRES_PROHIBIDOS = new Set([
  '/JavaScript',
  '/Launch',
  '/EmbeddedFile',
  '/GoToE',
  '/GoToR',
  '/SubmitForm',
  '/ImportData',
  '/Rendition',
  '/Movie',
  '/Sound',
  '/RichMediaExecute',
]);

type Objetos = Record<string, unknown>;

const REFERENCIA_INDIRECTA = /^\d+ \d+ R$/;

function esDiccionario(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/** Saca los objetos del JSON v2 de qpdf (`--json-key=qpdf`): el segundo elemento de `qpdf`. */
function objetosDelJson(json: unknown): Objetos {
  const lista = esDiccionario(json) ? json['qpdf'] : undefined;
  const objetos = Array.isArray(lista) ? lista[1] : undefined;
  if (!esDiccionario(objetos)) throw new PdfDanado();
  return objetos;
}

/** Sigue una referencia indirecta («5 0 R») hasta el valor del objeto. */
function resolver(valor: unknown, objetos: Objetos): unknown {
  if (typeof valor !== 'string' || !REFERENCIA_INDIRECTA.test(valor)) return valor;
  const objeto = objetos[`obj:${valor}`];
  return esDiccionario(objeto) ? objeto['value'] : undefined;
}

/** Al abrir, solo se permite ir a un destino (arreglo) o una acción `/GoTo`. */
function aperturaPermitida(valor: unknown, objetos: Objetos): boolean {
  const accion = resolver(valor, objetos);
  if (Array.isArray(accion)) return true;
  return esDiccionario(accion) && accion['/S'] === '/GoTo';
}

function revisarEntrada(clave: string, valor: unknown, objetos: Objetos): string | null {
  if (CLAVES_PROHIBIDAS.has(clave)) return clave;
  const esNombreDeTipo = clave === '/S' || clave === '/Type';
  if (esNombreDeTipo && typeof valor === 'string' && NOMBRES_PROHIBIDOS.has(valor)) return valor;
  if (clave === '/OpenAction' && !aperturaPermitida(valor, objetos)) return clave;
  return null;
}

function recorrer(nodo: unknown, objetos: Objetos, hallazgos: Set<string>): void {
  if (Array.isArray(nodo)) {
    nodo.forEach((hijo) => recorrer(hijo, objetos, hallazgos));
  } else if (esDiccionario(nodo)) {
    for (const [clave, valor] of Object.entries(nodo)) {
      const hallazgo = revisarEntrada(clave, valor, objetos);
      if (hallazgo) hallazgos.add(hallazgo);
      recorrer(valor, objetos, hallazgos);
    }
  }
}

/**
 * Busca en el JSON v2 de qpdf (sin datos de streams) lo que un PDF de un estado de cuenta
 * nunca necesita: JavaScript, adjuntos, formularios, enlaces a otros archivos, acciones
 * automáticas y multimedia. Se permiten `/URI`, `/GoTo` y `/Named`.
 * @returns Los nombres encontrados, sin repetir; vacío si el PDF está limpio.
 * @throws PdfDanado si el JSON no tiene la forma esperada.
 */
export function buscarContenidoActivo(json: unknown): string[] {
  const objetos = objetosDelJson(json);
  const hallazgos = new Set<string>();
  recorrer(objetos, objetos, hallazgos);
  return [...hallazgos].sort();
}
