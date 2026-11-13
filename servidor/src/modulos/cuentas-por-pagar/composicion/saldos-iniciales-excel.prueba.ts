import { describe, expect, it } from 'vitest';
import type { SaldoInicialDto } from '../aplicacion/dto/saldo-inicial.dto.js';
import type { SaldoInicialSolicitado } from '../http/saldos-iniciales.esquemas-http.js';
import { avisoDelVencimientoPropuesto } from './saldos-iniciales-excel.js';

const solicitud = (vencimiento: string | null) => ({ vencimiento }) as SaldoInicialSolicitado;
const creado = (vencimiento: string | null) => ({ vencimiento }) as SaldoInicialDto;

describe('aviso del vencimiento propuesto en el ensayo del Excel', () => {
  it('si la fila no trae vencimiento y el sistema propuso uno, lo dice en la columna Vencimiento', () => {
    const aviso = avisoDelVencimientoPropuesto(solicitud(null), creado('2026-01-15'));

    expect(aviso?.campo).toBe('vencimiento');
    expect(aviso?.mensaje).toContain('15/01/2026');
  });

  it('si la fila trae vencimiento, o es una nota de crédito (sin vencimiento), no avisa', () => {
    expect(avisoDelVencimientoPropuesto(solicitud('2026-02-01'), creado('2026-02-01'))).toBeNull();
    expect(avisoDelVencimientoPropuesto(solicitud(null), creado(null))).toBeNull();
  });
});
