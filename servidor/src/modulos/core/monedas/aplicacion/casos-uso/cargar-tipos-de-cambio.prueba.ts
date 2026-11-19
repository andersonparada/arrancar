import { describe, expect, it } from 'vitest';
import { CargaDelBanguatEnCurso } from '../errores.js';
import { armar, completar, fallo, publicacion } from '../../pruebas/escenario-de-carga.js';

describe('la madrugada (el dólar)', () => {
  it('a las 06:00 carga el dólar del día y deja una fila por llamada en la bitácora', async () => {
    const { carga, cargas, fuente, reloj, guardados } = armar();
    fuente.publicaciones.push(publicacion('USD', '2026-11-18', '7.65'));

    expect(await carga.siTocaAhora()).toBe('madrugada');

    expect(cargas.tipos).toEqual([expect.objectContaining({ moneda: 'USD', fecha: '2026-11-18', referencia: '7.65' })]);
    expect(cargas.consultas).toMatchObject([
      { operacion: 'TipoCambioDia', vuelta: 'madrugada', moneda: null, resultado: 'exito', disparadaPor: null },
    ]);
    expect(guardados.veces).toBe(1);
    reloj.ir('06:15');
    expect(await carga.siTocaAhora()).toBeNull();
  });

  it('el dólar reintenta ante una falla del Banguat dentro de la misma vuelta', async () => {
    const { carga, cargas, fuente } = armar();
    fuente.publicaciones.push(publicacion('USD', '2026-11-18', '7.65'));
    fuente.fallosPendientes.push(fallo());

    await carga.siTocaAhora();

    expect(cargas.tipos).toHaveLength(1);
    expect(cargas.consultas).toMatchObject([{ resultado: 'exito' }]);
    expect(fuente.consultas).toBe(2);
  });

  it('si el Banguat sigue fallando queda `error` y se reintenta solo en la hora siguiente de la lista', async () => {
    const { carga, cargas, fuente, reloj } = armar();
    fuente.publicaciones.push(publicacion('USD', '2026-11-18', '7.65'));
    fuente.fallosPendientes.push(fallo(), fallo(), fallo());

    await carga.siTocaAhora();
    expect(cargas.consultas).toMatchObject([{ resultado: 'error' }]);
    reloj.ir('06:15');
    expect(await carga.siTocaAhora()).toBeNull();
    reloj.ir('06:30');
    expect(await carga.siTocaAhora()).toBe('madrugada');

    expect(cargas.consultas.map((c) => c.resultado)).toEqual(['error', 'exito']);
  });
});

