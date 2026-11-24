import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PoliticaDeCosteo } from '../../servicios/metodo-de-costeo.api';
import {
  detalleDeFila,
  preguntaDeElegir,
  resumenDeLaPolitica,
  sePuedeElegir,
  textoDeDesde,
} from './textos-de-politica';

const politica = (datos: Partial<PoliticaDeCosteo>): PoliticaDeCosteo => ({
  elegido: true,
  fijado: false,
  metodo: 'promedio_ponderado',
  historia: [],
  ...datos,
});

beforeEach(() => setActivePinia(createPinia()));

describe('política de costeo', () => {
  it('sin elección solo hay una propuesta y se puede elegir', () => {
    const sinElegir = politica({ elegido: false });
    expect(resumenDeLaPolitica(sinElegir).titulo).toMatch(/^Propuesta: Promedio ponderado/);
    expect(sePuedeElegir(sinElegir)).toBe(true);
  });

  it('fijado: explica la autorización de la SAT y ya no se ofrece elegir', () => {
    const fijada = politica({ fijado: true, metodo: 'peps' });
    expect(resumenDeLaPolitica(fijada).explicacion).toMatch(/autorización de la SAT.*1 de enero/);
    expect(sePuedeElegir(fijada)).toBe(false);
  });

  it('elegido sin uso: puede cambiarlo', () => {
    expect(resumenDeLaPolitica(politica({})).explicacion).toMatch(/puede cambiarlo/);
    expect(sePuedeElegir(politica({}))).toBe(true);
  });

  it('la fecha centinela del primer método se lee «Desde el inicio»', () => {
    expect(textoDeDesde('2000-01-01')).toBe('Desde el inicio');
    expect(textoDeDesde('2027-01-01')).toBe('Desde el 01/01/2027');
  });

  it('la pregunta nombra el método y avisa que después se fija', () => {
    expect(preguntaDeElegir('peps')).toContain('PEPS');
    expect(preguntaDeElegir('peps')).toContain('autorización de la SAT');
  });

  it('una fila con autorización la muestra con su fecha', () => {
    const texto = detalleDeFila({
      id: '1',
      metodo: 'peps',
      desde: '2027-01-01',
      fijado: true,
      autorizacionSatNumero: '123',
      autorizacionSatFecha: '2026-12-10',
      motivo: 'Cambio de política',
    });
    expect(texto).toBe('Desde el 01/01/2027 · Autorización SAT n.º 123 del 10/12/2026 · Cambio de política');
  });
});
