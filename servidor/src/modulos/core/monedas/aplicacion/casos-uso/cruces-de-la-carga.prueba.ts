import { describe, expect, it } from 'vitest';
import { armar, completar, publicacion } from '../../pruebas/escenario-de-carga.js';

describe('los días de las demás monedas (adenda B.9)', () => {
  it('un sábado no es hueco y un asueto entre semana sí', async () => {
    const { carga, cargas, fuente } = armar();
    completar(cargas, '2026-11-18');
    cargas.tipos.splice(
      cargas.tipos.findIndex((t) => t.moneda === 'EUR' && t.fecha === '2026-10-20'),
      1,
    );
    fuente.publicaciones.push(publicacion('EUR', '2026-10-20', '1.17'));

    await carga.alArrancar();

    expect(cargas.consultas).toMatchObject([{ moneda: 'EUR', desde: '2026-10-20', hasta: '2026-10-20' }]);
    expect(cargas.tipos.some((t) => t.moneda === 'EUR' && t.fecha === '2026-10-20')).toBe(true);
    expect(cargas.tipos.some((t) => t.moneda === 'EUR' && ['2026-10-24', '2026-10-25'].includes(t.fecha))).toBe(false);
  });

  it('tras un viernes con euro y un sábado con dólar no aparece una fila de euro del sábado', async () => {
    const { carga, cargas, fuente, reloj } = armar();
    fuente.publicaciones.push(
      publicacion('USD', '2026-11-20', '7.65'),
      publicacion('USD', '2026-11-21', '7.65'),
      publicacion('EUR', '2026-11-20', '1.18'),
    );

    reloj.ir('10:00', '21');

    await carga.cargarAhora({ usuarioId: 'u1', desde: '2026-11-20', hasta: '2026-11-21' });

    expect(cargas.tipos.filter((t) => t.moneda === 'EUR').map((t) => t.fecha)).toEqual(['2026-11-20']);
  });

  it('el euro sin dólar de su día no se guarda y la vuelta de relleno lo trae cuando llega el dólar', async () => {
    const { carga, cargas, fuente } = armar();
    completar(cargas, '2026-11-18');
    cargas.tipos.splice(
      cargas.tipos.findIndex((t) => t.moneda === 'USD' && t.fecha === '2026-11-10'),
      1,
    );
    cargas.tipos.splice(
      cargas.tipos.findIndex((t) => t.moneda === 'EUR' && t.fecha === '2026-11-10'),
      1,
    );
    fuente.publicaciones.push(publicacion('EUR', '2026-11-10', '1.17'));

    await carga.alArrancar();
    expect(cargas.tipos.some((t) => t.moneda === 'EUR' && t.fecha === '2026-11-10')).toBe(false);
    expect(cargas.consultas.at(-1)).toMatchObject({ moneda: 'EUR', resultado: 'sin_dolar_del_dia' });

    fuente.publicaciones.push(publicacion('USD', '2026-11-10', '7.70'));
    await carga.alArrancar();
    expect(cargas.tipos.find((t) => t.moneda === 'EUR' && t.fecha === '2026-11-10')).toMatchObject({
      referencia: '9.009',
      dolarUsadoId: 'USD-2026-11-10',
    });
  });

  it('un euro invertido contra lo publicado antes no se guarda: convencion_dudosa', async () => {
    const { carga, cargas, fuente, reloj } = armar();
    cargas.poner('USD', '2026-11-18', '7.65');
    completar(cargas, '2026-11-18');
    const anterior = cargas.tipos.find((t) => t.moneda === 'EUR' && t.fecha === '2026-11-17')!;
    Object.assign(anterior, { referencia: '8.61', compra: '1.1257', venta: '1.1257', convencion: 'usd_por_unidad' });
    fuente.publicaciones.push(publicacion('EUR', '2026-11-18', '0.8883'));
    reloj.ir('09:30');

    await carga.siTocaAhora();

    expect(cargas.tipos.some((t) => t.moneda === 'EUR' && t.fecha === '2026-11-18')).toBe(false);
    expect(cargas.consultas).toMatchObject([{ resultado: 'convencion_dudosa', filasRechazadas: 1 }]);
  });
});

describe('la noche: el dólar de mañana', () => {
  it('si el sábado la noche no pide las demás monedas, solo el dólar de mañana', async () => {
    const { carga, cargas, fuente, reloj } = armar();
    cargas.poner('USD', '2026-11-21', '7.65');
    completar(cargas, '2026-11-21');
    cargas.consultas.push({ ...hechaDe('manana', '2026-11-21T09:31:00-06:00') });
    fuente.publicaciones.push(publicacion('USD', '2026-11-22', '7.65'));
    reloj.ir('21:00', '21');

    expect(await carga.siTocaAhora()).toBe('noche');

    const hechas = cargas.consultas.filter((c) => c.vuelta === 'noche');
    expect(hechas).toMatchObject([{ moneda: 'USD', operacion: 'TipoCambioRango' }]);
  });

  it('el dólar que no llegó se reintenta a las 22:00 y a las 23:30, solo el dólar', async () => {
    const { carga, cargas, fuente, reloj } = armar();
    cargas.poner('USD', '2026-11-18', '7.65');
    completar(cargas, '2026-11-18');
    cargas.poner('EUR', '2026-11-18', '9.00');
    cargas.consultas.push(hechaDe('manana', '2026-11-18T09:31:00-06:00'));
    reloj.ir('21:00');
    expect(await carga.siTocaAhora()).toBe('noche');
    reloj.ir('21:45');
    expect(await carga.siTocaAhora()).toBeNull();

    reloj.ir('22:00');
    expect(await carga.siTocaAhora()).toBe('dolarDeManana');
    fuente.publicaciones.push(publicacion('USD', '2026-11-19', '7.66'));
    reloj.ir('23:30');
    expect(await carga.siTocaAhora()).toBe('dolarDeManana');
    reloj.ir('23:45');
    expect(await carga.siTocaAhora()).toBeNull();

    const reintentos = cargas.consultas.filter((c) => c.vuelta === 'noche').slice(1);
    expect(reintentos).toMatchObject([
      { moneda: 'USD', desde: '2026-11-19', hasta: '2026-11-19', resultado: 'sin_datos' },
      { moneda: 'USD', desde: '2026-11-19', hasta: '2026-11-19', resultado: 'exito' },
    ]);
  });
});

function hechaDe(vuelta: 'manana' | 'noche', inicio: string) {
  const iniciadaEn = new Date(inicio);
  return {
    iniciadaEn,
    terminadaEn: new Date(iniciadaEn.getTime() + 1000),
    operacion: 'TipoCambioRangoMoneda' as const,
    vuelta,
    moneda: 'EUR',
    codigoBanguat: 24,
    desde: null,
    hasta: null,
    resultado: 'sin_datos' as const,
    filasRechazadas: 0,
    detalle: null,
    disparadaPor: null,
  };
}
