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
  it('los montos llevan quetzales y los decimales configurados, nunca menos de dos', () => {
    const conCuatro = new FormatoRegional({ ...AJUSTES_REGIONALES_PREDETERMINADOS, decimalesMontos: 4 });
    const sinCentavos = new FormatoRegional({ ...AJUSTES_REGIONALES_PREDETERMINADOS, decimalesMontos: 0 });

    expect(guatemala.monto('1250.5')).toMatch(/^Q\s?1,250\.50$/);
    expect(conCuatro.monto('4.7')).toMatch(/^Q\s?4\.7000$/);
    expect(sinCentavos.monto('4.70')).toMatch(/^Q\s?4\.70$/);
  });

  it('las cantidades de inventario llevan de 2 a 4 decimales', () => {
    expect(guatemala.cantidadDeInventario('24.00000000', 'kg')).toBe('24.00 kg');
    expect(guatemala.cantidadDeInventario('0.5')).toBe('0.50');
    expect(guatemala.cantidadDeInventario('0.00026')).toBe('0.0003');
    expect(guatemala.cantidadDeInventario(null)).toBe('—');
  });

  it('el costo unitario conserva hasta 6 decimales', () => {
    expect(guatemala.costoUnitario('12.5')).toMatch(/^Q\s?12\.50$/);
    expect(guatemala.costoUnitario('0.123456')).toMatch(/^Q\s?0\.123456$/);
    expect(guatemala.costoUnitario('')).toBe('—');
  });

  it('las cantidades pueden llevar su unidad', () => {
    expect(guatemala.cantidad(12.5, 'qq')).toBe('12.50 qq');
    expect(new FormatoRegional({ ...AJUSTES_REGIONALES_PREDETERMINADOS, decimalesCantidades: 0 }).cantidad(40)).toBe(
      '40.00',
    );
  });

  it('un valor vacío o que no es número muestra una raya', () => {
    expect(guatemala.monto('')).toBe('—');
    expect(guatemala.cantidad('abc')).toBe('—');
  });
});