describe('la mañana (las demás monedas)', () => {
  it('a las 09:30 pide cada otra moneda activa con la semana hasta hoy y no vuelve a pedir el dólar', async () => {
    const { carga, cargas, fuente, reloj } = armar();
    cargas.poner('USD', '2026-11-18', '7.65');
    completar(cargas, '2026-11-18');
    fuente.publicaciones.push(publicacion('EUR', '2026-11-18', '1.19'));
    reloj.ir('09:30');

    expect(await carga.siTocaAhora()).toBe('manana');

    expect(cargas.tipos.at(-1)).toMatchObject({
      moneda: 'EUR',
      fecha: '2026-11-18',
      referencia: '9.1035',
      compra: '1.19',
      convencion: 'usd_por_unidad',
      dolarUsadoId: 'USD-2026-11-18',
    });
    expect(cargas.consultas).toMatchObject([
      { operacion: 'TipoCambioRangoMoneda', vuelta: 'manana', moneda: 'EUR', desde: '2026-11-12', hasta: '2026-11-18' },
    ]);
    expect(fuente.consultas).toBe(1);
  });

  it('las demás monedas no reintentan: la falla queda en la bitácora y la vuelta siguiente es la del día siguiente', async () => {
    const { carga, cargas, fuente, reloj } = armar();
    cargas.poner('USD', '2026-11-18');
    completar(cargas, '2026-11-18');
    fuente.publicaciones.push(publicacion('EUR', '2026-11-18', '9.10'));
    fuente.fallosPendientes.push(fallo());
    reloj.ir('09:30');

    await carga.siTocaAhora();
    reloj.ir('11:00');
    await carga.siTocaAhora();

    expect(cargas.consultas).toMatchObject([{ moneda: 'EUR', resultado: 'error' }]);
    expect(fuente.consultas).toBe(1);
  });

  it('una moneda sin publicación el sábado no reintenta ni avisa', async () => {
    const { carga, cargas, fuente, reloj } = armar();
    cargas.poner('USD', '2026-11-21');
    completar(cargas, '2026-11-21');
    reloj.ir('09:30', '21');

    await carga.siTocaAhora();
    reloj.ir('13:00', '21');
    await carga.siTocaAhora();

    expect(cargas.consultas).toMatchObject([{ moneda: 'EUR', resultado: 'sin_datos', detalle: null }]);
    expect(fuente.consultas).toBe(1);
  });

  it('una moneda que cambia 30 % no se guarda', async () => {
    const { carga, cargas, fuente, reloj } = armar();
    cargas.poner('USD', '2026-11-18', '7.65');
    cargas.poner('EUR', '2026-11-17', '9.00');
    completar(cargas, '2026-11-18');
    fuente.publicaciones.push(publicacion('EUR', '2026-11-18', '1.5'));
    reloj.ir('09:30');

    await carga.siTocaAhora();

    expect(cargas.tipos.some((t) => t.moneda === 'EUR' && t.fecha === '2026-11-18')).toBe(false);
    expect(cargas.consultas).toMatchObject([{ resultado: 'variacion_excesiva', filasRechazadas: 1 }]);
  });

  it('solo se piden las monedas activas con código: sin otras, la vuelta no pide nada', async () => {
    const { carga, cargas, fuente, reloj } = armar();
    cargas.monedas = [{ moneda: 'USD', codigoBanguat: 2, convencion: 'quetzales_por_unidad' }];
    cargas.poner('USD', '2026-11-18');
    completar(cargas, '2026-11-18');
    reloj.ir('09:30');

    expect(await carga.siTocaAhora()).toBe('manana');
    reloj.ir('10:00');
    expect(await carga.siTocaAhora()).toBeNull();

    expect(fuente.consultas).toBe(0);
  });
});

describe('la noche', () => {
  it('adelanta el dólar de mañana y pide las demás que aún no tienen el de hoy', async () => {
    const { carga, cargas, fuente, reloj } = armar();
    cargas.poner('USD', '2026-11-18', '7.65');
    completar(cargas, '2026-11-18');
    cargas.consultas.push({
      ...{ iniciadaEn: new Date('2026-11-18T09:31:00-06:00'), terminadaEn: new Date('2026-11-18T09:31:01-06:00') },
      operacion: 'TipoCambioRangoMoneda',
      vuelta: 'manana',
      moneda: 'EUR',
      codigoBanguat: 24,
      desde: '2026-11-12',
      hasta: '2026-11-18',
      resultado: 'sin_datos',
      filasRechazadas: 0,
      detalle: null,
      disparadaPor: null,
    });
    fuente.publicaciones.push(publicacion('USD', '2026-11-19', '7.66'), publicacion('EUR', '2026-11-18', '1.19'));
    reloj.ir('21:00');

    expect(await carga.siTocaAhora()).toBe('noche');

    const hechas = cargas.consultas.filter((c) => c.vuelta === 'noche');
    expect(hechas).toMatchObject([
      { operacion: 'TipoCambioRango', moneda: 'USD', desde: '2026-11-18', hasta: '2026-11-19' },
      { operacion: 'TipoCambioRangoMoneda', moneda: 'EUR' },
    ]);
    expect(cargas.tipos.filter((t) => t.fecha >= '2026-11-18').map((t) => t.moneda + t.fecha)).toEqual(
      expect.arrayContaining(['USD2026-11-19', 'EUR2026-11-18']),
    );
  });
});

