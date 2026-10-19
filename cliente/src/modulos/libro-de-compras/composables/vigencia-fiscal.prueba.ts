import { describe, expect, it } from 'vitest';
import type { VigenciaFiscal } from '../servicios/libro-de-compras.api';
import {
  etiquetaDeDesde,
  etiquetaDeHasta,
  mesPropuesto,
  modoDeVigencia,
  motivoParaNoQuitar,
  opcionesDeMes,
  puedeQuitarseLaVigencia,
} from './vigencia-fiscal';

const vigencia = (cambios: Partial<VigenciaFiscal>): VigenciaFiscal => ({
  id: 'v1',
  vigenteDesde: '2026-03-01',
  vigenteHasta: null,
  tipoDePersona: 'juridica',
  regimenIva: 'general',
  regimenIsr: 'utilidades',
  agenteDeRetencionIva: 'ninguno',
  esAgenteDeRetencionIsr: true,
  conDocumentos: false,
  ...cambios,
});

describe('vigencia fiscal de la empresa', () => {
  it('distingue corregir lo de hoy, desde el inicio y desde un mes', () => {
    expect(modoDeVigencia(undefined)).toBe('actual');
    expect(modoDeVigencia(null)).toBe('inicio');
    expect(modoDeVigencia('2026-10-01')).toBe('mes');
  });

  it('propone el mes actual, o el siguiente si lo de hoy ya tiene facturas', () => {
    const hoy = new Date(2026, 9, 18);
    expect(mesPropuesto(hoy, false)).toBe('2026-10-01');
    expect(mesPropuesto(hoy, true)).toBe('2026-11-01');
    expect(mesPropuesto(new Date(2026, 11, 5), true)).toBe('2027-01-01');
  });

  it('ofrece de doce meses adelante a treinta y seis atrás, con nombre de mes', () => {
    const opciones = opcionesDeMes(new Date(2026, 9, 18));
    expect(opciones).toHaveLength(49);
    expect(opciones[0]).toEqual({ valor: '2027-10-01', texto: 'Octubre de 2027' });
    expect(opciones.at(-1)?.valor).toBe('2023-10-01');
  });

  it('conserva un mes ya guardado aunque quede fuera de rango', () => {
    const opciones = opcionesDeMes(new Date(2026, 9, 18), '2010-05-01');
    expect(opciones.at(-1)).toEqual({ valor: '2010-05-01', texto: 'Mayo de 2010' });
  });

  it('escribe desde y hasta', () => {
    expect(etiquetaDeDesde(null)).toBe('Desde el inicio');
    expect(etiquetaDeDesde('2026-03-01')).toBe('Marzo de 2026');
    expect(etiquetaDeHasta(vigencia({}))).toBe('vigente');
    expect(etiquetaDeHasta(vigencia({ vigenteHasta: '2026-09-01' }))).toBe('Septiembre de 2026');
  });

  it('solo se quita lo que no es la base y no tiene facturas', () => {
    expect(puedeQuitarseLaVigencia(vigencia({}))).toBe(true);
    expect(puedeQuitarseLaVigencia(vigencia({ conDocumentos: true }))).toBe(false);
    expect(puedeQuitarseLaVigencia(vigencia({ vigenteDesde: null }))).toBe(false);
    expect(motivoParaNoQuitar(vigencia({ vigenteDesde: null }))).toContain('base');
    expect(motivoParaNoQuitar(vigencia({ conDocumentos: true }))).toContain('facturas');
    expect(motivoParaNoQuitar(vigencia({}))).toBeNull();
  });
});
