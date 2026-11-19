import { describe, expect, it } from 'vitest';
import { RespuestaInvalida } from '../../dominio/errores.js';
import {
  FALLA_SOAP,
  RANGO_CON_FIN_DE_SEMANA,
  LISTA_DE_MONEDAS,
  RANGO_DEL_ARS,
  RANGO_DEL_CRC,
  RANGO_DEL_EUR,
  RANGO_DE_SEMANA_SANTA,
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
const EUR = { moneda: 'EUR', codigoBanguat: 24 };
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
      filaDelRango({ moneda: '24', fecha: '18/11/2026', venta: '1.1257' }),
      filaDelRango({ fecha: '18/11/2026', venta: '7.64489' }),
    ]);
    expect(extraerTiposDelRango(xml, HOY, DEL_DOLAR).publicaciones).toHaveLength(1);
  });

  it('si compra y venta del dólar difieren, la fila es ambigua y se rechaza (el dólar tiene una sola referencia)', () => {
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
  const resultado = extraerTiposDelRango(RANGO_DEL_EUR, '2026-10-23', DEL_EURO);

  it('trae el promedio de compra y venta del euro (dólares por euro), sin sábado ni domingo, con el asueto', () => {
    expect(resultado.publicaciones.map((p) => [p.fecha, p.referencia, p.codigoBanguat])).toEqual([
      ['2026-10-16', '1.12565', 24],
      ['2026-10-19', '1.12145', 24],
      ['2026-10-20', '1.12375', 24],
      ['2026-10-21', '1.12275', 24],
      ['2026-10-22', '1.1195', 24],
      ['2026-10-23', '1.12', 24],
    ]);
    expect(resultado.publicaciones[0]).toMatchObject({ moneda: 'EUR', compra: '1.1256', venta: '1.1257' });
  });

  it('compra distinta de venta ya no es ambigua: no se rechaza nada', () => {
    expect(resultado.rechazadas).toEqual([]);
  });

  it('ignora el código que no se pidió (el 99)', () => {
    expect(resultado.publicaciones.every((p) => p.codigoBanguat === 24)).toBe(true);
  });

  it('el rango del dólar no toma filas del euro', () => {
    expect(
      extraerTiposDelRango(RANGO_DEL_EUR, HOY, { ...DEL_DOLAR, operacion: 'TipoCambioRangoMoneda' }).publicaciones,
    ).toEqual([]);
  });
});

describe('extraerTiposDelRango del colón y del peso argentino', () => {
  const CRC = { moneda: 'CRC', codigoBanguat: 16 };
  const ARS = { moneda: 'ARS', codigoBanguat: 29 };

  it('el colón del 18/11 queda en el promedio publicado, también en notación científica', () => {
    const resultado = extraerTiposDelRango(RANGO_DEL_CRC, HOY, { operacion: 'TipoCambioRangoMoneda', monedas: [CRC] });
    expect(resultado.publicaciones.map((p) => [p.fecha, p.referencia])).toEqual([
      ['2026-11-17', '447.35'],
      ['2026-11-18', '446.905'],
      ['2026-11-19', '446.905'],
    ]);
  });

  it('el peso argentino trae un decimal más que lo publicado', () => {
    const resultado = extraerTiposDelRango(RANGO_DEL_ARS, HOY, { operacion: 'TipoCambioRangoMoneda', monedas: [ARS] });
    expect(resultado.publicaciones[0]).toMatchObject({ referencia: '1556.010135', compra: '1555.84009' });
  });

  it('el dólar de Semana Santa se repite tal cual hasta el domingo', () => {
    const resultado = extraerTiposDelRango(RANGO_DE_SEMANA_SANTA, HOY, DEL_DOLAR);
    expect(resultado.publicaciones.map((p) => p.referencia)).toEqual(Array(5).fill('7.64121'));
  });
});

describe('extraerTipoDelDia con otras monedas pedidas', () => {
  const xml = respuestaDelDia('18/11/2026', '7.64489').replace(
    '</CambioDolar>',
    '</CambioDolar><CambioDia><Var><moneda>24</moneda><fecha>18/11/2026</fecha><venta>1.1257</venta><compra>1.1256</compra></Var>' +
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
      { codigo: 24, descripcion: 'Euro' },
      { codigo: 3, descripcion: 'Yenes & otras' },
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
