import { describe, expect, it } from 'vitest';
import { TipoDeCambioNoDisponible } from '../dominio/errores.js';
import { TiposDeCambioEnMemoria } from '../pruebas/tipos-de-cambio-en-memoria.js';
import { TiposDeCambio } from './tipos-de-cambio.js';

/** Hoy es miércoles 18 de noviembre de 2026; sábado 14 y domingo 15 no se publican (el 13, viernes, sí). */
const HOY = '2026-11-18';

function armar(hoy = HOY) {
  const guardados = new TiposDeCambioEnMemoria();
  const servicio = new TiposDeCambio({ guardados, reloj: { hoy: async () => hoy } });
  return { guardados, servicio };
}

describe('TiposDeCambio.vigente', () => {
  it('el quetzal es siempre uno y exacto, sin consultar nada', async () => {
    const { servicio, guardados } = armar();

    const tipo = await servicio.vigente('GTQ', '2026-11-18');

    expect(tipo).toMatchObject({
      moneda: 'GTQ',
      referencia: '1',
      exacto: true,
      origen: 'base',
      motivoDelAnterior: null,
    });
    expect(guardados.lecturas).toBe(0);
  });

  it('con una publicación del día es exacto y no pide aviso', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('USD', '2026-11-17', '7.64489');

    const tipo = await servicio.vigente('USD', '2026-11-17');

    expect(tipo).toEqual({
      moneda: 'USD',
      fecha: '2026-11-17',
      fechaDelTipo: '2026-11-17',
      referencia: '7.64489',
      compra: null,
      venta: null,
      origen: 'banguat',
      exacto: true,
      motivoDelAnterior: null,
    });
  });

  it('con varias versiones del mismo día rige la última', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('USD', '2026-11-17', '7.64');
    guardados.ponerManual('USD', '2026-11-17', '7.65');

    const tipo = await servicio.vigente('USD', '2026-11-17');

    expect(tipo).toMatchObject({ referencia: '7.65', origen: 'manual', exacto: true });
  });

  it('con un hueco usa el anterior y dice que faltó la publicación', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('USD', '2026-11-09', '7.60');

    const tipo = await servicio.vigente('USD', '2026-11-10');

    expect(tipo).toMatchObject({
      fechaDelTipo: '2026-11-09',
      referencia: '7.60',
      exacto: false,
      motivoDelAnterior: 'falta_publicacion',
    });
  });

  it('un tipo de 7 días de antigüedad se usa y uno de 8 no', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('USD', '2026-11-10', '7.60');

    expect(await servicio.vigente('USD', '2026-11-17')).toMatchObject({ fechaDelTipo: '2026-11-10' });
    await expect(servicio.vigente('USD', '2026-11-18')).rejects.toMatchObject({
      codigo: 'tipo_de_cambio_no_disponible',
      detalles: { moneda: 'USD', fecha: '2026-11-18', ultimaFechaPublicada: '2026-11-10' },
    });
  });

  it('sin ningún tipo no está disponible y la última fecha publicada es nula', async () => {
    const { servicio } = armar();

    const error = await servicio.vigente('EUR', '2026-11-17').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(TipoDeCambioNoDisponible);
    expect(error).toMatchObject({ detalles: { ultimaFechaPublicada: null } });
  });

  it('una fecha futura sin publicación no está disponible, aunque haya un tipo de ayer', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('USD', '2026-11-18', '7.64');

    await expect(servicio.vigente('USD', '2026-11-19')).rejects.toBeInstanceOf(TipoDeCambioNoDisponible);
  });

  it('una fecha futura ya publicada (el dólar de mañana) se usa como exacta', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('USD', '2026-11-19', '7.65');

    expect(await servicio.vigente('USD', '2026-11-19')).toMatchObject({ referencia: '7.65', exacto: true });
  });

  it('`delCierre` toma el tipo vigente del último día del mes', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('USD', '2026-10-30', '7.70');
    guardados.poner('USD', '2026-10-31', '7.71');

    expect(await servicio.delCierre('USD', '2026-10')).toMatchObject({ fecha: '2026-10-31', referencia: '7.71' });
  });
});

