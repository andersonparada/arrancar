import { FormatoDeChequeDañado, FormatoDeChequeInvalido } from '../../dominio/errores-de-impresion.js';
import { plantillaDeFabrica, type ClaveDePlantilla } from '../../dominio/formatos-de-cheque/plantillas.js';
import type { FormatoDeCheque } from '../../dominio/formatos-de-cheque/tipos.js';
import { esquemaDeFormatoDeCheque } from './esquema-de-formato.js';

type Objeto = Record<string, unknown>;

const esObjeto = (valor: unknown): valor is Objeto =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor);

/** Mezcla `ajustes` sobre `base`: los objetos se funden campo por campo y cualquier otro valor reemplaza al de la base. */
function fundir(base: unknown, ajustes: unknown): unknown {
  if (!esObjeto(base) || !esObjeto(ajustes)) return ajustes;
  const resultado: Objeto = { ...base };
  for (const [clave, valor] of Object.entries(ajustes)) resultado[clave] = fundir(base[clave], valor);
  return resultado;
}

/** Si el ajuste cambia el modo de la fecha, es otra forma: reemplaza a la de la base en vez de mezclarse. */
function conLaFechaPropia(base: Objeto, ajustes: Objeto): Objeto {
  const fecha = ajustes.fecha;
  const cambiaDeModo = esObjeto(fecha) && fecha.modo !== undefined && fecha.modo !== (base.fecha as Objeto).modo;
  return cambiaDeModo ? { ...base, fecha: undefined } : base;
}

function detallesDe(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string[] {
  return error.issues.map((problema) => `${problema.path.map(String).join('.') || 'formato'}: ${problema.message}`);
}

/**
 * El formato que se imprime: la plantilla de fábrica con los ajustes encima, revisado completo. Una clave que no existe
 * en la lista cerrada de campos se rechaza.
 * @throws FormatoDeChequeInvalido si el resultado no cumple el esquema.
 */
export function resolverFormato(base: ClaveDePlantilla, ajustes: unknown): FormatoDeCheque {
  if (!esObjeto(ajustes)) throw new FormatoDeChequeInvalido('Los ajustes del formato deben ser un objeto.');
  const plantilla = plantillaDeFabrica(base).formato as unknown as Objeto;
  const fundido = fundir(conLaFechaPropia(plantilla, ajustes), ajustes);
  const resultado = esquemaDeFormatoDeCheque.safeParse(fundido);
  if (!resultado.success) {
    throw new FormatoDeChequeInvalido('El formato no es válido.', { campos: detallesDe(resultado.error) });
  }
  return resultado.data;
}

/**
 * Lo mismo, pero para un formato ya guardado: un JSON viejo que dejó de ser válido no imprime un cheque mal puesto.
 * @throws FormatoDeChequeDañado si no cumple el esquema.
 */
export function resolverFormatoGuardado(guardado: {
  nombre: string;
  base: ClaveDePlantilla;
  ajustes: unknown;
}): FormatoDeCheque {
  try {
    return resolverFormato(guardado.base, guardado.ajustes);
  } catch (error) {
    if (error instanceof FormatoDeChequeInvalido) throw new FormatoDeChequeDañado(guardado.nombre);
    throw error;
  }
}

/** La plantilla de fábrica sin ajustes. */
export const formatoDeFabrica = (clave: ClaveDePlantilla): FormatoDeCheque => plantillaDeFabrica(clave).formato;
