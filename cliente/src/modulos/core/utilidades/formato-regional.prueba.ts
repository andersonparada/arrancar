import { describe, expect, it } from 'vitest';
import { AJUSTES_REGIONALES_PREDETERMINADOS, FormatoRegional } from './formato-regional';

const guatemala = new FormatoRegional(AJUSTES_REGIONALES_PREDETERMINADOS);

describe('fechas', () => {
  it('se muestran como dd/mm/aaaa por omisión', () => {
    expect(guatemala.fecha('2026-09-07T15:00:00Z')).toBe('07/09/2026');
  });

  it('usan el día de la zona horaria de la empresa, no el del servidor', () => {
    expect(guatemala.fecha('2026-09-08T03:00:00Z')).toBe('07/09/2026');
  });

  it('una fecha sin hora es ese día, sin correrla por la zona horaria', () => {
    expect(guatemala.fecha('2026-01-15')).toBe('15/01/2026');
  });

  it('respetan el formato elegido', () => {
    const iso = new FormatoRegional({ ...AJUSTES_REGIONALES_PREDETERMINADOS, formatoFecha: 'aaaa-mm-dd' });

    expect(iso.fecha('2026-09-07T15:00:00Z')).toBe('2026-09-07');
  });

  it('sin valor muestran una raya', () => {
    expect(guatemala.fecha(null)).toBe('—');
    expect(guatemala.fechaHora(undefined)).toBe('—');
  });

  it('con hora agregan la hora local después de la fecha', () => {
    expect(guatemala.fechaHora('2026-09-07T15:30:00Z')).toMatch(/^07\/09\/2026 9:30/);
  });
});

describe('números', () => {
  it('los montos llevan quetzales y los decimales configurados', () => {
    const sinCentavos = new FormatoRegional({ ...AJUSTES_REGIONALES_PREDETERMINADOS, decimalesMontos: 0 });

    expect(guatemala.monto('1250.5')).toMatch(/^Q\s?1,250\.50$/);
    expect(sinCentavos.monto(1250.5)).toMatch(/^Q\s?1,251$/);
  });

  it('las cantidades pueden llevar su unidad', () => {
    expect(guatemala.cantidad(12.5, 'qq')).toBe('12.50 qq');
    expect(new FormatoRegional({ ...AJUSTES_REGIONALES_PREDETERMINADOS, decimalesCantidades: 0 }).cantidad(40)).toBe(
      '40',
    );
  });

  it('un valor vacío o que no es número muestra una raya', () => {
    expect(guatemala.monto('')).toBe('—');
    expect(guatemala.cantidad('abc')).toBe('—');
  });
});
