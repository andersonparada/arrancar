import { describe, expect, it } from 'vitest';
import { CalendarioDeLunesAViernes, type CalendarioLaboral } from '../calendario-laboral.js';
import { REGLAS_DE_RETENCION } from '../retencion-propuesta.js';
import {
  GRUPO_DE_ENTERO,
  GRUPOS_DE_ENTERO,
  grupoDeEnteroValido,
  mesDeLaRetencion,
  plazoDelGrupo,
  type GrupoDeEntero,
} from './grupo-de-entero.js';

const lunesAViernes = new CalendarioDeLunesAViernes();
const sinElDiaDeLaRevolucion: CalendarioLaboral = {
  esHabil: (fecha) => fecha !== '2026-10-20' && lunesAViernes.esHabil(fecha),
};

const plazo = (mes: string, grupo: GrupoDeEntero, calendario: CalendarioLaboral = lunesAViernes) =>
  plazoDelGrupo({ mes, grupo, diasHabilesIva: 15, diasHabilesIsr: 10, calendario });

describe('grupos de entero', () => {
  it('cada regla del check de la tabla tiene su grupo y ningún grupo queda vacío', () => {
    for (const regla of REGLAS_DE_RETENCION) expect(GRUPOS_DE_ENTERO).toContain(GRUPO_DE_ENTERO[regla]);
    expect(Object.keys(GRUPO_DE_ENTERO).sort()).toEqual([...REGLAS_DE_RETENCION].sort());
    for (const grupo of GRUPOS_DE_ENTERO) expect(Object.values(GRUPO_DE_ENTERO)).toContain(grupo);
  });

  it('agrupa el IVA de los agentes y el 5 % del pequeño contribuyente, y separa lo de la factura especial', () => {
    expect(GRUPO_DE_ENTERO.iva_pequeno_contribuyente).toBe('iva_agentes');
    expect(GRUPO_DE_ENTERO.iva_exportador).toBe('iva_agentes');
    expect(GRUPO_DE_ENTERO.isr_opcional_simplificado).toBe('isr_opcional');
    expect(GRUPO_DE_ENTERO.iva_factura_especial).toBe('iva_factura_especial');
    expect(GRUPO_DE_ENTERO.isr_factura_especial).toBe('isr_factura_especial');
  });

  it('conoce un grupo por su texto', () => {
    expect(grupoDeEnteroValido('isr_opcional')).toBe('isr_opcional');
    expect(grupoDeEnteroValido('otro')).toBeNull();
  });

  it('el mes de una retención es el primer día del mes de su fecha', () => {
    expect(mesDeLaRetencion('2026-09-15')).toBe('2026-09-01');
  });
});

describe('plazo de entero por mes y grupo', () => {
  it('el IVA de agentes vence el día hábil 15 del mes siguiente y el ISR el 10', () => {
    expect(plazo('2026-09-01', 'iva_agentes')).toBe('2026-10-21');
    expect(plazo('2026-09-01', 'isr_opcional')).toBe('2026-10-14');
    expect(plazo('2026-09-01', 'isr_factura_especial')).toBe('2026-10-14');
  });

  it('el IVA de la factura especial vence el último día hábil del mes siguiente', () => {
    expect(plazo('2026-09-01', 'iva_factura_especial')).toBe('2026-10-30');
  });

  it('un feriado del calendario alarga el plazo un día', () => {
    expect(plazo('2026-09-01', 'iva_agentes', sinElDiaDeLaRevolucion)).toBe('2026-10-22');
  });
});
