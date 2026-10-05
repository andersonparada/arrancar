import { describe, expect, it, vi } from 'vitest';
import { CalendarioLaboral } from './calendario-laboral.js';
import type { AsuetoDto } from './puertos/asuetos.js';

function calendarioCon(...fechas: string[]) {
  const delAnio = vi.fn(async (anio: number): Promise<AsuetoDto[]> =>
    fechas
      .filter((fecha) => fecha.startsWith(String(anio)))
      .map((fecha) => ({ id: fecha, fecha, nombre: 'Asueto', origen: 'asueto_sat' })),
  );
  return { calendario: new CalendarioLaboral({ delAnio }), delAnio };
}

describe('esHabil', () => {
  it('el 20 de octubre de 2026 (martes feriado) no es hábil', async () => {
    expect(await calendarioCon().calendario.esHabil('2026-10-20')).toBe(false);
  });

  it('un martes común es hábil y el fin de semana no', async () => {
    const { calendario } = calendarioCon();

    expect(await calendario.esHabil('2026-10-06')).toBe(true);
    expect(await calendario.esHabil('2026-10-10')).toBe(false);
    expect(await calendario.esHabil('2026-10-11')).toBe(false);
  });

  it('Jueves y Viernes Santo de 2026 no son hábiles', async () => {
    const { calendario } = calendarioCon();

    expect(await calendario.esHabil('2026-04-02')).toBe(false);
    expect(await calendario.esHabil('2026-04-03')).toBe(false);
    expect(await calendario.esHabil('2026-04-06')).toBe(true);
  });

  it('Semana Santa de 2024 y 2025 (Pascua el 31 de marzo y el 20 de abril)', async () => {
    const { calendario } = calendarioCon();

    expect(await calendario.esHabil('2024-03-28')).toBe(false);
    expect(await calendario.esHabil('2024-03-29')).toBe(false);
    expect(await calendario.esHabil('2025-04-17')).toBe(false);
    expect(await calendario.esHabil('2025-04-18')).toBe(false);
  });

  it('los medios días (24 y 31 de diciembre) cuentan como hábiles', async () => {
    const { calendario } = calendarioCon();

    expect(await calendario.esHabil('2026-12-24')).toBe(true);
    expect(await calendario.esHabil('2026-12-31')).toBe(true);
    expect(await calendario.esHabil('2026-12-25')).toBe(false);
  });

  it('un asueto guardado no es hábil', async () => {
    const { calendario } = calendarioCon('2026-10-07');

    expect(await calendario.esHabil('2026-10-07')).toBe(false);
  });

  it('rechaza una fecha que no existe', async () => {
    await expect(calendarioCon().calendario.esHabil('2026-02-31')).rejects.toThrow(/fecha válida/);
  });
});

describe('sumarDiasHabiles', () => {
  it('salta el fin de semana y el feriado', async () => {
    const { calendario } = calendarioCon();

    expect(await calendario.sumarDiasHabiles('2026-10-16', 1)).toBe('2026-10-19');
    expect(await calendario.sumarDiasHabiles('2026-10-19', 1)).toBe('2026-10-21');
  });

  it('con 0 devuelve la misma fecha', async () => {
    expect(await calendarioCon().calendario.sumarDiasHabiles('2026-10-10', 0)).toBe('2026-10-10');
  });

  it('cruza el fin de año', async () => {
    const { calendario } = calendarioCon();

    expect(await calendario.sumarDiasHabiles('2026-12-23', 6)).toBe('2027-01-04');
  });

  it('rechaza cantidades negativas o con decimales', async () => {
    const { calendario } = calendarioCon();

    await expect(calendario.sumarDiasHabiles('2026-10-05', -1)).rejects.toThrow(/entero/);
    await expect(calendario.sumarDiasHabiles('2026-10-05', 1.5)).rejects.toThrow(/entero/);
  });
});

describe('diaHabilNumero', () => {
  it('el día hábil 15 de octubre de 2026 es el jueves 22 (el 20 es feriado)', async () => {
    expect(await calendarioCon().calendario.diaHabilNumero('2026-10', 15)).toBe('2026-10-22');
  });

  it('el primer día hábil de octubre de 2026 es el jueves 1', async () => {
    expect(await calendarioCon().calendario.diaHabilNumero('2026-10', 1)).toBe('2026-10-01');
  });

  it('el primer día hábil de noviembre de 2026 es el lunes 2 (el 1 es feriado y domingo)', async () => {
    expect(await calendarioCon().calendario.diaHabilNumero('2026-11', 1)).toBe('2026-11-02');
  });

  it('falla si el mes no tiene tantos días hábiles o el mes es inválido', async () => {
    const { calendario } = calendarioCon();

    await expect(calendario.diaHabilNumero('2026-10', 30)).rejects.toThrow(/día hábil número 30/);
    await expect(calendario.diaHabilNumero('2026-10', 0)).rejects.toThrow(/día hábil número 0/);
    await expect(calendario.diaHabilNumero('octubre', 3)).rejects.toThrow(/día hábil/);
  });
});

describe('caché por año', () => {
  it('consulta la base una sola vez por año', async () => {
    const { calendario, delAnio } = calendarioCon();

    await calendario.esHabil('2026-10-06');
    await calendario.esHabil('2026-10-07');
    await calendario.esHabil('2027-01-05');

    expect(delAnio).toHaveBeenCalledTimes(2);
  });

  it('invalidar vuelve a leer los asuetos del año', async () => {
    const { calendario, delAnio } = calendarioCon();

    await calendario.esHabil('2026-10-06');
    calendario.invalidar(2026);
    await calendario.esHabil('2026-10-06');

    expect(delAnio).toHaveBeenCalledTimes(2);
  });

  it('si falla la lectura, no guarda el fallo', async () => {
    const delAnio = vi.fn().mockRejectedValueOnce(new Error('caído')).mockResolvedValue([]);
    const calendario = new CalendarioLaboral({ delAnio });

    await expect(calendario.esHabil('2026-10-06')).rejects.toThrow('caído');
    expect(await calendario.esHabil('2026-10-06')).toBe(true);
  });
});
