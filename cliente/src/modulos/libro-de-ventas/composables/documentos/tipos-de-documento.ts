import type { TipoDeDocumento } from '../../servicios/documentos.api';
import { NOMBRE_CORTO_DE_DOCUMENTO, TIPOS_DE_DOCUMENTO } from '../../textos-de-documentos';

/** Los códigos de la SAT de cada familia, para ofrecer solo los que caben (el servidor revisa la coincidencia). */
export const CODIGOS_DTE_DE_LA_FAMILIA: Record<TipoDeDocumento, readonly string[]> = {
  factura: ['FACT'],
  factura_cambiaria: ['FCAM'],
  factura_pequeno_contribuyente: ['FPEQ', 'FCAP'],
  factura_pequeno_contribuyente_electronico: ['FAPE', 'FCPE'],
  factura_contribuyente_agropecuario: ['FACA', 'FCCA', 'FAAE', 'FCAE'],
  factura_primario_pecuario: ['FARP', 'FCRP', 'FPEC', 'FCPC'],
  factura_especial_recibida: ['FESP'],
  nota_de_credito: ['NCRE'],
  nota_de_debito: ['NDEB'],
  nota_de_abono: ['NABN'],
  recibo: ['RECI', 'RDON'],
};

/** Las notas corrigen una factura anterior. */
export const esNota = (tipo: TipoDeDocumento): boolean =>
  tipo === 'nota_de_credito' || tipo === 'nota_de_debito' || tipo === 'nota_de_abono';

/** Las facturas a las que se les puede poner una nota: ni notas ni recibos ni la factura especial del comprador. */
export const admiteNota = (tipo: TipoDeDocumento): boolean =>
  !esNota(tipo) && tipo !== 'recibo' && tipo !== 'factura_especial_recibida';

const DEROGADOS: readonly TipoDeDocumento[] = [
  'factura_pequeno_contribuyente_electronico',
  'factura_contribuyente_agropecuario',
];

export const estaDerogado = (tipo: TipoDeDocumento): boolean => DEROGADOS.includes(tipo);

const porTexto = (a: { texto: string }, b: { texto: string }) =>
  a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' });

/** Los tipos por nombre; la factura, que es la más usada, va primero. */
export function opcionesDeTipo(): { valor: TipoDeDocumento; texto: string }[] {
  const todos = (Object.entries(TIPOS_DE_DOCUMENTO) as [TipoDeDocumento, string][])
    .filter(([valor]) => valor !== 'factura')
    .map(([valor, texto]) => ({ valor, texto }))
    .sort(porTexto);
  return [{ valor: 'factura', texto: TIPOS_DE_DOCUMENTO.factura }, ...todos];
}

/** Los códigos del selector de DTE de ese tipo. */
export const opcionesDeCodigoDte = (tipo: TipoDeDocumento): { valor: string; texto: string }[] =>
  CODIGOS_DTE_DE_LA_FAMILIA[tipo].map((codigo) => ({ valor: codigo, texto: codigo }));

/** «Factura A-123», «Nota de crédito 45» o, sin número, solo el nombre. */
export function tituloDeDocumento(documento: { tipo: TipoDeDocumento; serie: string | null; numero: string }): string {
  const numero = documento.serie ? `${documento.serie}-${documento.numero}` : documento.numero;
  return `${NOMBRE_CORTO_DE_DOCUMENTO[documento.tipo]} ${numero}`;
}
