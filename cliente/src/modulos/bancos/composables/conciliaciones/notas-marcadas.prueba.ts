import { describe, expect, it } from 'vitest';
import { finDelMesDeConciliacion, notasMarcadasDeLaConciliacion, resumenDeNotasMarcadas } from './notas-marcadas';

const nota = (id: string, fecha: string, extra: { marcada?: boolean; puede?: boolean } = {}) => ({
  id,
  fecha,
  marcadaParaModulo: (extra.marcada ?? true) ? 'cuentas-por-pagar' : null,
  puedeDesmarcar: extra.puede ?? true,
});

describe('finDelMesDeConciliacion', () => {
  it('da el último día, también en febrero bisiesto', () => {
    expect(finDelMesDeConciliacion({ anio: 2026, mes: 11 })).toBe('2026-11-30');
    expect(finDelMesDeConciliacion({ anio: 2028, mes: 2 })).toBe('2028-02-29');
    expect(finDelMesDeConciliacion({ anio: 2026, mes: 12 })).toBe('2026-12-31');
  });
});

describe('notasMarcadasDeLaConciliacion', () => {
  it('no incluye las marcadas para Cuentas por cobrar', () => {
    const deCobrar = { ...nota('c', '2026-11-03'), marcadaParaModulo: 'cuentas-por-cobrar' };

    expect(notasMarcadasDeLaConciliacion([deCobrar], [{ id: 'c' }])).toEqual([]);
  });

  it('deja las marcadas que se pueden desmarcar y son candidatas, por fecha', () => {
    const notas = [
      nota('b', '2026-11-20'),
      nota('a', '2026-11-03'),
      nota('sin-marca', '2026-11-05', { marcada: false }),
      nota('no-se-puede', '2026-11-06', { puede: false }),
      nota('de-otro-mes', '2026-10-06'),
    ];
    const candidatos = [{ id: 'a' }, { id: 'b' }, { id: 'sin-marca' }, { id: 'no-se-puede' }];
    expect(notasMarcadasDeLaConciliacion(notas, candidatos).map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('sin notas devuelve vacío', () => {
    expect(notasMarcadasDeLaConciliacion([], [{ id: 'a' }])).toEqual([]);
  });
});

describe('resumenDeNotasMarcadas', () => {
  it('singular y plural', () => {
    expect(resumenDeNotasMarcadas(1)).toContain('1 nota marcada');
    expect(resumenDeNotasMarcadas(3)).toContain('3 notas marcadas');
  });
});
