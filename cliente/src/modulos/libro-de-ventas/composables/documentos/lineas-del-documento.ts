import { textoONulo } from '@/modulos/core/utilidades/edicion';
import type { ClaseFiscal, DatosDeLinea, TipoDeLinea } from '../../servicios/documentos.api';

/** Lo que se escribe en cada línea; el dinero queda como texto hasta enviarlo. `clave` identifica la fila al quitarla. */
export interface LineaEnEdicion {
  clave: number;
  conceptoDeIngresoId: string | null;
  /** Vacío: el tipo del concepto de ingreso. */
  tipo: TipoDeLinea | '';
  claseFiscal: ClaseFiscal;
  descripcion: string;
  /** El total de la línea, con el IVA incluido. */
  total: string;
  otrosImpuestos: string;
}

let ultimaClave = 0;

/** Una línea en blanco: gravada, que es la clase de casi todas las ventas. */
export function lineaVacia(): LineaEnEdicion {
  ultimaClave += 1;
  return {
    clave: ultimaClave,
    conceptoDeIngresoId: null,
    tipo: '',
    claseFiscal: 'gravada',
    descripcion: '',
    total: '',
    otrosImpuestos: '',
  };
}

const FORMATO_DE_DINERO = /^\d{1,12}(\.\d{1,2})?$/;

/** El dinero escrito (`1234.5`) en centavos, o `null` si no es una cantidad con a lo sumo dos decimales. */
export function centavosDe(texto: string): number | null {
  const limpio = texto.trim();
  if (!FORMATO_DE_DINERO.test(limpio)) return null;
  const [enteros = '0', decimales = ''] = limpio.split('.');
  return Number(enteros) * 100 + Number(decimales.padEnd(2, '0'));
}

/** Centavos como texto con dos decimales (`112050` → `1120.50`). */
export const dineroDe = (centavos: number): string => (centavos / 100).toFixed(2);

/** La suma de los totales de las líneas que ya tienen una cantidad válida, como texto con dos decimales. */
export function sumaDeLineas(lineas: readonly LineaEnEdicion[]): string {
  const centavos = lineas.reduce((suma, linea) => suma + (centavosDe(linea.total) ?? 0), 0);
  return dineroDe(centavos);
}

/** Errores de lo escrito que se pueden ver sin esperar al servidor; los faltantes solo se marcan al intentar registrar. */
export function erroresLocalesDeLinea(linea: LineaEnEdicion, intentado: boolean): Record<string, string> {
  const errores: Record<string, string> = {};
  if (intentado && !linea.conceptoDeIngresoId) errores.conceptoDeIngresoId = 'Escoja el concepto de ingreso.';
  if (linea.total.trim() === '') {
    if (intentado) errores.total = 'Escriba el total de la línea, con el IVA incluido.';
  } else if (centavosDe(linea.total) === null) {
    errores.total = 'Escriba solo números, con hasta dos decimales (por ejemplo 1250.50).';
  }
  if (linea.otrosImpuestos.trim() !== '' && centavosDe(linea.otrosImpuestos) === null) {
    errores.otrosImpuestos = 'Escriba solo números, con hasta dos decimales.';
  }
  return errores;
}

/** Los errores de una línea del servidor (`lineas.0.total`) como los espera la fila (`total`). */
export function erroresDeLaLinea(errores: Record<string, string>, indice: number): Record<string, string> {
  const prefijo = `lineas.${indice}.`;
  return Object.fromEntries(
    Object.entries(errores)
      .filter(([campo]) => campo.startsWith(prefijo))
      .map(([campo, mensaje]) => [campo.slice(prefijo.length), mensaje]),
  );
}

/** Lo que falta para poder registrar las líneas, dicho en frases cortas. */
export function pendientesDeLineas(lineas: readonly LineaEnEdicion[]): string[] {
  const pendientes: string[] = [];
  lineas.forEach((linea, indice) => {
    const errores = erroresLocalesDeLinea(linea, true);
    const nombre = lineas.length > 1 ? ` de la línea ${indice + 1}` : ' de la línea';
    if (errores.conceptoDeIngresoId) pendientes.push(`el concepto${nombre}`);
    if (errores.total) pendientes.push(`el total${nombre}`);
    if (errores.otrosImpuestos) pendientes.push(`corregir los otros impuestos${nombre}`);
  });
  return pendientes;
}

/** Una línea ya revisada, lista para el servidor: lo vacío va como `null` y el servidor completa tipo y clase. */
export const datosDeLinea = (linea: LineaEnEdicion): DatosDeLinea => ({
  conceptoDeIngresoId: linea.conceptoDeIngresoId ?? '',
  tipo: linea.tipo || null,
  claseFiscal: linea.claseFiscal,
  descripcion: textoONulo(linea.descripcion),
  total: linea.total.trim(),
  otrosImpuestos: textoONulo(linea.otrosImpuestos),
});
