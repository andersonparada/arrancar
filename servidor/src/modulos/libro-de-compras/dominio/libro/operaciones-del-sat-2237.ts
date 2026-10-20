import { CODIGOS_DTE_DE_LA_FAMILIA, type TipoDeDocumento, type TipoDte } from '../tipos-de-documento.js';
import type { DocumentoDelLibro } from './documento-del-libro.js';

export interface OperacionDelSegmento9 {
  clave: string;
  nombre: string;
  tiposDte: readonly TipoDte[];
  cantidad: number;
  /** Centavos, sin signo: las notas de crédito no restan aquí. */
  base: number;
}

const GRUPOS: ReadonlyArray<{ clave: string; nombre: string; familias: readonly TipoDeDocumento[] }> = [
  { clave: 'facturas', nombre: 'Facturas recibidas', familias: ['factura'] },
  {
    clave: 'pequeno_contribuyente',
    nombre: 'Facturas de pequeño contribuyente',
    familias: ['factura_pequeno_contribuyente', 'factura_pequeno_contribuyente_electronico'],
  },
  {
    clave: 'regimenes_sin_iva',
    nombre: 'Facturas de regímenes sin IVA',
    familias: ['factura_contribuyente_agropecuario', 'factura_primario_pecuario'],
  },
  { clave: 'facturas_especiales', nombre: 'Facturas especiales emitidas', familias: ['factura_especial'] },
  { clave: 'notas_de_credito', nombre: 'Notas de crédito recibidas', familias: ['nota_de_credito'] },
  { clave: 'notas_de_debito', nombre: 'Notas de débito recibidas', familias: ['nota_de_debito'] },
];

/**
 * El segmento 9: cuántos documentos del libro hay de cada clase y su base. Cuenta todo lo que está en el libro, tenga
 * o no crédito; el mapa de casillas decide cuáles suma cada casilla.
 */
export function operacionesDelSat2237(documentos: DocumentoDelLibro[]): OperacionDelSegmento9[] {
  return GRUPOS.map(({ clave, nombre, familias }) => {
    const delGrupo = documentos.filter((d) => familias.includes(d.tipo));
    return {
      clave,
      nombre,
      tiposDte: familias.flatMap((familia) => CODIGOS_DTE_DE_LA_FAMILIA[familia]),
      cantidad: delGrupo.length,
      base: delGrupo.reduce((suma, d) => suma + d.base, 0),
    };
  });
}
