import { describe, expect, it } from 'vitest';
import { partidaDeEjemplo } from './ejemplos-de-saldos-iniciales';
import {
  datosDePartida,
  edicionDePartida,
  edicionNuevaDePartida,
  esParteDeCheque,
  rotuloDelBeneficiario,
  tituloDeLaVentanaDePartida,
} from './edicion-de-partida';

describe('edicionNuevaDePartida', () => {
  it('propone la fecha de corte, salvo en el posfechado (que debe ser posterior)', () => {
    expect(edicionNuevaDePartida('cheque_en_circulacion', '2026-12-31').fecha).toBe('2026-12-31');
    expect(edicionNuevaDePartida('deposito_en_transito', '2026-12-31').fecha).toBe('2026-12-31');
    expect(edicionNuevaDePartida('cheque_posfechado', '2026-12-31').fecha).toBe('');
  });

  it('sin fecha de corte empieza vacía', () => {
    expect(edicionNuevaDePartida('cheque_en_circulacion', null).fecha).toBe('');
  });
});

describe('datosDePartida', () => {
  it('el cheque manda serie y número; lo vacío va como null', () => {
    const edicion = {
      ...edicionNuevaDePartida('cheque_en_circulacion', '2026-12-31'),
      monto: '1200.00',
      numeroDeCheque: '4501',
      serie: '  ',
      beneficiario: 'Ferretería',
    };
    expect(datosDePartida(edicion)).toEqual({
      fecha: '2026-12-31',
      monto: '1200.00',
      sentido: null,
      conceptoId: null,
      serie: null,
      numeroDeCheque: 4501,
      beneficiario: 'Ferretería',
      referencia: null,
      observaciones: null,
    });
  });

  it('el sentido solo viaja en el error del banco', () => {
    const error = { ...edicionNuevaDePartida('error_del_banco', '2026-12-31'), sentido: 'debito' as const };
    expect(datosDePartida(error).sentido).toBe('debito');
    const deposito = { ...edicionNuevaDePartida('deposito_en_transito', '2026-12-31'), sentido: 'debito' as const };
    expect(datosDePartida(deposito).sentido).toBeNull();
  });

  it('el concepto solo viaja en el posfechado', () => {
    const posfechado = { ...edicionNuevaDePartida('cheque_posfechado', null), conceptoId: 'concepto-1' };
    expect(datosDePartida(posfechado).conceptoId).toBe('concepto-1');
    const cheque = { ...edicionNuevaDePartida('cheque_en_circulacion', null), conceptoId: 'concepto-1' };
    expect(datosDePartida(cheque).conceptoId).toBeNull();
  });

  it('serie y número no viajan fuera de los cheques', () => {
    const deposito = { ...edicionNuevaDePartida('deposito_en_transito', null), serie: 'A', numeroDeCheque: '12' };
    const datos = datosDePartida(deposito);
    expect(datos.serie).toBeNull();
    expect(datos.numeroDeCheque).toBeNull();
  });
});

describe('edicionDePartida', () => {
  it('abre con lo guardado y deja la parte como estaba', () => {
    const edicion = edicionDePartida(partidaDeEjemplo({ serie: 'B', referencia: 'Boleta 9' }));
    expect(edicion).toMatchObject({
      abierta: true,
      movimientoId: 'mov-1',
      parte: 'cheque_en_circulacion',
      numeroDeCheque: '4501',
      serie: 'B',
      referencia: 'Boleta 9',
    });
  });

  it('un error del banco que resta abre con el sentido débito', () => {
    const edicion = edicionDePartida(partidaDeEjemplo({ parte: 'error_del_banco', tipo: 'debito' }));
    expect(edicion.sentido).toBe('debito');
  });
});

describe('textos de la ventana', () => {
  it('el título dice si se agrega o se corrige y de qué parte', () => {
    expect(tituloDeLaVentanaDePartida(edicionNuevaDePartida('cheque_posfechado', null))).toBe(
      'Agregar cheque posfechado',
    );
    expect(tituloDeLaVentanaDePartida(edicionDePartida(partidaDeEjemplo()))).toBe('Corregir cheque en circulación');
  });

  it('solo cheques llevan número, y el depósito dice «Origen»', () => {
    expect(esParteDeCheque('cheque_posfechado')).toBe(true);
    expect(esParteDeCheque('error_del_banco')).toBe(false);
    expect(rotuloDelBeneficiario('deposito_en_transito')).toBe('Origen del depósito');
    expect(rotuloDelBeneficiario('error_del_banco')).toBeNull();
  });
});
