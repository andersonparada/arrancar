import { describe, expect, it } from 'vitest';
import { CalendarioDeLunesAViernes, type CalendarioLaboral } from './calendario-laboral.js';
import {
  AVISO_DE_PLAZO_DE_ANULACION_VENCIDO,
  avisosDelPlazoDeAnulacion,
  vencimientoDeLaDeclaracionDelIva,
  type DatosDelPlazoDeAnulacion,
} from './plazo-de-anulacion-en-la-sat.js';

const calendario = new CalendarioDeLunesAViernes();

describe('vencimiento de la declaración del IVA', () => {
  it('es el último día del mes siguiente', () => {
    // 2026-04-30 es jueves.
    expect(vencimientoDeLaDeclaracionDelIva('2026-03-01', calendario)).toBe('2026-04-30');
  });

  it('si cae en fin de semana se corre al siguiente día hábil', () => {
    // 2026-05-31 es domingo; el lunes 1 de junio es hábil.
    expect(vencimientoDeLaDeclaracionDelIva('2026-04-01', calendario)).toBe('2026-06-01');
  });

  it('también se corre sobre un feriado, con el calendario que se le dé', () => {
    const conFeriado: CalendarioLaboral = { esHabil: (fecha) => fecha !== '2026-04-30' && calendario.esHabil(fecha) };

    expect(vencimientoDeLaDeclaracionDelIva('2026-03-01', conFeriado)).toBe('2026-05-01');
  });

  it('cruza el año', () => {
    // 2027-01-31 es domingo.
    expect(vencimientoDeLaDeclaracionDelIva('2026-12-01', calendario)).toBe('2027-02-01');
  });
});

describe('aviso del plazo de anulación en la SAT', () => {
  const datos = (cambios: Partial<DatosDelPlazoDeAnulacion> = {}): DatosDelPlazoDeAnulacion => ({
    causa: 'error_de_captura',
    tieneFel: true,
    anuladoEnLaSat: false,
    hoy: '2026-05-01',
    periodo: '2026-03-01',
    ...cambios,
  });

  it('avisa si el plazo pasó', () => {
    expect(avisosDelPlazoDeAnulacion(datos(), calendario)).toEqual([AVISO_DE_PLAZO_DE_ANULACION_VENCIDO]);
  });

  it('dentro del plazo avisa que el registro no anula el DTE y hasta cuándo anularlo en la SAT', () => {
    const [aviso] = avisosDelPlazoDeAnulacion(datos({ hoy: '2026-04-30' }), calendario);

    expect(aviso).toBe(
      'Este registro no anula el DTE. Si la venta no procede, anúlelo en la SAT antes del 30/04/2026.',
    );
  });

  it('en la prórroga por día inhábil sugiere verificar en la Agencia Virtual', () => {
    // El plazo de abril termina el domingo 31 de mayo y se corre al lunes 1 de junio.
    const [aviso] = avisosDelPlazoDeAnulacion(datos({ hoy: '2026-06-01', periodo: '2026-04-01' }), calendario);

    expect(aviso).toContain('antes del 01/06/2026');
    expect(aviso).toContain('Agencia Virtual');
  });

  it('solo avisa con la causa error de captura', () => {
    expect(avisosDelPlazoDeAnulacion(datos({ causa: 'fel_anulada_en_la_sat' }), calendario)).toEqual([]);
    expect(avisosDelPlazoDeAnulacion(datos({ causa: 'no_corresponde_a_la_empresa' }), calendario)).toEqual([]);
  });

  it('no avisa si la SAT ya lo tiene anulado ni si es un documento de papel', () => {
    expect(avisosDelPlazoDeAnulacion(datos({ anuladoEnLaSat: true }), calendario)).toEqual([]);
    expect(avisosDelPlazoDeAnulacion(datos({ tieneFel: false }), calendario)).toEqual([]);
  });
});
