import { describe, expect, it } from 'vitest';
import { RespuestaInvalida } from '../../dominio/errores.js';
import {
  FALLA_SOAP,
  RANGO_CON_FIN_DE_SEMANA,
  LISTA_DE_MONEDAS,
  RANGO_DEL_EUR,
  RESPUESTA_CON_DOCTYPE,
  respuestaDeLasVariables,
  filaDelRango,
  respuestaDelDia,
  respuestaDelRango,
} from '../../pruebas/respuestas-grabadas-del-banguat.js';
import {
  DOLAR,
  extraerMonedasDisponibles,
  extraerTipoDelDia,
  extraerTiposDelRango,
} from './extractor-de-respuestas.js';

const HOY = '2026-11-18';
const EUR = { moneda: 'EUR', codigoBanguat: 28 };
const DEL_DOLAR = { operacion: 'TipoCambioRango', monedas: [DOLAR] };
const DEL_EURO = { operacion: 'TipoCambioRangoMoneda', monedas: [EUR] };

describe('extraerTipoDelDia', () => {
  it('lee la referencia del dólar', () => {
    const resultado = extraerTipoDelDia(respuestaDelDia('18/11/2026', '7.64489'), HOY);
    expect(resultado.publicaciones).toEqual([
      { moneda: 'USD', codigoBanguat: 2, fecha: '2026-11-18', referencia: '7.64489' },
    ]);
    expect(resultado.rechazadas).toEqual([]);
  });

  it('un valor fuera de banda no se guarda y queda como rechazado', () => {
    const resultado = extraerTipoDelDia(respuestaDelDia('18/11/2026', '76.4489'), HOY);
    expect(resultado.publicaciones).toEqual([]);
    expect(resultado.rechazadas).toEqual([{ moneda: 'USD', fecha: '2026-11-18', motivo: 'valor_fuera_de_rango' }]);
  });

  it('un valor con formato inválido se rechaza', () => {
    const resultado = extraerTipoDelDia(respuestaDelDia('18/11/2026', '7,64'), HOY);
    expect(resultado.rechazadas[0]?.motivo).toBe('dato_invalido');
  });

  it('rechaza XML con DOCTYPE o ENTITY', () => {
    expect(() => extraerTipoDelDia(RESPUESTA_CON_DOCTYPE, HOY)).toThrow(RespuestaInvalida);
    expect(() => extraerTipoDelDia('<!entity x "y">', HOY)).toThrow(RespuestaInvalida);
  });

  it('rechaza fallas SOAP y respuestas sin la estructura del servicio', () => {
    expect(() => extraerTipoDelDia(FALLA_SOAP, HOY)).toThrow(RespuestaInvalida);
    expect(() => extraerTipoDelDia('<html><body>Mantenimiento</body></html>', HOY)).toThrow(RespuestaInvalida);
  });
});

describe('extraerTiposDelRango', () => {
  it('trae un valor por día calendario, con el fin de semana repetido', () => {
    const resultado = extraerTiposDelRango(RANGO_CON_FIN_DE_SEMANA, HOY, DEL_DOLAR);
    expect(resultado.publicaciones.map((p) => p.fecha)).toEqual([
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
    ]);
    expect(resultado.publicaciones[1]?.referencia).toBe('7.64312');
  });

  it('un rango sin publicaciones es un resultado vacío, no un error', () => {
    const resultado = extraerTiposDelRango(respuestaDelRango([]), HOY, DEL_DOLAR);
    expect(resultado).toEqual({ publicaciones: [], rechazadas: [] });
  });

  it('ignora las monedas que no se pidieron', () => {
    const xml = respuestaDelRango([
      filaDelRango({ moneda: '24', fecha: '18/11/2026', venta: '8.9' }),
      filaDelRango({ fecha: '18/11/2026', venta: '7.64489' }),
    ]);
    expect(extraerTiposDelRango(xml, HOY, DEL_DOLAR).publicaciones).toHaveLength(1);
  });

  it('si compra y venta difieren el valor es ambiguo y se rechaza la fila', () => {
    const xml = respuestaDelRango([filaDelRango({ fecha: '18/11/2026', venta: '7.65', compra: '7.60' })]);
    const resultado = extraerTiposDelRango(xml, HOY, DEL_DOLAR);
    expect(resultado.publicaciones).toEqual([]);
    expect(resultado.rechazadas).toEqual([{ moneda: 'USD', fecha: '2026-11-18', motivo: 'valor_ambiguo' }]);
  });

  it('no duplica una misma fecha y descarta fechas muy futuras', () => {
    const xml = respuestaDelRango([
      filaDelRango({ fecha: '18/11/2026', venta: '7.64489' }),
      filaDelRango({ fecha: '18/11/2026', venta: '7.70000' }),
      filaDelRango({ fecha: '01/12/2026', venta: '7.7' }),
    ]);
    const resultado = extraerTiposDelRango(xml, HOY, DEL_DOLAR);
    expect(resultado.publicaciones).toEqual([
      {
        moneda: 'USD',
        codigoBanguat: 2,
        fecha: '2026-11-18',
        referencia: '7.64489',
        compra: '7.64489',
        venta: '7.64489',
      },
    ]);
    expect(resultado.rechazadas).toHaveLength(1);
  });

  it('rechaza DOCTYPE', () => {
    expect(() => extraerTiposDelRango(RESPUESTA_CON_DOCTYPE, HOY, DEL_DOLAR)).toThrow(RespuestaInvalida);
  });
});

