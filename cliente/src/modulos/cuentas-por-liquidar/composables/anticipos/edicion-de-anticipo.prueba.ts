import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  edicionDeAnticipoVacia,
  erroresDelAnticipo,
  fechaLimitePropuesta,
  resumenDeLaEntrega,
  solicitudDeEntrega,
  type EdicionDeAnticipo,
} from './edicion-de-anticipo';
import { medioPorOmision, nombreDelMedio, opcionesDeChequeras, opcionesDeCuentas } from './opciones-de-medios';
import type { MediosParaElegir } from '../../servicios/opciones.api';

beforeEach(() => setActivePinia(createPinia()));

const HOY = '2026-11-19';
const completa = (cambios: Partial<EdicionDeAnticipo> = {}): EdicionDeAnticipo => ({
  ...edicionDeAnticipoVacia(HOY),
  beneficiarioId: 'b-1',
  descripcion: ' Viaje a la finca ',
  monto: '1500',
  medio: 'chequera-1',
  ...cambios,
});

const MEDIOS: MediosParaElegir = {
  cuentas: [
    {
      cuentaBancariaId: 'c-2',
      nombre: 'Banco Zeta',
      bancoNombre: 'Zeta',
      numero: '2',
      saldo: '500.00',
      chequeras: [{ chequeraId: 'q-2', serie: 'B', siguienteChequeId: null, siguienteNumero: null }],
    },
    {
      cuentaBancariaId: 'c-1',
      nombre: 'Banco Alfa',
      bancoNombre: null,
      numero: '1',
      saldo: '60000.00',
      chequeras: [{ chequeraId: 'q-1', serie: null, siguienteChequeId: 'ch-9', siguienteNumero: 9 }],
    },
  ],
};

describe('errores antes de enviar', () => {
  it('una entrega completa no tiene errores', () => {
    expect(erroresDelAnticipo(completa(), HOY)).toEqual({});
  });

  it('pide beneficiario, descripción, monto y medio', () => {
    const errores = erroresDelAnticipo(edicionDeAnticipoVacia(HOY), HOY);
    expect(Object.keys(errores).sort()).toEqual(['beneficiarioId', 'descripcion', 'medio', 'monto']);
    expect(errores.medio).toContain('chequera');
  });

  it('un monto en cero o mal escrito dice cómo corregirlo', () => {
    expect(erroresDelAnticipo(completa({ monto: '0' }), HOY).monto).toContain('mayor que cero');
    expect(erroresDelAnticipo(completa({ monto: '12.345' }), HOY).monto).toContain('dos decimales');
  });

  it('la entrega no es futura ni la fecha límite anterior a ella', () => {
    expect(erroresDelAnticipo(completa({ fecha: '2026-12-01' }), HOY).fecha).toContain('futura');
    expect(erroresDelAnticipo(completa({ fechaLimite: '2026-11-01' }), HOY).fechaLimite).toContain('anterior');
  });

  it('una transferencia pide la cuenta', () => {
    expect(erroresDelAnticipo(completa({ forma: 'nota_de_debito', medio: '' }), HOY).medio).toContain('cuenta');
  });
});

describe('el cuerpo de la entrega', () => {
  it('un cheque lleva la chequera y si es no negociable; sin fecha límite escrita no la manda', () => {
    const cuerpo = solicitudDeEntrega(completa());
    expect(cuerpo).toMatchObject({
      forma: 'cheque',
      chequeraId: 'chequera-1',
      noNegociable: true,
      monto: '1500.00',
      descripcion: 'Viaje a la finca',
      beneficiarioUsuarioId: null,
      motivoConVencidos: null,
    });
    expect('fechaLimite' in cuerpo).toBe(false);
  });

  it('una transferencia lleva la cuenta y la referencia, y la fecha límite escrita', () => {
    const cuerpo = solicitudDeEntrega(
      completa({ forma: 'nota_de_debito', medio: 'c-1', referencia: ' TRF-1 ', fechaLimite: '2026-12-05' }),
    );
    expect(cuerpo).toMatchObject({
      forma: 'nota_de_debito',
      cuentaBancariaId: 'c-1',
      referencia: 'TRF-1',
      fechaLimite: '2026-12-05',
    });
  });
});

describe('la confirmación', () => {
  it('cuenta a quién, cuánto, con qué documento y hasta cuándo', () => {
    const texto = resumenDeLaEntrega(completa(), {
      beneficiario: 'Ana López',
      medio: 'Banco Alfa · chequera',
      fechaLimite: '2026-12-04',
    });
    expect(texto).toContain('Ana López');
    expect(texto).toContain('1,500.00');
    expect(texto).toContain('cheque no negociable');
    expect(texto).toContain('Banco Alfa');
  });

  it('propone la fecha límite sumando los días de la configuración', () => {
    expect(fechaLimitePropuesta('2026-11-19', 15)).toBe('2026-12-04');
    expect(fechaLimitePropuesta('', 15)).toBe('');
  });
});

describe('las cuentas y chequeras', () => {
  it('las chequeras van por nombre y la que no tiene cheques queda apagada', () => {
    const opciones = opcionesDeChequeras(MEDIOS);
    expect(opciones.map(({ valor }) => valor)).toEqual(['q-1', 'q-2']);
    expect(opciones[0]?.deshabilitada).toBe(false);
    expect(opciones[1]?.deshabilitada).toBe(true);
    expect(opciones[0]?.texto).toContain('siguiente cheque 9');
  });

  it('las cuentas van por nombre con su saldo', () => {
    const opciones = opcionesDeCuentas(MEDIOS);
    expect(opciones.map(({ valor }) => valor)).toEqual(['c-1', 'c-2']);
    expect(opciones[0]?.texto).toContain('60,000.00');
  });

  it('con una sola chequera usable se escoge sola; con varias o ninguna, no', () => {
    expect(medioPorOmision('cheque', MEDIOS)).toBe('q-1');
    expect(medioPorOmision('nota_de_debito', MEDIOS)).toBe('');
    expect(medioPorOmision('cheque', null)).toBe('');
  });

  it('el nombre del medio no lleva el saldo', () => {
    expect(nombreDelMedio('nota_de_debito', MEDIOS, 'c-1')).toBe('Banco Alfa');
    expect(nombreDelMedio('cheque', MEDIOS, 'otra')).toBe('la cuenta elegida');
  });
});
