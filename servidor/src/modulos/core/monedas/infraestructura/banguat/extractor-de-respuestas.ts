import { RespuestaInvalida } from '../../dominio/errores.js';
import type { PublicacionRechazada, ResultadoDeConsulta } from '../../dominio/publicacion.js';
import { validarPublicacion, type ValorCrudo } from '../../dominio/reglas-de-publicacion.js';

/** Código de moneda del Banguat → código ISO. El USD es el 2; las demás se verifican con `VariablesDisponibles`. */
export const MONEDAS_POR_CODIGO_BANGUAT: ReadonlyMap<string, string> = new Map([['2', 'USD']]);

const ENTIDADES_PROHIBIDAS = /<!\s*(DOCTYPE|ENTITY)/i;
const FALLA_SOAP = /<(?:[\w-]+:)?Fault[\s>]/;

/** El contenido del primer `<etiqueta>…</etiqueta>` (con o sin prefijo de espacio de nombres), recortado. */
function textoDe(bloque: string, etiqueta: string): string | undefined {
  const patron = new RegExp(`<(?:[\\w-]+:)?${etiqueta}>([^<]*)</(?:[\\w-]+:)?${etiqueta}>`);
  return patron.exec(bloque)?.[1]?.trim();
}

/** Los contenidos de cada `<etiqueta>…</etiqueta>` (sin anidar el mismo nombre) del bloque. */
function bloquesDe(bloque: string, etiqueta: string): string[] {
  const patron = new RegExp(`<(?:[\\w-]+:)?${etiqueta}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${etiqueta}>`, 'g');
  return [...bloque.matchAll(patron)].map((coincidencia) => coincidencia[1]!);
}

/**
 * Revisa que el XML sea seguro y traiga el resultado de `operacion`; devuelve lo que hay dentro de él.
 * Rechaza todo XML con `<!DOCTYPE` o `<!ENTITY` y no usa un analizador: solo se leen los elementos esperados.
 * @throws RespuestaInvalida si trae entidades, una falla SOAP o no tiene la estructura del servicio.
 */
function resultadoDe(xml: string, operacion: string): string {
  if (ENTIDADES_PROHIBIDAS.test(xml)) throw new RespuestaInvalida('La respuesta del Banguat trae entidades XML.');
  if (FALLA_SOAP.test(xml)) throw new RespuestaInvalida('El Banguat respondió con una falla SOAP.');
  const resultado = bloquesDe(xml, `${operacion}Result`)[0];
  if (resultado !== undefined) return resultado;
  if (new RegExp(`<(?:[\\w-]+:)?${operacion}Result\\s*/>`).test(xml)) return '';
  throw new RespuestaInvalida(`La respuesta del Banguat no trae ${operacion}Result.`);
}

/** Quita lo rechazado de las publicaciones repetidas de una fecha: si hay dos de la misma moneda y fecha, queda la primera. */
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

/**
 * Extrae la respuesta de `TipoCambioDia`: el USD en `CambioDolar/VarDolar{fecha, referencia}`.
 * @throws RespuestaInvalida
 */
export function extraerTipoDelDia(xml: string, hoy: string): ResultadoDeConsulta {
  const resultado = resultadoDe(xml, 'TipoCambioDia');
  const valores = bloquesDe(resultado, 'VarDolar').map((bloque) => ({
    moneda: 'USD',
    fecha: textoDe(bloque, 'fecha') ?? '',
    referencia: textoDe(bloque, 'referencia') ?? '',
  }));
  return resultadoDeValidar(valores, hoy);
}

/** Una fila `Var` del rango a un valor crudo; `undefined` si es de una moneda que no se maneja. */
function valorDelRango(bloque: string): ValorCrudo | 'sin_referencia' | undefined {
  const moneda = MONEDAS_POR_CODIGO_BANGUAT.get(textoDe(bloque, 'moneda') ?? '');
  if (!moneda) return undefined;
  const compra = textoDe(bloque, 'compra') ?? '';
  const venta = textoDe(bloque, 'venta') ?? '';
  if (compra !== venta) return 'sin_referencia';
  return { moneda, fecha: textoDe(bloque, 'fecha') ?? '', referencia: venta };
}

/**
 * Extrae la respuesta de `TipoCambioRango`. El rango no trae `referencia`: para el USD `compra` y `venta` son
 * iguales a ella (comprobado con el servicio real, V-13); si difieren, la fila se rechaza como `sin_referencia`.
 * @throws RespuestaInvalida
 */
export function extraerTiposDelRango(xml: string, hoy: string): ResultadoDeConsulta {
  const resultado = resultadoDe(xml, 'TipoCambioRango');
  const valores: ValorCrudo[] = [];
  const sinReferencia: PublicacionRechazada[] = [];
  for (const bloque of bloquesDe(resultado, 'Var')) {
    const valor = valorDelRango(bloque);
    if (valor === 'sin_referencia') {
      sinReferencia.push({ moneda: 'USD', fecha: textoDe(bloque, 'fecha') ?? '', motivo: 'sin_referencia' });
    } else if (valor) valores.push(valor);
  }
  const validado = resultadoDeValidar(valores, hoy);
  return { publicaciones: validado.publicaciones, rechazadas: [...validado.rechazadas, ...sinReferencia] };
}
