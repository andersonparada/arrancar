import { describe, expect, it } from 'vitest';
import { VigenciaDeSesion } from './vigencia-de-sesion.js';

const vigencia = new VigenciaDeSesion(30);
const hoy = new Date('2026-09-27T12:00:00Z');
const enDias = (dias: number) => new Date(hoy.getTime() + dias * 86_400_000);

describe('VigenciaDeSesion', () => {
  it('vence a los días indicados', () => {
    expect(vigencia.vencimientoDesde(hoy)).toEqual(enDias(30));
  });

  it('se renueva cuando ya pasó más de la mitad de su duración', () => {
    expect(vigencia.debeRenovarse(enDias(20), hoy)).toBe(false);
    expect(vigencia.debeRenovarse(enDias(14), hoy)).toBe(true);
  });
});
