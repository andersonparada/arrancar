import { describe, expect, it } from 'vitest';
import { partidaDeEjemplo } from './ejemplos-de-saldos-iniciales';
import { agruparPartidas, insigniasDePartida } from './grupos-de-partidas';

describe('agruparPartidas', () => {
  it('siempre devuelve los cinco grupos, el posfechado al final y fuera de la fórmula', () => {
    const grupos = agruparPartidas([]);
    expect(grupos.map((grupo) => grupo.parte)).toEqual([
      'cheque_en_circulacion',
      'deposito_en_transito',
      'debito_en_transito',
      'error_del_banco',
      'cheque_posfechado',
    ]);
    expect(grupos.filter((grupo) => grupo.fueraDeLaFormula).map((grupo) => grupo.parte)).toEqual(['cheque_posfechado']);
    expect(grupos.every((grupo) => grupo.total === '0.00')).toBe(true);
  });

  it('reparte por parte, ordena por fecha y luego por número, y suma sin pasar a decimales', () => {
    const grupos = agruparPartidas([
      partidaDeEjemplo({ movimientoId: 'b', fecha: '2026-12-20', numeroDeCheque: 12, monto: '0.20' }),
      partidaDeEjemplo({ movimientoId: 'a', fecha: '2026-12-20', numeroDeCheque: 11, monto: '0.10' }),
      partidaDeEjemplo({ movimientoId: 'c', fecha: '2026-12-01', numeroDeCheque: 99, monto: '5.00' }),
      partidaDeEjemplo({ movimientoId: 'd', parte: 'deposito_en_transito', tipo: 'credito', monto: '40.00' }),
    ]);
    expect(grupos[0]?.partidas.map((partida) => partida.movimientoId)).toEqual(['c', 'a', 'b']);
    expect(grupos[0]?.total).toBe('5.30');
    expect(grupos[1]?.total).toBe('40.00');
  });

  it('las anuladas se listan pero no suman', () => {
    const [cheques] = agruparPartidas([
      partidaDeEjemplo({ movimientoId: 'a', monto: '100.00' }),
      partidaDeEjemplo({ movimientoId: 'b', monto: '50.00', anulada: true }),
    ]);
    expect(cheques?.partidas).toHaveLength(2);
    expect(cheques?.total).toBe('100.00');
  });

  it('en el error del banco el sentido decide el signo del total', () => {
    const grupos = agruparPartidas([
      partidaDeEjemplo({ movimientoId: 'a', parte: 'error_del_banco', tipo: 'credito', monto: '30.00' }),
      partidaDeEjemplo({ movimientoId: 'b', parte: 'error_del_banco', tipo: 'debito', monto: '80.00' }),
    ]);
    expect(grupos[3]?.total).toBe('-50.00');
  });
});

describe('insigniasDePartida', () => {
  it('no pone ninguna a una partida limpia', () => {
    expect(insigniasDePartida(partidaDeEjemplo())).toEqual([]);
  });

  it('marca conciliada con mes y año, anulada y los avisos del servidor', () => {
    const textos = insigniasDePartida(
      partidaDeEjemplo({
        conciliadaEn: { anio: 2027, mes: 1 },
        revertida: true,
        avisos: ['antiguo', 'deposito_viejo'],
      }),
    ).map((insignia) => insignia.texto);
    expect(textos).toEqual(['Conciliado 01/2027', 'Anulado', 'Antiguo', 'Revisar']);
  });
});
