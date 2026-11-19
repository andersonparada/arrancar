import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  beneficiarioEfectivo,
  edicionDeRetiroVacia,
  erroresDelRetiro,
  esAlPortador,
  resumenDelRetiro,
  solicitudDeRetiro,
  type EdicionDeRetiro,
} from './edicion-de-retiro';

beforeEach(() => setActivePinia(createPinia()));

const HOY = '2026-11-15';
const completa = (cambios: Partial<EdicionDeRetiro> = {}): EdicionDeRetiro => ({
  ...edicionDeRetiroVacia(HOY),
  monto: '5000',
  custodio: 'Juan Pérez',
  medio: 'ch1',
  ...cambios,
});

describe('el retiro vacío', () => {
  it('abre con cheque, la fecha de hoy y «no negociable» encendido', () => {
    const vacia = edicionDeRetiroVacia(HOY);
    expect(vacia).toMatchObject({ forma: 'cheque', fecha: HOY, noNegociable: true, custodioUsuarioId: '' });
  });
});

describe('cheque al portador', () => {
  it('se reconoce sin importar mayúsculas, tildes, espacios ni signos', () => {
    for (const texto of ['', '  ', 'Al Portador', 'al  PORTADOR.', 'portador', 'alportador']) {
      expect(esAlPortador(texto)).toBe(true);
    }
    expect(esAlPortador('Juan Pérez')).toBe(false);
  });

  it('el beneficiario en blanco es el custodio', () => {
    expect(beneficiarioEfectivo({ beneficiario: '  ', custodio: ' Juan ' })).toBe('Juan');
    expect(beneficiarioEfectivo({ beneficiario: 'Finca S.A.', custodio: 'Juan' })).toBe('Finca S.A.');
  });
});

describe('errores antes de enviar', () => {
  it('un retiro completo no tiene errores', () => {
    expect(erroresDelRetiro(completa(), HOY)).toEqual({});
  });

  it('pide el custodio, el monto y la chequera diciendo cómo corregir', () => {
    const errores = erroresDelRetiro(completa({ custodio: '', monto: '0', medio: '' }), HOY);
    expect(errores.custodio).toContain('escoja un usuario');
    expect(errores.monto).toContain('mayor que cero');
    expect(errores.medio).toContain('chequera');
  });

  it('con un usuario escogido no hace falta escribir el custodio', () => {
    expect(erroresDelRetiro(completa({ custodio: '', custodioUsuarioId: 'u1' }), HOY).custodio).toBeUndefined();
  });

  it('un monto mal escrito no se acepta', () => {
    expect(erroresDelRetiro(completa({ monto: '12,5' }), HOY).monto).toContain('dos decimales');
  });

  it('no deja fecha futura: el efectivo no se retira por adelantado', () => {
    expect(erroresDelRetiro(completa({ fecha: '2026-11-16' }), HOY).fecha).toContain('futura');
  });

  it('el cheque no se emite al portador, ni siquiera por omisión', () => {
    expect(erroresDelRetiro(completa({ beneficiario: 'Al portador' }), HOY).beneficiario).toContain('portador');
    expect(erroresDelRetiro(completa({ beneficiario: '', custodio: 'Portador' }), HOY).beneficiario).toBeDefined();
  });

  it('la nota de débito pide la cuenta y no revisa el beneficiario', () => {
    const nota = completa({ forma: 'nota_de_debito', medio: '', beneficiario: 'al portador' });
    const errores = erroresDelRetiro(nota, HOY);
    expect(errores.medio).toContain('cuenta bancaria');
    expect(errores.beneficiario).toBeUndefined();
  });
});

describe('el cuerpo para el servidor', () => {
  it('un cheque lleva la chequera, «no negociable» y el beneficiario en blanco como nulo', () => {
    expect(solicitudDeRetiro(completa({ monto: '5000.5' }))).toEqual({
      forma: 'cheque',
      fecha: HOY,
      monto: '5000.50',
      custodio: 'Juan Pérez',
      custodioUsuarioId: null,
      observaciones: null,
      chequeraId: 'ch1',
      noNegociable: true,
      beneficiario: null,
    });
  });

  it('una nota de débito lleva la cuenta y la boleta', () => {
    const cuerpo = solicitudDeRetiro(completa({ forma: 'nota_de_debito', medio: 'b1', referencia: ' 998877 ' }));
    expect(cuerpo).toMatchObject({ forma: 'nota_de_debito', cuentaBancariaId: 'b1', referencia: '998877' });
    expect(cuerpo).not.toHaveProperty('noNegociable');
  });

  it('con un usuario escogido no se manda el nombre escrito', () => {
    const cuerpo = solicitudDeRetiro(completa({ custodioUsuarioId: 'u1', custodio: 'Otro nombre' }));
    expect(cuerpo).toMatchObject({ custodio: null, custodioUsuarioId: 'u1' });
  });

  it('apagar «no negociable» y escribir otro beneficiario se respeta', () => {
    const cuerpo = solicitudDeRetiro(completa({ noNegociable: false, beneficiario: ' Finca S.A. ' }));
    expect(cuerpo).toMatchObject({ noNegociable: false, beneficiario: 'Finca S.A.' });
  });
});

describe('el resumen de lo que va a pasar', () => {
  it('dice el monto, el custodio y el documento que Bancos creará', () => {
    const cheque = resumenDelRetiro(completa(), 'Juan Pérez', 'Cuenta monetaria');
    expect(cheque).toContain('Q\u00a05,000.00');
    expect(cheque).toContain('Juan Pérez');
    expect(cheque).toContain('un cheque no negociable de Cuenta monetaria');
    const nota = resumenDelRetiro(completa({ forma: 'nota_de_debito' }), 'Juan', 'Cuenta monetaria');
    expect(nota).toContain('una nota de débito en Cuenta monetaria');
  });
});

describe('el cheque con un usuario como custodio', () => {
  const conUsuario = completa({ custodio: '', custodioUsuarioId: 'u1', forma: 'cheque' });

  it('a nombre de queda en blanco: va a nombre del usuario, sin error', () => {
    expect(erroresDelRetiro(conUsuario, HOY, 'Ana López')).toEqual({});
    expect(beneficiarioEfectivo(conUsuario, 'Ana López')).toBe('Ana López');
  });

  it('un nombre escrito antes de elegir el usuario no cuenta', () => {
    const viejo = { ...conUsuario, custodio: 'Al portador' };
    expect(erroresDelRetiro(viejo, HOY, 'Ana López')).toEqual({});
  });

  it('si no se conoce el nombre del usuario, el servidor lo resuelve', () => {
    expect(erroresDelRetiro(conUsuario, HOY)).toEqual({});
  });
});
