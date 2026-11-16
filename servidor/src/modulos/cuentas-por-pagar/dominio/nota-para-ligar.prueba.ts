import { describe, expect, it } from 'vitest';
import {
  disponibleDeLaNota,
  exigirFechaDeLaAplicacion,
  exigirNotaLigable,
  exigirQueCabeEnLaNota,
  nombreDeLaNota,
  type NotaParaLigar,
} from './nota-para-ligar.js';
import { avisoDeNotaDeAnioAnterior } from './avisos-de-pagos.js';

const nota = (cambios: Partial<NotaParaLigar> = {}): NotaParaLigar => ({
  movimientoId: 'n-1',
  cuentaBancariaId: 'c-1',
  fecha: '2026-11-01',
  montoCentavos: 100_000,
  numero: 7,
  beneficiario: null,
  ligable: true,
  ...cambios,
});

describe('una nota que se puede ligar', () => {
  it('existe, es de débito, está vigente y marcada', () => {
    expect(() => exigirNotaLigable(nota())).not.toThrow();
  });

  it('una nota que no existe o no es ligable se rechaza con el mismo error', () => {
    for (const rechazada of [null, nota({ ligable: false })]) {
      expect(() => exigirNotaLigable(rechazada)).toThrowError(
        expect.objectContaining({ codigo: 'movimiento_no_ligable' }),
      );
    }
  });

  it('el disponible es el monto menos lo que ligan los pagos vigentes y un pago no pasa de él', () => {
    expect(disponibleDeLaNota(100_000, 60_000)).toBe(40_000);
    expect(() => exigirQueCabeEnLaNota(nota(), { disponibleCentavos: 40_000, montoCentavos: 40_000 })).not.toThrow();
    expect(() => exigirQueCabeEnLaNota(nota(), { disponibleCentavos: 40_000, montoCentavos: 40_001 })).toThrowError(
      'A la nota N° 7 solo le quedan Q400.00 por aplicar.',
    );
    expect(nombreDeLaNota(nota({ numero: null }))).toBe('sin número');
  });
});

describe('la fecha de aplicar la nota', () => {
  const limites = { minima: '2026-11-01', hoy: '2026-11-15' };

  it('puede ser la mínima, hoy o cualquier día entre las dos', () => {
    for (const fecha of ['2026-11-01', '2026-11-10', '2026-11-15']) {
      expect(() => exigirFechaDeLaAplicacion(fecha, limites)).not.toThrow();
    }
  });

  it('no puede ser futura ni anterior a la mínima', () => {
    for (const fecha of ['2026-10-31', '2026-11-16']) {
      expect(() => exigirFechaDeLaAplicacion(fecha, limites)).toThrowError(
        expect.objectContaining({ codigo: 'fecha_de_pago_invalida' }),
      );
    }
  });
});

describe('el aviso de una nota de otro año', () => {
  it('avisa solo si el año de la nota es anterior al de la aplicación', () => {
    expect(avisoDeNotaDeAnioAnterior('2026-12-20', '2027-01-05')[0]).toContain('de otro año');
    expect(avisoDeNotaDeAnioAnterior('2026-01-05', '2026-12-31')).toEqual([]);
  });
});