describe('días sin cálculo de las monedas distintas del dólar', () => {
  it('el sábado y el domingo usan el del viernes sin pedir confirmación', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('EUR', '2026-11-13', '8.81');

    for (const fecha of ['2026-11-14', '2026-11-15']) {
      expect(await servicio.vigente('EUR', fecha)).toMatchObject({
        fechaDelTipo: '2026-11-13',
        exacto: false,
        motivoDelAnterior: 'dia_sin_calculo',
      });
    }
  });

  it('un asueto entre semana sin su fila es falta de publicación: el Banguat sí publica en asuetos', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('EUR', '2026-10-19', '8.80');

    const tipo = await servicio.vigente('EUR', '2026-10-20');

    expect(tipo).toMatchObject({ fechaDelTipo: '2026-10-19', motivoDelAnterior: 'falta_publicacion' });
  });

  it('un día hábil sin publicación sí pide confirmación', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('EUR', '2026-11-09', '8.81');

    expect(await servicio.vigente('EUR', '2026-11-10')).toMatchObject({ motivoDelAnterior: 'falta_publicacion' });
  });

  it('un sábado cuyo viernes no se publicó es falta de publicación', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('EUR', '2026-11-12', '8.81');

    expect(await servicio.vigente('EUR', '2026-11-14')).toMatchObject({ motivoDelAnterior: 'falta_publicacion' });
  });

  it('el dólar se publica todos los días: un domingo sin publicación es falta de publicación', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('USD', '2026-11-13', '7.64');

    expect(await servicio.vigente('USD', '2026-11-15')).toMatchObject({ motivoDelAnterior: 'falta_publicacion' });
  });

  it('el tope de 7 días sigue valiendo para los días sin cálculo', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('EUR', '2026-11-06', '8.81');

    await expect(servicio.vigente('EUR', '2026-11-15')).rejects.toBeInstanceOf(TipoDeCambioNoDisponible);
  });
});

describe('TiposDeCambio.consultar y la memoria', () => {
  it('consultar no lanza error: dice que no es utilizable y trae el tipo viejo', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('USD', '2026-11-01', '7.50');

    const consulta = await servicio.consultar('USD', '2026-11-17');

    expect(consulta).toMatchObject({
      utilizable: false,
      fechaDelTipo: '2026-11-01',
      referencia: '7.50',
      exacto: false,
    });
  });

  it('consultar sin ningún tipo devuelve todo nulo', async () => {
    const { servicio } = armar();

    expect(await servicio.consultar('EUR', '2026-11-17')).toMatchObject({
      utilizable: false,
      fechaDelTipo: null,
      referencia: null,
      origen: null,
    });
  });

  it('guarda en memoria lo leído hasta que se invalida', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('USD', '2026-11-17', '7.64');
    await servicio.vigente('USD', '2026-11-17');
    await servicio.vigente('USD', '2026-11-17');
    expect(guardados.lecturas).toBe(1);

    guardados.ponerManual('USD', '2026-11-17', '7.99');
    expect((await servicio.vigente('USD', '2026-11-17')).referencia).toBe('7.64');
    servicio.invalidar();

    expect((await servicio.vigente('USD', '2026-11-17')).referencia).toBe('7.99');
  });

  it('la serie pasa por el repositorio', async () => {
    const { servicio, guardados } = armar();
    guardados.poner('USD', '2026-11-16', '7.60');
    guardados.poner('USD', '2026-11-17', '7.64');

    const serie = await servicio.serie('USD', '2026-11-16', '2026-11-17');

    expect(serie.map((f) => f.fecha)).toEqual(['2026-11-16', '2026-11-17']);
  });
});
