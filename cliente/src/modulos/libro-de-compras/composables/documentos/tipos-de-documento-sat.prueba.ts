import { describe, expect, it } from 'vitest';
import {
  esFacturaEspecial,
  CODIGO_DE_RECIBO,
  familiaDelCodigo,
  GRUPOS_DE_TIPOS_SAT,
  opcionesDeTipoSat,
  TIPOS_SAT,
} from './tipos-de-documento-sat';

describe('tipos de documento por código de la SAT', () => {
  it('deduce la familia de cada código', () => {
    expect(familiaDelCodigo('FACT')).toBe('factura');
    expect(familiaDelCodigo('FCAM')).toBe('factura');
    expect(familiaDelCodigo('FPEQ')).toBe('factura_pequeno_contribuyente');
    expect(familiaDelCodigo('FAPE')).toBe('factura_pequeno_contribuyente_electronico');
    expect(familiaDelCodigo('FAAE')).toBe('factura_contribuyente_agropecuario');
    expect(familiaDelCodigo('FPEC')).toBe('factura_primario_pecuario');
    expect(familiaDelCodigo('FESP')).toBe('factura_especial');
    expect(familiaDelCodigo('NCRE')).toBe('nota_de_credito');
  });

  it('el recibo no tiene código de la SAT y un código desconocido o vacío no tiene familia', () => {
    expect(familiaDelCodigo(CODIGO_DE_RECIBO)).toBe('recibo');
    expect(familiaDelCodigo('')).toBeNull();
    expect(familiaDelCodigo('XXXX')).toBeNull();
  });

  it('ofrece todos los códigos y el recibo, cada uno con su grupo', () => {
    const opciones = opcionesDeTipoSat();
    expect(opciones).toHaveLength(TIPOS_SAT.length + 1);
    expect(opciones.every((opcion) => Object.values(GRUPOS_DE_TIPOS_SAT).includes(opcion.grupo))).toBe(true);
    expect(opciones.at(-1)).toMatchObject({ valor: CODIGO_DE_RECIBO, texto: 'Recibo (sin FEL)' });
  });

  it('los textos llevan el código y el nombre del encabezado de la factura', () => {
    const textos = Object.fromEntries(opcionesDeTipoSat().map(({ valor, texto }) => [valor, texto]));
    expect(textos.FACT).toBe('FACT — Factura');
    expect(textos.FCAM).toBe('FCAM — Factura cambiaria');
    expect(textos.FARP).toBe('FARP — Factura contribuyente régimen primario');
    expect(textos.NCRE).toBe('NCRE — Nota de crédito');
  });

  it('usa el patrón de nombres de la SAT (sin «de» y con «pequeño contribuyente»)', () => {
    const nombres = Object.fromEntries(TIPOS_SAT.map(({ codigo, nombre }) => [codigo, nombre]));
    expect(nombres).toMatchObject({
      FPEQ: 'Factura pequeño contribuyente',
      FCAP: 'Factura cambiaria pequeño contribuyente',
      FAPE: 'Factura pequeño contribuyente régimen electrónico',
      FCPE: 'Factura cambiaria pequeño contribuyente régimen electrónico',
      FACA: 'Factura contribuyente agropecuario',
      FCCA: 'Factura cambiaria contribuyente agropecuario',
      FAAE: 'Factura contribuyente agropecuario régimen electrónico especial',
      FCAE: 'Factura cambiaria contribuyente agropecuario régimen electrónico especial',
      FARP: 'Factura contribuyente régimen primario',
      FCRP: 'Factura cambiaria contribuyente régimen primario',
      FPEC: 'Factura contribuyente régimen pecuario',
      FCPC: 'Factura cambiaria contribuyente régimen pecuario',
      FACT: 'Factura',
      FCAM: 'Factura cambiaria',
      FESP: 'Factura especial',
      NCRE: 'Nota de crédito',
    });
  });

  it('los derogados lo dicen y la factura especial ya se puede elegir', () => {
    const opciones = opcionesDeTipoSat();
    const de = (codigo: string) => opciones.find((opcion) => opcion.valor === codigo);
    expect(de('FAPE')?.texto).toContain('(régimen derogado, solo antes de julio de 2025)');
    expect(de('FACA')?.texto).toContain('régimen derogado');
    expect(de('FESP')).toMatchObject({ texto: 'FESP — Factura especial' });
    expect(opciones.some((opcion) => opcion.deshabilitada)).toBe(false);
    expect(esFacturaEspecial('FESP')).toBe(true);
    expect(esFacturaEspecial('FACT')).toBe(false);
  });
});
