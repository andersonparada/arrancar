import type { CambioDeCifra, DocumentoCambiado } from '../../servicios/periodos.api';
import { TIPOS_SAT } from '../documentos/tipos-de-documento-sat';
import { MOTIVOS_CORTOS } from '../../textos-del-libro';
import type { MotivoSinCredito } from '../../servicios/documentos.api';

const COLUMNAS: Record<string, string> = {
  bienes: 'Bienes',
  servicios: 'Servicios',
  combustibles: 'Combustibles',
  pequenoContribuyente: 'Pequeño contribuyente',
  primarioPecuario: 'Primario o pecuario',
  exentoYNoAfecto: 'Exento y no afecto',
  idp: 'IDP',
  ivaConCredito: 'IVA con crédito',
  ivaSinCredito: 'IVA sin crédito',
  ivaInformativo: 'IVA (informativo)',
  total: 'Total',
};

const DE_COMBUSTIBLES: Record<string, string> = {
  base: 'Base',
  idp: 'IDP',
  iva: 'IVA',
  exentoPorDecreto: 'Exento por decreto',
};

const nombreDelTipo = (codigo: string): string => TIPOS_SAT.find((tipo) => tipo.codigo === codigo)?.nombre ?? codigo;
const motivoCorto = (motivo: string): string => MOTIVOS_CORTOS[motivo as MotivoSinCredito] ?? motivo;

/** Cómo se llama cada forma de clave de la foto del libro; la primera que coincide gana. */
const REGLAS: Array<[RegExp, (coincidencia: string[]) => string | undefined]> = [
  [/^documentos$/, () => 'Documentos en el libro'],
  [/^resumen\.creditoFiscalDelPeriodo$/, () => 'Crédito fiscal del período'],
  [/^resumen\.totales\.(\w+)$/, ([, columna]) => (COLUMNAS[columna!] ? `Libro: ${COLUMNAS[columna!]}` : undefined)],
  [/^resumen\.porTipoDte\[(.+)\]\.(\w+)$/, ([, tipo, dato]) => `${nombreDelTipo(tipo!)}: ${dato}`],
  [
    /^resumen\.ivaSinCreditoPorMotivo\[(.+)\]\.ivaSinCredito$/,
    ([, motivo]) => `IVA sin crédito: ${motivoCorto(motivo!)}`,
  ],
  [
    /^resumen\.combustibles\.(\w+)$/,
    ([, dato]) => (DE_COMBUSTIBLES[dato!] ? `Combustibles: ${DE_COMBUSTIBLES[dato!]}` : undefined),
  ],
];

/** Cada cifra de la foto del libro con su nombre; la clave que no se conoce se muestra tal cual. */
export function etiquetaDeCifra(clave: string): string {
  for (const [patron, texto] of REGLAS) {
    const coincidencia = patron.exec(clave);
    const etiqueta = coincidencia ? texto(coincidencia) : undefined;
    if (etiqueta) return etiqueta;
  }
  return clave;
}

/** Un monto viaja con dos decimales; un conteo, entero. */
export const esDinero = (valor: string): boolean => /\.\d{2}$/.test(valor);

/** El cambio con su signo, para marcarlo de otro color: sube, baja o no cambia. */
export function sentidoDelCambio(cambio: string): 'sube' | 'baja' | 'igual' {
  const numero = Number(cambio);
  if (numero > 0) return 'sube';
  return numero < 0 ? 'baja' : 'igual';
}

/** Las cifras que cambiaron, las del total primero para que lo más importante se vea arriba. */
export function ordenarCambios(cambios: CambioDeCifra[]): CambioDeCifra[] {
  const prioridad = (cambio: CambioDeCifra) =>
    cambio.clave === 'documentos' || cambio.clave.includes('.total') ? 0 : 1;
  return [...cambios].sort(
    (a, b) => prioridad(a) - prioridad(b) || etiquetaDeCifra(a.clave).localeCompare(etiquetaDeCifra(b.clave), 'es'),
  );
}

/** «FACT A-123» o «123» si no tiene tipo ni serie. */
export function nombreDelDocumentoCambiado(documento: DocumentoCambiado): string {
  const partes = [documento.tipoDte, documento.serie, documento.numero].filter(Boolean);
  return partes.join(' ');
}

export const textoDelCambioDeDocumento = (documento: DocumentoCambiado): string =>
  documento.cambio === 'registrado' ? 'Registrado' : 'Anulado';
