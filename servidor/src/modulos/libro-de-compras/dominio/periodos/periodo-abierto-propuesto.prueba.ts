import { describe, expect, it } from 'vitest';
import { periodoAbiertoPropuesto, type DatosDeLaPropuesta } from './periodo-abierto-propuesto.js';

const datos = (cambios: Partial<DatosDeLaPropuesta> = {}): DatosDeLaPropuesta => ({
  tipo: 'factura',
  fechaDeEmision: '2026-09-10',
  fechaDeRecepcion: '2026-09-12',
  conCredito: true,
  bloqueados: [],
  ...cambios,
});

describe('periodo abierto propuesto', () => {
  it('si el período que corresponde está abierto, es ese', () => {
    expect(periodoAbiertoPropuesto(datos())).toEqual({ periodo: '2026-09-01', enPlazo: true });
  });

  it('con el período declarado, el siguiente abierto dentro del art. 20 (emisión más dos meses)', () => {
    const propuesta = periodoAbiertoPropuesto(datos({ bloqueados: ['2026-09-01'] }));

    expect(propuesta).toEqual({ periodo: '2026-10-01', enPlazo: true });
  });

  it('salta los períodos declarados seguidos y llega al último mes con crédito', () => {
    const propuesta = periodoAbiertoPropuesto(datos({ bloqueados: ['2026-09-01', '2026-10-01'] }));

    expect(propuesta).toEqual({ periodo: '2026-11-01', enPlazo: true });
  });

  it('si todos los meses del plazo están declarados, el primero abierto después, fuera de plazo', () => {
    const bloqueados = ['2026-09-01', '2026-10-01', '2026-11-01'];

    expect(periodoAbiertoPropuesto(datos({ bloqueados }))).toEqual({ periodo: '2026-12-01', enPlazo: false });
  });

  it('una empresa sin crédito en el período no tiene plazo que cuidar', () => {
    const bloqueados = ['2026-09-01', '2026-10-01', '2026-11-01'];

    expect(periodoAbiertoPropuesto(datos({ bloqueados, conCredito: false }))).toEqual({
      periodo: '2026-12-01',
      enPlazo: true,
    });
  });

  it('empieza en el mes de recepción cuando es posterior a la emisión', () => {
    const propuesta = periodoAbiertoPropuesto(datos({ fechaDeRecepcion: '2026-10-03', bloqueados: ['2026-10-01'] }));

    expect(propuesta).toEqual({ periodo: '2026-11-01', enPlazo: true });
  });

  it('la nota de débito cuenta el plazo desde su propia emisión', () => {
    const propuesta = periodoAbiertoPropuesto(
      datos({
        tipo: 'nota_de_debito',
        fechaDeEmision: '2026-10-05',
        fechaDeRecepcion: '2026-10-05',
        bloqueados: ['2026-10-01'],
      }),
    );

    expect(propuesta).toEqual({ periodo: '2026-11-01', enPlazo: true });
  });

  it('la nota de crédito no tiene alternativa: va en el mes en que se recibe', () => {
    const propuesta = periodoAbiertoPropuesto(datos({ tipo: 'nota_de_credito', bloqueados: ['2026-09-01'] }));

    expect(propuesta).toEqual({ periodo: null, enPlazo: true });
  });
});
