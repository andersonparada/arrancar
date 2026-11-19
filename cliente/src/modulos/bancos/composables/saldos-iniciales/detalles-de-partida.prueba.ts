import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { partidaDeEjemplo } from './ejemplos-de-saldos-iniciales';
import { detallesDePartida, montoConSigno, tituloDePartida } from './detalles-de-partida';

// Da formato con `formatearFecha` y `formatearMonto`, que leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

describe('tituloDePartida', () => {
  it('el cheque lleva su número y su serie', () => {
    expect(tituloDePartida(partidaDeEjemplo())).toBe('Cheque 4501');
    expect(tituloDePartida(partidaDeEjemplo({ serie: 'B' }))).toBe('Cheque 4501 serie B');
    expect(tituloDePartida(partidaDeEjemplo({ parte: 'cheque_posfechado' }))).toBe('Cheque 4501');
  });

  it('las demás partes dicen qué son; el error del banco, hacia dónde mueve el saldo', () => {
    expect(tituloDePartida(partidaDeEjemplo({ parte: 'deposito_en_transito' }))).toBe('Depósito en tránsito');
    expect(tituloDePartida(partidaDeEjemplo({ parte: 'debito_en_transito' }))).toBe('Débito en tránsito');
    expect(tituloDePartida(partidaDeEjemplo({ parte: 'error_del_banco', tipo: 'credito' }))).toBe(
      'Error del banco que suma',
    );
    expect(tituloDePartida(partidaDeEjemplo({ parte: 'error_del_banco', tipo: 'debito' }))).toBe(
      'Error del banco que resta',
    );
  });
});

describe('detallesDePartida', () => {
  it('solo muestra lo que la partida tiene', () => {
    const etiquetas = detallesDePartida(partidaDeEjemplo()).map((detalle) => detalle.etiqueta);
    expect(etiquetas).toEqual(['Fecha', 'Beneficiario']);
  });

  it('el depósito dice «Origen», el posfechado trae su concepto y el error, su descripción', () => {
    const deposito = detallesDePartida(partidaDeEjemplo({ parte: 'deposito_en_transito', beneficiario: 'Cliente' }));
    expect(deposito.map((d) => d.etiqueta)).toContain('Origen');
    const posfechado = detallesDePartida(
      partidaDeEjemplo({ parte: 'cheque_posfechado', conceptoNombre: 'Pago de servicios' }),
    );
    expect(posfechado.find((d) => d.etiqueta === 'Concepto')?.valor).toBe('Pago de servicios');
    const error = detallesDePartida(partidaDeEjemplo({ parte: 'error_del_banco', observaciones: 'Cargó dos veces' }));
    expect(error.find((d) => d.etiqueta === 'Descripción')?.valor).toBe('Cargó dos veces');
  });
});

describe('montoConSigno', () => {
  it('solo el error del banco muestra el signo con que entra', () => {
    expect(montoConSigno(partidaDeEjemplo({ monto: '10.00' }))).not.toMatch(/^[+−]/);
    expect(montoConSigno(partidaDeEjemplo({ parte: 'error_del_banco', tipo: 'credito', monto: '10.00' }))).toMatch(
      /^\+ /,
    );
    expect(montoConSigno(partidaDeEjemplo({ parte: 'error_del_banco', tipo: 'debito', monto: '10.00' }))).toMatch(
      /^− /,
    );
  });
});
