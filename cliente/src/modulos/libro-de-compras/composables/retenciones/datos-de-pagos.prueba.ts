import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { aCentavos, deCentavos, esCero, sumarMontos } from './dinero';
import {
  celdaDeLaMatriz,
  conAccesorios,
  cuerpoDelPago,
  desgloseDelPago,
  excesoDelPago,
  faltanteTrasElPago,
  fechaDeHoy,
  nombreDelMes,
  opcionesDeAnio,
  pagoNuevo,
  pagoParaCorregir,
  pagosVigentes,
  pasaLoRetenido,
  revisarPago,
  tieneAccesorios,
  totalDelPago,
} from './datos-de-pagos';
import { grupo, pago } from './retenciones.soporte';

describe('dinero en centavos', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('suma sin errores de decimales', () => {
    expect(sumarMontos(['0.10', '0.20'])).toBe('0.30');
  });

  it('acepta coma decimal y rechaza lo que no es importe', () => {
    expect(aCentavos('12,5')).toBe(1250);
    expect(aCentavos('abc')).toBeNull();
    expect(aCentavos('')).toBeNull();
    expect(deCentavos(-5)).toBe('-0.05');
    expect(esCero('0.00')).toBe(true);
  });
});

describe('pago nuevo', () => {
  it('propone la fecha de hoy y el impuesto que falta pagar', () => {
    const nuevo = pagoNuevo(grupo(), new Date('2026-10-05T18:00:00Z'));
    expect(nuevo).toMatchObject({ fechaDePago: '2026-10-05', impuesto: '20.00', documentoDePago: '', multa: '' });
  });

  it('no propone impuesto si no falta nada o se pagó de más', () => {
    expect(pagoNuevo(grupo({ diferencia: '0.00' }), new Date()).impuesto).toBe('');
    expect(pagoNuevo(grupo({ diferencia: '-5.00' }), new Date()).impuesto).toBe('');
  });

  it('la fecha de hoy es la de Guatemala, aunque en UTC ya sea otro día', () => {
    expect(fechaDeHoy(new Date('2026-01-04T03:00:00Z'))).toBe('2026-01-03');
    expect(fechaDeHoy(new Date('2026-01-04T07:00:00Z'))).toBe('2026-01-04');
  });
});

describe('revisión del pago', () => {
  const bueno = {
    fechaDePago: '2026-10-15',
    documentoDePago: 'B-1',
    impuesto: '20',
    multa: '',
    intereses: '',
    mora: '',
    observaciones: '',
  };

  it('un pago completo no tiene errores y los accesorios son opcionales', () => {
    expect(revisarPago(bueno)).toEqual({});
    expect(revisarPago({ ...bueno, multa: '5', intereses: '0', mora: '1,25' })).toEqual({});
  });

  it('dice qué falta y cómo corregirlo', () => {
    const errores = revisarPago({ ...bueno, fechaDePago: '', documentoDePago: ' ', impuesto: 'veinte' });
    expect(Object.keys(errores).sort()).toEqual(['documentoDePago', 'fechaDePago', 'impuesto']);
    expect(errores.impuesto).toContain('por ejemplo');
  });

  it('una fecha de pago futura se rechaza en la pantalla, con la fecha de hoy en el mensaje', () => {
    const errores = revisarPago({ ...bueno, fechaDePago: '2026-11-02' }, '2026-11-01');
    expect(errores.fechaDePago).toContain('posterior a hoy');
    expect(revisarPago({ ...bueno, fechaDePago: '2026-11-01' }, '2026-11-01')).toEqual({});
  });

  it('una multa negativa dice que no puede ser negativa y cómo dejarla', () => {
    expect(revisarPago({ ...bueno, multa: '-1.00' }).multa).toBe(
      'No puede ser negativo. Si no hubo, déjelo en blanco.',
    );
  });

  it('el impuesto debe ser mayor que cero', () => {
    expect(revisarPago({ ...bueno, impuesto: '0' }).impuesto).toBe('El impuesto debe ser mayor que cero.');
  });

  it('un accesorio escrito debe ser un importe no negativo', () => {
    const errores = revisarPago({ ...bueno, multa: 'x', intereses: '-1' });
    expect(errores.multa).toContain('por ejemplo');
    expect(errores.intereses).toContain('negativo');
    expect(errores.mora).toBeUndefined();
  });

  it('arma el cuerpo con los cuatro montos y observaciones vacías como nulas', () => {
    expect(cuerpoDelPago({ ...bueno, documentoDePago: ' B-1 ', impuesto: '20,5', mora: '3' })).toEqual({
      fechaDePago: '2026-10-15',
      documentoDePago: 'B-1',
      impuesto: '20.50',
      multa: '0.00',
      intereses: '0.00',
      mora: '3.00',
      observaciones: null,
    });
  });

  it('al corregir parte de lo guardado y deja en blanco los accesorios en cero', () => {
    expect(pagoParaCorregir(pago({ observaciones: 'complementario', multa: '5.00' }))).toEqual({
      fechaDePago: '2026-10-15',
      documentoDePago: 'B-100',
      impuesto: '30.00',
      multa: '5.00',
      intereses: '',
      mora: '',
      observaciones: 'complementario',
    });
  });

  it('sabe si hay accesorios escritos', () => {
    expect(tieneAccesorios(bueno)).toBe(false);
    expect(tieneAccesorios({ ...bueno, mora: '1' })).toBe(true);
  });
});

