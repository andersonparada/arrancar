import { describe, expect, it } from 'vitest';
import {
  datosDeEntrada,
  datosDeSalida,
  entradaNueva,
  erroresDeEntrada,
  erroresDeSalida,
  esDonacion,
  salidaNueva,
} from './edicion-de-documento';

describe('entrada manual', () => {
  it('abre con la fecha de hoy y un renglón vacío', () => {
    const entrada = entradaNueva('2026-11-23');
    expect(entrada.fecha).toBe('2026-11-23');
    expect(entrada.renglones).toHaveLength(1);
  });

  it('pide bodega, causa y soporte con el mensaje de qué hacer', () => {
    const errores = erroresDeEntrada(entradaNueva('2026-11-23'));
    expect(Object.keys(errores).sort()).toEqual(['bodegaId', 'causa', 'soporte']);
    expect(errores.soporte).toMatch(/acta, boleta o número/);
  });

  it('manda lo vacío como null y recorta el soporte', () => {
    const entrada = { ...entradaNueva('2026-11-23'), bodegaId: 'b1', causa: 'aporte' as const, soporte: ' Acta 5 ' };
    expect(datosDeEntrada(entrada)).toMatchObject({ bodegaId: 'b1', soporte: 'Acta 5', observaciones: null });
  });

  it('reconoce la donación para avisar del valor razonable', () => {
    expect(esDonacion({ ...entradaNueva(), causa: 'donacion_recibida' })).toBe(true);
    expect(esDonacion(entradaNueva())).toBe(false);
  });
});

describe('salida por consumo', () => {
  it('el destino por omisión es gasto y exige su concepto', () => {
    const salida = salidaNueva('2026-11-23');
    expect(salida.destino).toBe('gasto');
    expect(erroresDeSalida(salida)).toMatchObject({
      bodegaId: expect.any(String),
      conceptoDeGastoId: expect.any(String),
    });
  });

  it('no manda costos en los renglones', () => {
    const salida = { ...salidaNueva(), bodegaId: 'b1', conceptoDeGastoId: 'c1' };
    salida.renglones[0] = { ...salida.renglones[0]!, articuloId: 'a1', cantidad: '2', costoTotal: '99' };
    expect(datosDeSalida(salida).renglones[0]?.costoTotal).toBeNull();
    expect(erroresDeSalida(salida)).toEqual({});
  });
});
