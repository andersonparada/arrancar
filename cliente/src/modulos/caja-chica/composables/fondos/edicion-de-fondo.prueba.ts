import { describe, expect, it } from 'vitest';
import {
  cuerpoDeAnulacionDeApertura,
  cuerpoDeApertura,
  cuerpoDeAumento,
  cuerpoDeCustodio,
  cuerpoDeDisminucion,
  edicionDeApertura,
  edicionDeDisminucion,
  edicionDeEntrega,
} from './edicion-de-fondo';

describe('cuerpoDeApertura', () => {
  it('con cheque lleva la chequera, el beneficiario y no negociable; sin fecha no la manda', () => {
    const edicion = {
      ...edicionDeApertura(),
      nombre: ' Caja de la finca ',
      medioId: 'ch-1',
      monto: 5000,
      custodio: 'Ana',
    };
    const cuerpo = cuerpoDeApertura(edicion);
    expect(cuerpo).toMatchObject({
      forma: 'cheque',
      chequeraId: 'ch-1',
      monto: '5000',
      nombre: 'Caja de la finca',
      beneficiario: 'Ana',
      noNegociable: true,
      custodio: 'Ana',
      topePorComprobante: null,
    });
    expect('fecha' in cuerpo).toBe(false);
  });

  it('un beneficiario escrito gana sobre el custodio', () => {
    const edicion = { ...edicionDeApertura(), custodio: 'Ana', beneficiario: ' Rosa López ' };
    expect(cuerpoDeApertura(edicion)).toMatchObject({ beneficiario: 'Rosa López' });
  });

  it('con nota de débito lleva la cuenta y la referencia, no la chequera', () => {
    const edicion = {
      ...edicionDeApertura(),
      forma: 'nota_de_debito' as const,
      medioId: 'cta-1',
      referencia: ' TR-9 ',
    };
    const cuerpo = cuerpoDeApertura(edicion);
    expect(cuerpo).toMatchObject({ forma: 'nota_de_debito', cuentaBancariaId: 'cta-1', referencia: 'TR-9' });
    expect('chequeraId' in cuerpo).toBe(false);
  });

  it('manda la fecha solo si se escribió, el tope si se escribió y el usuario custodio', () => {
    const edicion = { ...edicionDeApertura(), fecha: '2026-11-03', tope: '1500.50', custodioUsuarioId: 'u-1' };
    expect(cuerpoDeApertura(edicion)).toMatchObject({
      fecha: '2026-11-03',
      topePorComprobante: '1500.50',
      custodioUsuarioId: 'u-1',
    });
  });
});

describe('cuerpoDeAumento', () => {
  it('el cheque sale a nombre del custodio del fondo si no se escribe otro', () => {
    const edicion = { ...edicionDeEntrega(), medioId: 'ch-2', monto: '800.00' };
    expect(cuerpoDeAumento(edicion, 'Ana')).toMatchObject({ forma: 'cheque', beneficiario: 'Ana', monto: '800.00' });
  });

  it('sin custodio y sin beneficiario no inventa uno', () => {
    expect(cuerpoDeAumento(edicionDeEntrega(), null)).toMatchObject({ beneficiario: null });
  });
});

describe('cuerpoDeDisminucion', () => {
  it('propone la cuenta del fondo y limpia lo vacío', () => {
    const edicion = { ...edicionDeDisminucion('cta-1'), monto: '300' };
    expect(cuerpoDeDisminucion(edicion)).toEqual({
      monto: '300',
      cuentaBancariaId: 'cta-1',
      referencia: null,
      observaciones: null,
    });
  });
});

describe('cuerpoDeCustodio y de la anulación', () => {
  it('recorta el motivo y no manda fecha vacía', () => {
    const cuerpo = cuerpoDeCustodio({ custodio: 'Luis', custodioUsuarioId: null, fecha: '', motivo: ' Renunció ' });
    expect(cuerpo).toEqual({ custodio: 'Luis', custodioUsuarioId: null, motivo: 'Renunció' });
    expect(cuerpoDeAnulacionDeApertura(' Error ', '2026-11-04')).toEqual({ motivo: 'Error', fecha: '2026-11-04' });
  });
});
