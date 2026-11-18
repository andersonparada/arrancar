import { describe, expect, it } from 'vitest';
import type { BalanceDeApertura, CargaInicial } from '../servicios/cierre-de-carga.tipos';
import { accionesDelBalance, problemaDelBalance } from './balance-de-apertura';

const balance: BalanceDeApertura = {
  tamanoBytes: 1000,
  paginas: 2,
  sha256: 'a'.repeat(64),
  nombreOriginal: 'balance.pdf',
  subidoEn: '2026-11-18T10:00:00Z',
  subidoPorNombre: 'Ana',
};
const carga = (cambios: Partial<CargaInicial> = {}): CargaInicial => ({
  empresaId: 'e1',
  fechaDeInicio: '2026-01-01',
  cerrada: false,
  cerradaEn: null,
  cerradaPor: null,
  ultimoCierre: null,
  balanceDeApertura: null,
  ...cambios,
});

describe('accionesDelBalance', () => {
  it('abierta y sin balance: se puede adjuntar, no quitar', () => {
    expect(accionesDelBalance(carga())).toMatchObject({
      puedeSubir: true,
      textoDeSubir: 'Adjuntar balance de apertura',
      puedeQuitar: false,
      nota: null,
    });
  });

  it('abierta y con balance: se puede reemplazar y quitar', () => {
    expect(accionesDelBalance(carga({ balanceDeApertura: balance }))).toMatchObject({
      puedeSubir: true,
      textoDeSubir: 'Reemplazar balance',
      puedeQuitar: true,
    });
  });

  it('cerrada y sin balance: solo se puede adjuntar', () => {
    expect(accionesDelBalance(carga({ cerrada: true }))).toMatchObject({ puedeSubir: true, puedeQuitar: false });
  });

  it('cerrada y con balance: ni reemplazar ni quitar, y dice cómo cambiarlo', () => {
    const acciones = accionesDelBalance(carga({ cerrada: true, balanceDeApertura: balance }));
    expect(acciones).toMatchObject({ puedeSubir: false, puedeQuitar: false });
    expect(acciones.nota).toContain('reabra la carga');
  });

  it('sin fecha de inicio guardada no hay dónde adjuntarlo', () => {
    expect(accionesDelBalance(carga({ fechaDeInicio: null }))).toMatchObject({ puedeSubir: false });
    expect(accionesDelBalance(null).nota).toContain('fecha de inicio');
  });
});

describe('problemaDelBalance', () => {
  it('solo acepta PDF', () => {
    expect(problemaDelBalance({ type: 'application/pdf', size: 5000, name: 'b.pdf' })).toBeNull();
    expect(problemaDelBalance({ type: 'image/jpeg', size: 5000, name: 'b.jpg' })).toContain('escanéelo como PDF');
  });
});
