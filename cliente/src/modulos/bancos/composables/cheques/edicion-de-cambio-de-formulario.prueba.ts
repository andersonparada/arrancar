import { describe, expect, it } from 'vitest';
import {
  cambioCerrado,
  cambioNuevo,
  datosDeCambio,
  datosDeExtravio,
  resumenDelCambio,
  sePuedeConfirmar,
  textoDeConfirmar,
} from './edicion-de-cambio-de-formulario';

const abierta = () => cambioNuevo({ id: 'c1', chequeraId: 'q1' }, 'cheque 7');

describe('ventana de pasar a otro formulario', () => {
  it('abre para inutilizar, sin confirmaciones marcadas y con la fecha de hoy', () => {
    expect(abierta()).toMatchObject({
      abierta: true,
      chequeId: 'c1',
      chequeraId: 'q1',
      destino: 'inutilizar',
      enCustodia: false,
      papelConservado: false,
      chequeDestinoId: null,
    });
    expect(abierta().fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(cambioCerrado().abierta).toBe(false);
  });

  it('inutilizar pide destino, motivo y las dos confirmaciones', () => {
    const completa = {
      ...abierta(),
      chequeDestinoId: 'c2',
      motivo: 'Se arrugó',
      enCustodia: true,
      papelConservado: true,
    };
    expect(sePuedeConfirmar(completa)).toBe(true);
    expect(sePuedeConfirmar({ ...completa, enCustodia: false })).toBe(false);
    expect(sePuedeConfirmar({ ...completa, papelConservado: false })).toBe(false);
    expect(sePuedeConfirmar({ ...completa, chequeDestinoId: null })).toBe(false);
    expect(sePuedeConfirmar({ ...completa, motivo: '  ' })).toBe(false);
  });

  it('extraviado solo pide el motivo', () => {
    expect(sePuedeConfirmar({ ...abierta(), destino: 'extraviado' })).toBe(false);
    expect(sePuedeConfirmar({ ...abierta(), destino: 'extraviado', motivo: 'Se perdió en el camino' })).toBe(true);
  });

  it('el botón cambia según el destino del papel', () => {
    expect(textoDeConfirmar('inutilizar')).toBe('Pasar a otro formulario');
    expect(textoDeConfirmar('extraviado')).toBe('Anular como extraviado');
  });
});

describe('lo que se manda', () => {
  it('al inutilizar manda el destino, el motivo y las dos confirmaciones', () => {
    const edicion = {
      ...abierta(),
      chequeDestinoId: 'c2',
      motivo: ' Se arrugó ',
      enCustodia: true,
      papelConservado: true,
    };
    expect(datosDeCambio(edicion)).toEqual({
      chequeDestinoId: 'c2',
      motivo: 'Se arrugó',
      enCustodia: true,
      papelConservado: true,
    });
  });

  it('al extraviar manda el motivo y la fecha del movimiento inverso', () => {
    expect(datosDeExtravio({ ...abierta(), motivo: ' Se perdió ', fecha: '2026-11-18' })).toEqual({
      motivo: 'Se perdió',
      fecha: '2026-11-18',
    });
  });
});

describe('resumenDelCambio', () => {
  it('al inutilizar dice que el pago no cambia', () => {
    expect(resumenDelCambio({ titulo: 'cheque 7', destino: 'inutilizar' })).toMatch(/El pago no cambia/);
  });

  it('al extraviar dice que se anula el pago y que hay que avisar al banco', () => {
    const texto = resumenDelCambio({ titulo: 'cheque 7', destino: 'extraviado' });
    expect(texto).toMatch(/también su pago/);
    expect(texto).toMatch(/avise al banco por escrito/);
  });
});
