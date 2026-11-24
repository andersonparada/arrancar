import { describe, expect, it } from 'vitest';
import {
  admiteNota,
  CODIGOS_DTE_DE_LA_FAMILIA,
  esNota,
  estaDerogado,
  opcionesDeCodigoDte,
  opcionesDeTipo,
  tituloDeDocumento,
} from './tipos-de-documento';

describe('tipos de documento de venta', () => {
  it('las tres notas son notas y no admiten otra nota', () => {
    expect(esNota('nota_de_credito') && esNota('nota_de_debito') && esNota('nota_de_abono')).toBe(true);
    expect(esNota('factura')).toBe(false);
    expect(admiteNota('nota_de_credito')).toBe(false);
    expect(admiteNota('recibo')).toBe(false);
    expect(admiteNota('factura_especial_recibida')).toBe(false);
    expect(admiteNota('factura_cambiaria')).toBe(true);
  });

  it('reconoce los dos tipos derogados', () => {
    expect(estaDerogado('factura_contribuyente_agropecuario')).toBe(true);
    expect(estaDerogado('factura_pequeno_contribuyente_electronico')).toBe(true);
    expect(estaDerogado('factura_pequeno_contribuyente')).toBe(false);
  });

  it('el selector pone primero la factura y luego los demás por nombre', () => {
    const opciones = opcionesDeTipo();

    expect(opciones[0]?.valor).toBe('factura');
    expect(opciones).toHaveLength(Object.keys(CODIGOS_DTE_DE_LA_FAMILIA).length);
    const resto = opciones.slice(1).map((opcion) => opcion.texto);
    expect(resto).toEqual([...resto].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' })));
  });

  it('ofrece solo los códigos de la SAT de la familia', () => {
    expect(opcionesDeCodigoDte('factura_especial_recibida').map((o) => o.valor)).toEqual(['FESP']);
    expect(opcionesDeCodigoDte('recibo').map((o) => o.valor)).toEqual(['RECI', 'RDON']);
  });

  it('el título lleva serie y número', () => {
    expect(tituloDeDocumento({ tipo: 'factura', serie: 'A', numero: '123' })).toBe('Factura A-123');
    expect(tituloDeDocumento({ tipo: 'nota_de_credito', serie: null, numero: '45' })).toBe('Nota de crédito 45');
  });
});