describe('el relleno y el arranque', () => {
  it('solo pide a las monedas con huecos en los últimos 45 días', async () => {
    const { carga, cargas, fuente } = armar();
    completar(cargas, '2026-11-18');

    await carga.alArrancar();
    expect(fuente.consultas).toBe(0);

    const hueco = cargas.tipos.findIndex((t) => t.moneda === 'USD' && t.fecha === '2026-11-10');
    cargas.tipos.splice(hueco, 1);
    fuente.publicaciones.push(publicacion('USD', '2026-11-10', '7.69'));
    await carga.alArrancar();

    expect(cargas.consultas).toMatchObject([
      { vuelta: 'arranque', moneda: 'USD', operacion: 'TipoCambioRango', desde: '2026-11-10', hasta: '2026-11-10' },
    ]);
    expect(cargas.tipos.some((t) => t.moneda === 'USD' && t.fecha === '2026-11-10')).toBe(true);
  });

  it('para las demás monedas solo cuentan como hueco los días hábiles', async () => {
    const { carga, cargas, fuente } = armar();
    completar(cargas, '2026-11-18');
    cargas.tipos.splice(
      cargas.tipos.findIndex((t) => t.moneda === 'EUR' && t.fecha === '2026-11-13'),
      1,
    );
    cargas.tipos.splice(
      cargas.tipos.findIndex((t) => t.moneda === 'EUR' && t.fecha === '2026-11-12'),
      1,
    );

    await carga.alArrancar();

    expect(cargas.consultas).toMatchObject([{ moneda: 'EUR', desde: '2026-11-12', hasta: '2026-11-13' }]);
    expect(fuente.consultas).toBe(1);
  });

  it('al arrancar actualiza la lista si solo tiene la semilla o es vieja', async () => {
    const { carga, cargas, fuente } = armar();
    completar(cargas, '2026-11-18');
    cargas.estadoDeLista = { vistaPorUltimaVez: null, monedas: 1 };
    fuente.monedasDelBanguat.push({ codigo: 24, descripcion: '  Euro  ' });

    await carga.alArrancar();

    expect(cargas.listas).toEqual([[{ codigo: 24, descripcion: 'Euro' }]]);
    expect(cargas.consultas).toMatchObject([
      { operacion: 'VariablesDisponibles', vuelta: 'lista', resultado: 'exito' },
    ]);
  });

  it('una lista vacía o con error no toca nada y queda en la bitácora', async () => {
    const { carga, cargas, fuente } = armar();
    completar(cargas, '2026-11-18');
    cargas.estadoDeLista = { vistaPorUltimaVez: null, monedas: 1 };

    await carga.alArrancar();
    fuente.fallosPendientes.push(fallo(), fallo(), fallo());
    await carga.alArrancar();

    expect(cargas.listas).toEqual([]);
    expect(cargas.consultas.map((c) => c.resultado)).toEqual(['sin_datos', 'error']);
  });
});

describe('una sola carga a la vez y «Cargar ahora»', () => {
  it('con el cerrojo tomado la vuelta no hace nada y la manual da 409', async () => {
    const { carga, fuente, cerrojo } = armar();
    cerrojo.ocupado = true;

    expect(await carga.siTocaAhora()).toBeNull();
    await expect(carga.cargarAhora({ usuarioId: 'u1' })).rejects.toBeInstanceOf(CargaDelBanguatEnCurso);
    expect(fuente.consultas).toBe(0);
  });

  it('carga el rango pedido de todas las monedas activas con código, a nombre de quien la pidió', async () => {
    const { carga, cargas, fuente, guardados } = armar();
    fuente.publicaciones.push(publicacion('USD', '2026-11-17', '7.65'), publicacion('EUR', '2026-11-17', '1.19'));

    const resumenes = await carga.cargarAhora({ usuarioId: 'u1', desde: '2026-11-16', hasta: '2026-11-18' });

    expect(resumenes.map((r) => [r.moneda, r.filasNuevas])).toEqual([
      ['USD', 1],
      ['EUR', 1],
    ]);
    expect(cargas.consultas.every((c) => c.vuelta === 'manual' && c.disparadaPor === 'u1')).toBe(true);
    expect(guardados.veces).toBe(1);
  });

  it('rechaza un rango al revés, de más de 366 días o más allá de mañana', async () => {
    const { carga, fuente } = armar();

    const alReves = carga.cargarAhora({ usuarioId: 'u', desde: '2026-11-18', hasta: '2026-11-10' });
    const largo = carga.cargarAhora({ usuarioId: 'u', desde: '2025-11-01', hasta: '2026-11-18' });
    const futuro = carga.cargarAhora({ usuarioId: 'u', desde: '2026-11-18', hasta: '2026-11-20' });

    await expect(alReves).rejects.toMatchObject({ codigo: 'rango_de_carga_invalido' });
    await expect(largo).rejects.toMatchObject({ codigo: 'rango_de_carga_invalido' });
    await expect(futuro).rejects.toMatchObject({ codigo: 'rango_de_carga_invalido' });
    expect(fuente.consultas).toBe(0);
  });
});
