import { describe, expect, it } from 'vitest';
import { vueltaQueToca, type IntentoHecho } from './horario-de-carga.js';

const GUATEMALA = 'America/Guatemala'; // UTC-6 todo el año
/** Instante a partir de la hora de pared de Guatemala del 18 de noviembre de 2026 (miércoles). */
const enGuatemala = (hora: string, dia = '18'): Date => new Date(`2026-11-${dia}T${hora}:00-06:00`);
const intento = (vuelta: string, hora: string): IntentoHecho => ({ vuelta, iniciadaEn: enGuatemala(hora) });

interface Situacion {
  intentos?: IntentoHecho[];
  hayDolarDeHoy?: boolean;
  hayDolarDeManana?: boolean;
  zona?: string;
}

const toca = (
  hora: string,
  { intentos = [], hayDolarDeHoy = false, hayDolarDeManana = true, zona = GUATEMALA }: Situacion = {},
) => vueltaQueToca({ ahora: enGuatemala(hora), zona, intentos, hayDolarDeHoy, hayDolarDeManana });

describe('vueltaQueToca', () => {
  it('antes de las 06:00 no toca nada', () => {
    expect(toca('05:59')).toBeNull();
  });

  it('a las 06:00 toca la madrugada del dólar', () => {
    expect(toca('06:00')).toBe('madrugada');
    expect(toca('06:14')).toBe('madrugada');
  });

  it('con el dólar de hoy ya guardado no toca la madrugada', () => {
    expect(toca('06:15', { intentos: [intento('madrugada', '06:00')], hayDolarDeHoy: true })).toBeNull();
  });

  it('sin el dólar reintenta en 06:30, 07:00, 08:00, 09:30, 11:00, 13:00, 16:00 y 20:00, y no entre medias', () => {
    const intentos = [intento('madrugada', '06:00')];
    expect(toca('06:15', { intentos })).toBeNull();
    expect(toca('06:30', { intentos })).toBe('madrugada');
    expect(toca('07:00', { intentos: [...intentos, intento('madrugada', '06:30')] })).toBe('madrugada');
    expect(toca('07:45', { intentos: [...intentos, intento('madrugada', '07:02')] })).toBeNull();
    expect(toca('08:00', { intentos: [...intentos, intento('madrugada', '07:02')] })).toBe('madrugada');
    expect(toca('20:00', { intentos: [intento('madrugada', '16:05')] })).toBe('madrugada');
    expect(toca('20:30', { intentos: [intento('madrugada', '20:01'), intento('manana', '09:31')] })).toBeNull();
  });

  it('a las 09:30 toca la vuelta de las demás monedas, una vez al día', () => {
    const dolar = [intento('madrugada', '09:16')];
    expect(toca('09:30', { intentos: dolar, hayDolarDeHoy: true })).toBe('manana');
    expect(toca('09:45', { intentos: [...dolar, intento('manana', '09:30')], hayDolarDeHoy: true })).toBeNull();
  });

  it('de noche toca adelantar el dólar de mañana, una vez', () => {
    const hechas = [intento('manana', '09:31')];
    expect(toca('20:59', { intentos: hechas, hayDolarDeHoy: true })).toBeNull();
    expect(toca('21:00', { intentos: hechas, hayDolarDeHoy: true })).toBe('noche');
    expect(toca('21:15', { intentos: [...hechas, intento('noche', '21:00')], hayDolarDeHoy: true })).toBeNull();
  });

  it('si el dólar de mañana no llegó, la noche lo reintenta a las 22:00 y a las 23:30, y no entre medias', () => {
    const base = { hayDolarDeHoy: true, hayDolarDeManana: false };
    const hechas = [intento('manana', '09:31'), intento('noche', '21:00')];
    expect(toca('21:45', { ...base, intentos: hechas })).toBeNull();
    expect(toca('22:00', { ...base, intentos: hechas })).toBe('dolarDeManana');
    expect(toca('22:15', { ...base, intentos: [...hechas, intento('noche', '22:00')] })).toBeNull();
    expect(toca('23:30', { ...base, intentos: [...hechas, intento('noche', '22:00')] })).toBe('dolarDeManana');
    expect(toca('23:45', { ...base, intentos: [...hechas, intento('noche', '23:30')] })).toBeNull();
  });

  it('no reintenta el dólar de mañana si ya llegó ni antes de que corra la noche', () => {
    const hechas = [intento('manana', '09:31'), intento('noche', '21:00')];
    expect(toca('22:00', { hayDolarDeHoy: true, hayDolarDeManana: true, intentos: hechas })).toBeNull();
    expect(
      toca('22:00', { hayDolarDeHoy: true, hayDolarDeManana: false, intentos: [intento('manana', '09:31')] }),
    ).toBe('noche');
  });

  it('lo hecho ayer no cuenta para hoy', () => {
    const ayer: IntentoHecho = { vuelta: 'manana', iniciadaEn: enGuatemala('09:30', '17') };
    expect(toca('09:30', { intentos: [ayer], hayDolarDeHoy: true })).toBe('manana');
  });

  it('usa la hora de la zona de la instalación, no la del servidor', () => {
    // Las 05:00 de Guatemala son las 06:00 de Bogotá (UTC-5): allí ya toca la madrugada.
    expect(toca('05:00')).toBeNull();
    expect(toca('05:00', { zona: 'America/Bogota' })).toBe('madrugada');
  });

  it('la noche de Guatemala es otro día en UTC pero cuenta como el mismo día local', () => {
    // 21:30 de Guatemala del 18 son las 03:30 UTC del 19.
    const hechas = [intento('manana', '09:31'), intento('noche', '21:00')];
    expect(toca('21:30', { intentos: hechas, hayDolarDeHoy: true })).toBeNull();
  });
});
