import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import {
  VigenciaDeCombustible,
  VigenciaDeCombustibleEnUso,
  VigenciaDeCombustibleInvalido,
  aCentesimas,
  diaAnterior,
  type DatosDeVigenciaDeCombustible,
} from './vigencia-de-combustible.js';

const empresa = Identificador.desde<'Empresa'>('11111111-1111-4111-8111-111111111111');

const datos = (cambios: Partial<DatosDeVigenciaDeCombustible> = {}): DatosDeVigenciaDeCombustible => ({
  combustibleId: '22222222-2222-4222-8222-222222222222',
  idpPorGalon: '4.70',
  porcentajeDeEtanol: '10',
  vigenteDesde: '2026-01-01',
  vigenteHasta: null,
  ...cambios,
});

const crear = (cambios: Partial<DatosDeVigenciaDeCombustible> = {}) =>
  VigenciaDeCombustible.crear(empresa, datos(cambios));

describe('fechas y centésimas', () => {
  it('el día anterior cruza meses y años, y respeta los bisiestos', () => {
    expect(diaAnterior('2026-03-01')).toBe('2026-02-28');
    expect(diaAnterior('2028-03-01')).toBe('2028-02-29');
    expect(diaAnterior('2026-01-01')).toBe('2025-12-31');
  });

  it('convierte a centésimas enteras sin decimales flotantes', () => {
    expect(aCentesimas('4.7')).toBe(470);
    expect(aCentesimas('4.70')).toBe(470);
    expect(aCentesimas('0.10')).toBe(10);
    expect(aCentesimas('-1')).toBeNull();
    expect(aCentesimas('1.234')).toBeNull();
    expect(aCentesimas('abc')).toBeNull();
  });
});

describe('VigenciaDeCombustible', () => {
  it('acepta la tasa cero (exención temporal) y el etanol en sus extremos', () => {
    expect(() => crear({ idpPorGalon: '0', porcentajeDeEtanol: '0' })).not.toThrow();
    expect(() => crear({ porcentajeDeEtanol: '100.00' })).not.toThrow();
  });

  it.each([
    ['tasa negativa', { idpPorGalon: '-0.01' }],
    ['tasa con letras', { idpPorGalon: 'cinco' }],
    ['etanol sobre 100', { porcentajeDeEtanol: '100.01' }],
    ['fecha inexistente', { vigenteDesde: '2026-02-30' }],
    ['cierre anterior al inicio', { vigenteDesde: '2026-02-01', vigenteHasta: '2026-01-31' }],
  ])('rechaza %s', (_caso, cambios) => {
    expect(() => crear(cambios)).toThrow(VigenciaDeCombustibleInvalido);
  });

  it('un solo día de vigencia es válido (desde igual a hasta)', () => {
    expect(() => crear({ vigenteDesde: '2026-02-01', vigenteHasta: '2026-02-01' })).not.toThrow();
  });

  it('se cierra el día anterior al inicio de la siguiente', () => {
    const vigencia = crear();

    vigencia.cerrarAntesDe('2026-03-01', null);

    expect(vigencia.instantanea().vigenteHasta).toBe('2026-02-28');
    expect(vigencia.estaAbierta()).toBe(false);
  });

  it('no cambia de combustible', () => {
    const vigencia = crear();

    const cambio = () => vigencia.cambiarDatos(datos({ combustibleId: '33333333-3333-4333-8333-333333333333' }), null);

    expect(cambio).toThrow(VigenciaDeCombustibleInvalido);
  });

  it('detecta cuándo un cambio es una corrección (tasa, etanol o fechas), sin fijarse en ceros de más', () => {
    const vigencia = crear();

    expect(vigencia.seCorrigeCon(datos({ idpPorGalon: '4.7', porcentajeDeEtanol: '10.00' }))).toBe(false);
    expect(vigencia.seCorrigeCon(datos({ idpPorGalon: '4.80' }))).toBe(true);
    expect(vigencia.seCorrigeCon(datos({ porcentajeDeEtanol: '5' }))).toBe(true);
    expect(vigencia.seCorrigeCon(datos({ vigenteHasta: '2026-12-31' }))).toBe(true);
  });

  describe('usada por documentos', () => {
    const uso = { ultimaFechaDeEmision: '2026-02-15' };

    it('conserva su tasa, su etanol y su inicio', () => {
      const vigencia = crear();

      expect(() => vigencia.cambiarDatos(datos({ idpPorGalon: '5.00' }), uso)).toThrow(VigenciaDeCombustibleEnUso);
      expect(() => vigencia.cambiarDatos(datos({ porcentajeDeEtanol: '0' }), uso)).toThrow(VigenciaDeCombustibleEnUso);
      expect(() => vigencia.cambiarDatos(datos({ vigenteDesde: '2026-01-02' }), uso)).toThrow(
        VigenciaDeCombustibleEnUso,
      );
    });

    it('se cierra en o después de la última emisión, no antes', () => {
      const vigencia = crear();

      expect(() => vigencia.cambiarDatos(datos({ vigenteHasta: '2026-02-14' }), uso)).toThrow(
        VigenciaDeCombustibleEnUso,
      );
      vigencia.cambiarDatos(datos({ vigenteHasta: '2026-02-15' }), uso);

      expect(vigencia.instantanea().vigenteHasta).toBe('2026-02-15');
    });

    it('la vigencia siguiente no puede cerrarla antes de su última emisión', () => {
      const vigencia = crear();

      expect(() => vigencia.cerrarAntesDe('2026-02-15', uso)).toThrow(VigenciaDeCombustibleEnUso);
      expect(() => vigencia.cerrarAntesDe('2026-02-16', uso)).not.toThrow();
    });
  });
});
