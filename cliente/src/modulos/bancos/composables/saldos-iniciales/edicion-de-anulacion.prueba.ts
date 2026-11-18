import { describe, expect, it } from 'vitest';
import { datosDeAnulacion } from './edicion-de-anulacion';

const escrito = { motivo: 'El cheque caducó', fecha: '2027-02-10', pagador: '  Cliente Moroso  ' };

describe('datosDeAnulacion', () => {
  it('el depósito en tránsito manda el pagador sin espacios sobrantes', () => {
    expect(datosDeAnulacion({ parte: 'deposito_en_transito' }, escrito)).toEqual({
      motivo: 'El cheque caducó',
      fecha: '2027-02-10',
      pagador: 'Cliente Moroso',
    });
  });

  it('un pagador vacío va como null y el servidor dirá si hacía falta', () => {
    expect(datosDeAnulacion({ parte: 'deposito_en_transito' }, { ...escrito, pagador: '   ' }).pagador).toBeNull();
  });

  it('las demás partes no mandan pagador', () => {
    expect(datosDeAnulacion({ parte: 'cheque_en_circulacion' }, escrito).pagador).toBeNull();
    expect(datosDeAnulacion({ parte: 'error_del_banco' }, escrito).pagador).toBeNull();
  });
});
