import { describe, expect, it } from 'vitest';
import { estadoEnTexto } from './movimientos.columnas.js';
import { aFilasExportadasDeSaldos } from './saldos-por-cuenta.columnas.js';
import type { ReporteDeSaldosPorCuentaDto } from '../aplicacion/dto/saldos-por-cuenta.dto.js';

describe('estadoEnTexto (Excel de Movimientos)', () => {
  const normal = { anuladoEn: null, revertidoEn: null, revierteAId: null };

  it('dice lo mismo que la pantalla', () => {
    expect(estadoEnTexto({ ...normal, anuladoEn: '2026-01-01' })).toBe('Anulado');
    expect(estadoEnTexto({ ...normal, revertidoEn: '2026-01-01' })).toBe('Revertido');
    expect(estadoEnTexto({ ...normal, revierteAId: 'x' })).toBe('Reversión');
  });

  it('un movimiento vigente queda vacío', () => {
    expect(estadoEnTexto(normal)).toBeNull();
  });
});

describe('aFilasExportadasDeSaldos', () => {
  const total = { cantidadDeCuentas: 1, saldoEnLibros: '10.00', chequesPosfechados: '0.00', disponible: '10.00' };
  const reporte = {
    cuentas: [],
    bancos: total,
    sobregiros: total,
    nota: 'Una nota',
  } as unknown as ReporteDeSaldosPorCuentaDto;

  it('los totales no traen «Atrasada» y la nota no trae cifras', () => {
    const [totalBancos, , nota] = aFilasExportadasDeSaldos(reporte);

    expect(totalBancos).toMatchObject({ cuenta: 'Total Bancos', atrasada: null, saldoEnLibros: '10.00' });
    expect(nota).toMatchObject({
      cuenta: 'Nota',
      observacion: 'Una nota',
      saldoEnLibros: null,
      chequesPosfechados: null,
      disponible: null,
      atrasada: null,
    });
  });
});
