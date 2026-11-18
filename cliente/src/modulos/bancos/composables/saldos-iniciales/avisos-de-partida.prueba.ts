import { describe, expect, it } from 'vitest';
import { partidaDeEjemplo } from './ejemplos-de-saldos-iniciales';
import { diasEntre, mensajesDeAvisosAlGuardar, mesesEntre, textoDelAvisoDeLaFicha } from './avisos-de-partida';

const dar = (fecha: string) => fecha.split('-').reverse().join('/');
const contexto = { corte: '2026-12-31', dar };

describe('mesesEntre y diasEntre', () => {
  it('cuenta meses cumplidos', () => {
    expect(mesesEntre('2026-01-15', '2026-07-15')).toBe(6);
    expect(mesesEntre('2026-01-15', '2026-07-14')).toBe(5);
    expect(mesesEntre('2025-05-10', '2026-12-31')).toBe(19);
  });

  it('cuenta días, también entre años', () => {
    expect(diasEntre('2026-12-01', '2026-12-31')).toBe(30);
    expect(diasEntre('2026-11-30', '2026-12-31')).toBe(31);
    expect(diasEntre('2025-12-31', '2026-12-31')).toBe(365);
  });
});

describe('textoDelAvisoDeLaFicha', () => {
  it('el cheque antiguo dice los meses reales y el texto del dictamen (art. 508)', () => {
    const cheque = partidaDeEjemplo({ fecha: '2026-04-30', numeroDeCheque: 4501, avisos: ['antiguo'] });
    const texto = textoDelAvisoDeLaFicha('antiguo', cheque, contexto);
    expect(texto).toContain('El cheque 4501 es del 30/04/2026: al 31/12/2026 tiene 8 meses.');
    expect(texto).toContain('ya no está obligado a pagarlo (Código de Comercio, art. 508)');
    expect(texto).not.toContain('puede negarse');
  });

  it('el depósito viejo dice los días al corte', () => {
    const deposito = partidaDeEjemplo({
      parte: 'deposito_en_transito',
      fecha: '2026-11-20',
      avisos: ['deposito_viejo'],
    });
    expect(textoDelAvisoDeLaFicha('deposito_viejo', deposito, contexto)).toContain('tiene 41 días al corte');
  });
});

describe('mensajesDeAvisosAlGuardar', () => {
  const cheque = partidaDeEjemplo({ fecha: '2026-04-30', avisos: ['antiguo'] });

  it('cambia el texto del servidor por el de ley del cliente en cheque antiguo y depósito viejo', () => {
    const [mensaje] = mensajesDeAvisosAlGuardar(
      [{ codigo: 'cheque_antiguo', mensaje: 'Desde los 6 meses el banco puede negarse a pagarlo' }],
      cheque,
      contexto,
    );
    expect(mensaje).toContain('ya no está obligado');
  });

  it('deja tal cual los demás avisos', () => {
    const avisos = [{ codigo: 'no_cuadra', mensaje: 'No cuadra por 5.00' }];
    expect(mensajesDeAvisosAlGuardar(avisos, cheque, contexto)).toEqual(['No cuadra por 5.00']);
  });

  it('sin fecha de corte no puede rehacer el texto: usa el del servidor', () => {
    const avisos = [{ codigo: 'cheque_antiguo', mensaje: 'Texto del servidor' }];
    expect(mensajesDeAvisosAlGuardar(avisos, cheque, { corte: null, dar })).toEqual(['Texto del servidor']);
  });
});
