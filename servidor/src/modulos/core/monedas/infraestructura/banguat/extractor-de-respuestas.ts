import type {
  MonedaDelBanguat,
  MonedaPedida,
  PublicacionRechazada,
  ResultadoDeConsulta,
} from '../../dominio/publicacion.js';
import { validarPublicacion, type ValorCrudo } from '../../dominio/reglas-de-publicacion.js';
import { bloquesDe, resultadoDe, sinEntidadesBasicas, textoDe } from './lectura-de-xml.js';

/** El dólar: se lee siempre en `TipoCambioDia` y `TipoCambioRango`. */
export const DOLAR: MonedaPedida = { moneda: 'USD', codigoBanguat: 2 };
const LARGO_MAXIMO_DE_DESCRIPCION = 120;

/** De las publicaciones repetidas de una moneda y fecha queda la primera. */
function sinRepetidas(resultado: ResultadoDeConsulta): ResultadoDeConsulta {
  const vistas = new Set<string>();
  const publicaciones = resultado.publicaciones.filter((p) => {
    const llave = `${p.moneda}|${p.fecha}`;
    if (vistas.has(llave)) return false;
    vistas.add(llave);
    return true;
  });
  return { publicaciones, rechazadas: resultado.rechazadas };
}

/** Valida cada valor crudo y arma el resultado. */
function resultadoDeValidar(valores: readonly ValorCrudo[], hoy: string): ResultadoDeConsulta {
  const rechazadas: PublicacionRechazada[] = [];
  const publicaciones: ResultadoDeConsulta['publicaciones'][number][] = [];
  for (const valor of valores) {
    const validacion = validarPublicacion(valor, hoy);
    if (validacion.valida) publicaciones.push(validacion.publicacion);
    else rechazadas.push({ moneda: valor.moneda, fecha: validacion.fecha, motivo: validacion.motivo });
  }
  return sinRepetidas({ publicaciones, rechazadas });
}

/** Una fila `Var` (`moneda`, `fecha`, `venta`, `compra`) a un valor crudo; `undefined` si es de una moneda no pedida. */
function valorDeUnaFila(bloque: string, pedidas: ReadonlyMap<string, MonedaPedida>): ValorCrudo | undefined {
  const pedida = pedidas.get(textoDe(bloque, 'moneda') ?? '');
  if (!pedida) return undefined;
  const venta = textoDe(bloque, 'venta') ?? '';
  const compra = textoDe(bloque, 'compra') ?? '';
  return { ...pedida, fecha: textoDe(bloque, 'fecha') ?? '', compra, venta };
}

function valoresDeLasFilas(resultado: string, monedas: readonly MonedaPedida[]): ValorCrudo[] {
  const pedidas = new Map(monedas.map((m) => [String(m.codigoBanguat), m]));
  return bloquesDe(resultado, 'Var').flatMap((bloque) => valorDeUnaFila(bloque, pedidas) ?? []);
}

/**
 * Extrae la respuesta de `TipoCambioDia`: el USD en `CambioDolar/VarDolar{fecha, referencia}` y, si el día
 * las trae en `CambioDia/Var`, las `monedas` pedidas (las demás se ignoran).
 * @throws RespuestaInvalida
 */
export function extraerTipoDelDia(
  xml: string,
  hoy: string,
  monedas: readonly MonedaPedida[] = [],
): ResultadoDeConsulta {
  const resultado = resultadoDe(xml, 'TipoCambioDia');
  const dolares = bloquesDe(resultado, 'VarDolar').map((bloque) => ({
    ...DOLAR,
    fecha: textoDe(bloque, 'fecha') ?? '',
    referencia: textoDe(bloque, 'referencia') ?? '',
  }));
  const otras = monedas.filter((m) => m.codigoBanguat !== DOLAR.codigoBanguat);
  return resultadoDeValidar([...dolares, ...valoresDeLasFilas(resultado, otras)], hoy);
}

/**
 * Extrae la respuesta de `TipoCambioRango` (solo el dólar) o de `TipoCambioRangoMoneda` (la moneda pedida).
 * El rango no trae `referencia`, sino `compra` y `venta`: en el dólar son iguales (V-13); en las demás monedas
 * difieren casi siempre y la referencia es su promedio (adenda B.5). Si se separan más de 3 %, la fila se rechaza
 * como `valor_ambiguo`. Un código que no se pidió se ignora.
 * @throws RespuestaInvalida
 */
export function extraerTiposDelRango(
  xml: string,
  hoy: string,
  opciones: { operacion: string; monedas: readonly MonedaPedida[] },
): ResultadoDeConsulta {
  const resultado = resultadoDe(xml, opciones.operacion);
  return resultadoDeValidar(valoresDeLasFilas(resultado, opciones.monedas), hoy);
}

/** Una fila `Variable` a una moneda; `undefined` si el código no es un entero positivo de `smallint` o no hay descripción. */
function monedaDeLaLista(bloque: string): MonedaDelBanguat | undefined {
  const codigo = Number(textoDe(bloque, 'moneda') ?? '');
  const descripcion = sinEntidadesBasicas(textoDe(bloque, 'descripcion') ?? '')
    .trim()
    .slice(0, LARGO_MAXIMO_DE_DESCRIPCION);
  if (!Number.isInteger(codigo) || codigo < 1 || codigo > 32_767 || !descripcion) return undefined;
  return { codigo, descripcion };
}

/**
 * Extrae la lista de `VariablesDisponibles`. Descarta las filas inválidas y las repetidas (queda la primera).
 * Una respuesta sin monedas es una lista vacía.
 * @throws RespuestaInvalida
 */
export function extraerMonedasDisponibles(xml: string): MonedaDelBanguat[] {
  const resultado = resultadoDe(xml, 'VariablesDisponibles');
  const vistas = new Set<number>();
  return bloquesDe(resultado, 'Variable')
    .map(monedaDeLaLista)
    .filter((moneda): moneda is MonedaDelBanguat => {
      if (!moneda || vistas.has(moneda.codigo)) return false;
      vistas.add(moneda.codigo);
      return true;
    });
}