describe('extraerTiposDelRango de otra moneda', () => {
  const resultado = extraerTiposDelRango(RANGO_DEL_EUR, HOY, DEL_EURO);

  it('trae los valores del euro, con fin de semana, notación científica y redondeo a 8 decimales', () => {
    expect(resultado.publicaciones.map((p) => [p.fecha, p.referencia, p.codigoBanguat])).toEqual([
      ['2026-11-13', '8.81234', 28],
      ['2026-11-14', '8.81234', 28],
      ['2026-11-16', '8.8', 28],
      ['2026-11-17', '8.81234568', 28],
    ]);
    expect(resultado.publicaciones[0]).toMatchObject({ moneda: 'EUR', compra: '8.81234', venta: '8.81234' });
  });

  it('rechaza como ambiguo el día con compra distinta de venta, con la moneda real', () => {
    expect(resultado.rechazadas).toEqual([{ moneda: 'EUR', fecha: '2026-11-18', motivo: 'valor_ambiguo' }]);
  });

  it('ignora el código que no se pidió (el 99)', () => {
    expect(resultado.publicaciones.every((p) => p.codigoBanguat === 28)).toBe(true);
  });

  it('el rango del dólar no toma filas del euro', () => {
    expect(
      extraerTiposDelRango(RANGO_DEL_EUR, HOY, { ...DEL_DOLAR, operacion: 'TipoCambioRangoMoneda' }).publicaciones,
    ).toEqual([]);
  });
});

describe('extraerTipoDelDia con otras monedas pedidas', () => {
  const xml = respuestaDelDia('18/11/2026', '7.64489').replace(
    '</CambioDolar>',
    '</CambioDolar><CambioDia><Var><moneda>28</moneda><fecha>18/11/2026</fecha><venta>8.8</venta><compra>8.8</compra></Var>' +
      '<Var><moneda>9</moneda><fecha>18/11/2026</fecha><venta>0.05</venta><compra>0.05</compra></Var></CambioDia>',
  );

  it('lee solo las monedas pedidas además del dólar', () => {
    const resultado = extraerTipoDelDia(xml, HOY, [EUR]);
    expect(resultado.publicaciones.map((p) => p.moneda)).toEqual(['USD', 'EUR']);
  });

  it('sin monedas pedidas solo lee el dólar', () => {
    expect(extraerTipoDelDia(xml, HOY).publicaciones.map((p) => p.moneda)).toEqual(['USD']);
  });
});

describe('extraerMonedasDisponibles', () => {
  it('lee código y descripción, recorta, decodifica y descarta lo inválido o repetido', () => {
    expect(extraerMonedasDisponibles(LISTA_DE_MONEDAS)).toEqual([
      { codigo: 2, descripcion: 'Dólares de EE.UU.' },
      { codigo: 28, descripcion: 'Euro' },
      { codigo: 9, descripcion: 'Yen & otras' },
    ]);
  });

  it('recorta la descripción a 120 caracteres', () => {
    const larga = respuestaDeLasVariables([{ moneda: '5', descripcion: 'a'.repeat(300) }]);
    expect(extraerMonedasDisponibles(larga)[0]?.descripcion).toHaveLength(120);
  });

  it('una lista vacía es una lista vacía, no un error', () => {
    expect(extraerMonedasDisponibles(respuestaDeLasVariables([]))).toEqual([]);
  });

  it('rechaza DOCTYPE, fallas SOAP y respuestas de otra operación', () => {
    expect(() => extraerMonedasDisponibles(RESPUESTA_CON_DOCTYPE)).toThrow(RespuestaInvalida);
    expect(() => extraerMonedasDisponibles(FALLA_SOAP)).toThrow(RespuestaInvalida);
    expect(() => extraerMonedasDisponibles(respuestaDelDia('18/11/2026', '7.6'))).toThrow(RespuestaInvalida);
  });
});
