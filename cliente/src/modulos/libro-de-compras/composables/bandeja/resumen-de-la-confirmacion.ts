import { aCentavos, deCentavos } from '../retenciones/dinero';
import type { ResultadoDeVistaPrevia } from '../../servicios/dte-recibidos.api';

type FilaLista = Extract<ResultadoDeVistaPrevia, { documento: unknown }>;

/** Lo que de verdad se registraría al confirmar: solo las filas de la vista previa que no traen error. */
export interface ResumenDeLoRegistrable {
  marcadas: number;
  registrables: number;
  notasDeCredito: number;
  notasDeDebito: number;
  /** Con signo: las notas de crédito restan y las de débito suman. */
  total: string;
}

const esNotaDeCredito = (tipoDte: string | undefined): boolean => tipoDte === 'NCRE';
const esNotaDeDebito = (tipoDte: string | undefined): boolean => tipoDte === 'NDEB';

/** El monto de una nota de crédito resta aunque el servidor lo mande en positivo o en negativo. */
const montoConSigno = (monto: string, tipoDte: string | undefined): number => {
  const centavos = aCentavos(monto) ?? 0;
  return esNotaDeCredito(tipoDte) ? -Math.abs(centavos) : centavos;
};

/** Cuenta y suma el total del documento de cada fila lista; `tipos` dice el tipo de DTE de cada fila por su id. */
export function resumenDeLoRegistrable(
  listas: readonly ResultadoDeVistaPrevia[],
  tipos: ReadonlyMap<string, string>,
  marcadas: number,
): ResumenDeLoRegistrable {
  const filas = listas.filter((fila): fila is FilaLista => 'documento' in fila);
  const tipoDe = (fila: FilaLista) => tipos.get(fila.id);
  const total = filas.reduce((suma, fila) => suma + montoConSigno(fila.documento.totales.total, tipoDe(fila)), 0);
  return {
    marcadas,
    registrables: filas.length,
    notasDeCredito: filas.filter((fila) => esNotaDeCredito(tipoDe(fila))).length,
    notasDeDebito: filas.filter((fila) => esNotaDeDebito(tipoDe(fila))).length,
    total: deCentavos(total),
  };
}

const plural = (cantidad: number, singular: string, pluralDe: string): string =>
  `${cantidad} ${cantidad === 1 ? singular : pluralDe}`;

/** «12 facturas, 2 notas de crédito»; las facturas son todo lo que no es nota. */
export function desgloseDeDocumentos(resumen: ResumenDeLoRegistrable): string {
  const { registrables, notasDeCredito, notasDeDebito } = resumen;
  const partes = [plural(registrables - notasDeCredito - notasDeDebito, 'factura', 'facturas')];
  if (notasDeCredito) partes.push(plural(notasDeCredito, 'nota de crédito', 'notas de crédito'));
  if (notasDeDebito) partes.push(plural(notasDeDebito, 'nota de débito', 'notas de débito'));
  return partes.join(', ');
}

/** La frase del resumen, sin el monto (la ventana lo pone con el formato de la empresa). */
export function fraseDelResumen(resumen: ResumenDeLoRegistrable): {
  hayQueRegistrar: boolean;
  texto: string;
  desglose: string;
} {
  if (resumen.registrables === 0) {
    return {
      hayQueRegistrar: false,
      texto: `Ninguno de los ${resumen.marcadas} marcados se puede registrar todavía.`,
      desglose: '',
    };
  }
  const conNotas = resumen.notasDeCredito + resumen.notasDeDebito > 0;
  return {
    hayQueRegistrar: true,
    texto: `${resumen.registrables} de ${resumen.marcadas} ${resumen.marcadas === 1 ? 'documento' : 'documentos'}`,
    desglose: conNotas ? desgloseDeDocumentos(resumen) : '',
  };
}

/** Cómo se muestra el neto a pagar de una fila: una nota de crédito deja un saldo a favor, no algo por pagar. */
export function netoDeLaFila(tipoDte: string | undefined, neto: string): { etiqueta: string; monto: string } {
  if (!esNotaDeCredito(tipoDte)) return { etiqueta: 'Neto a pagar', monto: neto };
  return { etiqueta: 'A favor', monto: deCentavos(Math.abs(aCentavos(neto) ?? 0)) };
}

/** Texto de lo que se registró al terminar: «Se registró 1 documento.» o «Se registraron 3 documentos.». */
export const textoDeRegistrados = (cantidad: number): string =>
  cantidad === 1 ? 'Se registró 1 documento.' : `Se registraron ${cantidad} documentos.`;

/** Un aviso del servidor y los documentos a los que se refiere. */
export interface AvisoAgrupado {
  aviso: string;
  titulos: string[];
}

/** Los avisos de las filas registradas sin repetir: cada texto una vez, con los documentos que lo trajeron. */
export function agruparAvisos(
  registradas: readonly { id: string; avisos: readonly string[] }[],
  titulos: ReadonlyMap<string, string>,
): AvisoAgrupado[] {
  const grupos = new Map<string, string[]>();
  for (const { id, avisos } of registradas) {
    for (const aviso of new Set(avisos)) {
      grupos.set(aviso, [...(grupos.get(aviso) ?? []), titulos.get(id) ?? id]);
    }
  }
  return [...grupos].map(([aviso, lista]) => ({ aviso, titulos: lista }));
}
