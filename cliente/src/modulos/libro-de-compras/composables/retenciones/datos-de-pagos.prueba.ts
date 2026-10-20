import { describe, expect, it } from 'vitest';
import { aCentavos, deCentavos, esCero, sumarMontos } from './dinero';
import {
  celdaDeLaMatriz,
  cuerpoDelPago,
  faltanteTrasElPago,
  fechaDeHoy,
  nombreDelMes,
  opcionesDeAnio,
  pagoNuevo,
  pagoParaCorregir,
  pagosVigentes,
  revisarPago,
} from './datos-de-pagos';
import { grupo, pago } from './retenciones.soporte';

describe('dinero en centavos', () => {
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
  it('propone la fecha de hoy y lo que falta pagar', () => {
    const nuevo = pagoNuevo(grupo(), new Date(2026, 9, 5));
    expect(nuevo).toMatchObject({ fechaDePago: '2026-10-05', monto: '20.00', documentoDePago: '' });
  });

  it('no propone monto si no falta nada o se pagó de más', () => {
    expect(pagoNuevo(grupo({ diferencia: '0.00' }), new Date()).monto).toBe('');
    expect(pagoNuevo(grupo({ diferencia: '-5.00' }), new Date()).monto).toBe('');
  });

  it('formatea la fecha con dos dígitos', () => {
    expect(fechaDeHoy(new Date(2026, 0, 3))).toBe('2026-01-03');
  });
});

describe('revisión del pago', () => {
  const bueno = { fechaDePago: '2026-10-15', documentoDePago: 'B-1', monto: '20', observaciones: '' };

  it('un pago completo no tiene errores', () => {
    expect(revisarPago(bueno)).toEqual({});
  });

  it('dice qué falta y cómo corregirlo', () => {
    const errores = revisarPago({ fechaDePago: '', documentoDePago: ' ', monto: 'veinte', observaciones: '' });
    expect(Object.keys(errores).sort()).toEqual(['documentoDePago', 'fechaDePago', 'monto']);
    expect(errores.monto).toContain('por ejemplo');
  });

  it('el monto debe ser mayor que cero', () => {
    expect(revisarPago({ ...bueno, monto: '0' }).monto).toBe('El monto debe ser mayor que cero.');
  });

  it('arma el cuerpo con monto normalizado y observaciones vacías como nulas', () => {
    expect(cuerpoDelPago({ ...bueno, documentoDePago: ' B-1 ', monto: '20,5' })).toEqual({
      fechaDePago: '2026-10-15',
      documentoDePago: 'B-1',
      monto: '20.50',
      observaciones: null,
    });
  });

  it('al corregir parte de lo guardado', () => {
    expect(pagoParaCorregir(pago({ observaciones: 'complementario' }))).toEqual({
      fechaDePago: '2026-10-15',
      documentoDePago: 'B-100',
      monto: '30.00',
      observaciones: 'complementario',
    });
  });
});

describe('lo que faltaría pagar', () => {
  it('resta el monto escrito a lo que falta', () => {
    expect(faltanteTrasElPago(grupo(), '20')).toBe('0.00');
    expect(faltanteTrasElPago(grupo(), '25')).toBe('-5.00');
  });

  it('al corregir, el monto anterior del pago ya no cuenta', () => {
    expect(faltanteTrasElPago(grupo(), '50', pago())).toBe('0.00');
  });

  it('sin un monto válido no hay cuenta', () => {
    expect(faltanteTrasElPago(grupo(), 'x')).toBeNull();
  });

  it('solo cuentan los pagos vigentes', () => {
    const g = grupo({ pagos: [pago(), pago({ id: 'e2', estado: 'anulado' })] });
    expect(pagosVigentes(g)).toHaveLength(1);
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
