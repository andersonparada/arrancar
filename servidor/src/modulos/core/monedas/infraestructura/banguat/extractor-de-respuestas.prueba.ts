import { describe, expect, it } from 'vitest';
import { RespuestaInvalida } from '../../dominio/errores.js';
import {
  FALLA_SOAP,
  RANGO_CON_FIN_DE_SEMANA,
  RESPUESTA_CON_DOCTYPE,
  filaDelRango,
  respuestaDelDia,
  respuestaDelRango,
} from '../../pruebas/respuestas-grabadas-del-banguat.js';
import { extraerTipoDelDia, extraerTiposDelRango } from './extractor-de-respuestas.js';

const HOY = '2026-11-18';

describe('extraerTipoDelDia', () => {
  it('lee la referencia del dólar', () => {
    const resultado = extraerTipoDelDia(respuestaDelDia('18/11/2026', '7.64489'), HOY);
    expect(resultado.publicaciones).toEqual([{ moneda: 'USD', fecha: '2026-11-18', referencia: '7.64489' }]);
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
    const resultado = extraerTiposDelRango(RANGO_CON_FIN_DE_SEMANA, HOY);
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
    const resultado = extraerTiposDelRango(respuestaDelRango([]), HOY);
    expect(resultado).toEqual({ publicaciones: [], rechazadas: [] });
  });

  it('ignora las monedas que no se manejan', () => {
    const xml = respuestaDelRango([
      filaDelRango({ moneda: '24', fecha: '18/11/2026', venta: '8.9' }),
      filaDelRango({ fecha: '18/11/2026', venta: '7.64489' }),
    ]);
    expect(extraerTiposDelRango(xml, HOY).publicaciones).toHaveLength(1);
  });

  it('si compra y venta difieren no hay referencia y se rechaza la fila', () => {
    const xml = respuestaDelRango([filaDelRango({ fecha: '18/11/2026', venta: '7.65', compra: '7.60' })]);
    const resultado = extraerTiposDelRango(xml, HOY);
    expect(resultado.publicaciones).toEqual([]);
    expect(resultado.rechazadas).toEqual([{ moneda: 'USD', fecha: '18/11/2026', motivo: 'sin_referencia' }]);
  });

  it('no duplica una misma fecha y descarta fechas muy futuras', () => {
    const xml = respuestaDelRango([
      filaDelRango({ fecha: '18/11/2026', venta: '7.64489' }),
      filaDelRango({ fecha: '18/11/2026', venta: '7.70000' }),
      filaDelRango({ fecha: '01/12/2026', venta: '7.7' }),
    ]);
    const resultado = extraerTiposDelRango(xml, HOY);
    expect(resultado.publicaciones).toEqual([{ moneda: 'USD', fecha: '2026-11-18', referencia: '7.64489' }]);
    expect(resultado.rechazadas).toHaveLength(1);
  });

  it('rechaza DOCTYPE', () => {
    expect(() => extraerTiposDelRango(RESPUESTA_CON_DOCTYPE, HOY)).toThrow(RespuestaInvalida);
  });
});