describe('total de la boleta', () => {
  it('suma impuesto y accesorios, y ignora lo que no es importe', () => {
    const base = { impuesto: '218.57', multa: '218.57', intereses: '5.10', mora: '' };
    expect(totalDelPago(base)).toBe('442.24');
    expect(totalDelPago({ ...base, mora: 'x', multa: '' })).toBe('223.67');
  });
});

describe('lo que faltaría pagar', () => {
  it('resta el impuesto escrito a lo que falta', () => {
    expect(faltanteTrasElPago(grupo(), '20')).toBe('0.00');
    expect(faltanteTrasElPago(grupo(), '25')).toBe('-5.00');
  });

  it('al corregir, el impuesto anterior del pago ya no cuenta', () => {
    expect(faltanteTrasElPago(grupo(), '50', pago())).toBe('0.00');
  });

  it('sin un impuesto válido no hay cuenta', () => {
    expect(faltanteTrasElPago(grupo(), 'x')).toBeNull();
  });

  it('solo cuentan los pagos vigentes', () => {
    const g = grupo({ pagos: [pago(), pago({ id: 'e2', estado: 'anulado' })] });
    expect(pagosVigentes(g)).toHaveLength(1);
  });
});

describe('impuesto que pasa lo retenido', () => {
  const escrito = (impuesto: string) => ({ ...pagoNuevo(grupo(), new Date()), impuesto, multa: '100' });

  it('no pasa si el impuesto completa lo retenido, aunque haya accesorios', () => {
    expect(pasaLoRetenido(grupo(), escrito('20'))).toBe(false);
    expect(excesoDelPago(grupo(), escrito('20'))).toBeNull();
  });

  it('pasa y dice por cuánto', () => {
    expect(pasaLoRetenido(grupo(), escrito('25.50'))).toBe(true);
    expect(excesoDelPago(grupo(), escrito('25.50'))).toBe('5.50');
  });

  it('al corregir no cuenta el impuesto del pago corregido', () => {
    expect(pasaLoRetenido(grupo(), escrito('50'), pago())).toBe(false);
    expect(pasaLoRetenido(grupo(), escrito('51'), pago())).toBe(true);
  });
});

describe('desglose de un pago', () => {
  it('muestra solo lo que no es cero', () => {
    const p = pago({ multa: '5.00', total: '35.00' });
    expect(conAccesorios(p)).toBe(true);
    expect(desgloseDelPago(p).map((d) => d.nombre)).toEqual(['impuesto', 'multa']);
    expect(conAccesorios(pago())).toBe(false);
  });
});

describe('matriz del año', () => {
  it('encuentra la celda de un mes y grupo', () => {
    const matriz = { anio: 2026, meses: [{ mes: '2026-09-01', grupos: [grupo()] }] };
    expect(celdaDeLaMatriz(matriz, '2026-09-01', 'iva_agentes')?.retenido).toBe('50.00');
    expect(celdaDeLaMatriz(matriz, '2026-10-01', 'iva_agentes')).toBeNull();
    expect(celdaDeLaMatriz(null, '2026-09-01', 'iva_agentes')).toBeNull();
  });

  it('ofrece el año en curso y cinco atrás, del más reciente al más antiguo', () => {
    const anios = opcionesDeAnio(new Date(2026, 9, 1), 2026).map((o) => o.valor);
    expect(anios).toEqual([2026, 2025, 2024, 2023, 2022, 2021]);
  });

  it('agrega el año que se esté viendo si es más antiguo', () => {
    expect(opcionesDeAnio(new Date(2026, 9, 1), 2018).map((o) => o.valor)).toContain(2018);
  });

  it('el mes se escribe con mayúscula', () => {
    expect(nombreDelMes('2026-10-01')).toBe('Octubre');
  });
});
