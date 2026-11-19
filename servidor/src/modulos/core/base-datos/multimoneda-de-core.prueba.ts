/**
 * Prueba de integración contra PostgreSQL: el catálogo de monedas del núcleo, su semilla y el código estable del
 * Banguat (`docs/modulos/diseno-multimoneda.md` §6.1 y adenda A.3 y A.4).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codigoDeError, EscenarioDeMultimoneda, restriccionDeError } from './multimoneda-de-core.soporte.js';

const escenario = new EscenarioDeMultimoneda();

beforeAll(() => escenario.preparar());
afterAll(() => escenario.cerrar());

describe('catálogo de monedas', () => {
  it('el quetzal y el dólar nacen activos con sus letras, y el dólar con su código 2', async () => {
    const { rows } = await escenario.propietario.query(
      `select codigo, activa, codigo_banguat, letras_singular, letras_plural from core.monedas
       where codigo in ('GTQ', 'USD') order by codigo`,
    );

    expect(rows).toEqual([
      { codigo: 'GTQ', activa: true, codigo_banguat: null, letras_singular: 'QUETZAL', letras_plural: 'QUETZALES' },
      { codigo: 'USD', activa: true, codigo_banguat: 2, letras_singular: 'DÓLAR', letras_plural: 'DÓLARES' },
    ]);
  });

  it('las demás monedas de la lista nacen inactivas, sin código y sin letras; el yen y el won sin decimales', async () => {
    const { rows } = await escenario.propietario.query(
      `select codigo, decimales from core.monedas
       where activa = false and codigo_banguat is null and letras_singular is null order by codigo`,
    );
    const codigos = rows.map((fila) => fila.codigo);

    expect(codigos).toEqual(expect.arrayContaining(['EUR', 'GBP', 'MXN', 'JPY', 'KRW', 'HNL', 'DOP']));
    expect(rows.filter((fila) => fila.decimales === 0).map((fila) => fila.codigo)).toEqual(['JPY', 'KRW']);
    expect(codigos).not.toContain('GTQ');
    expect(codigos).not.toContain('USD');
  });

  it('la lista del Banguat nace solo con el dólar (código 2)', async () => {
    const { rows } = await escenario.propietario.query(`select codigo from core.monedas_del_banguat where codigo = 2`);

    expect(rows).toHaveLength(1);
  });

  it('activar una moneda sin dos decimales falla', async () => {
    const activar = escenario.propietario.query(`update core.monedas set activa = true where codigo = 'JPY'`);

    expect(await restriccionDeError(activar)).toBe('monedas_activa_con_dos_decimales');
  });

  it('la llave rechaza un código que el Banguat nunca ofreció', async () => {
    const asignar = escenario.propietario.query(`update core.monedas set codigo_banguat = 999 where codigo = 'EUR'`);

    expect(await codigoDeError(asignar)).toBe('23503');
  });

  it('dos monedas no pueden tener el mismo código', async () => {
    const { propietario } = escenario;
    await propietario.query(`update core.monedas set codigo_banguat = 24 where codigo = 'EUR'`);
    const repetir = propietario.query(`update core.monedas set codigo_banguat = 24 where codigo = 'GBP'`);

    expect(await restriccionDeError(repetir)).toBe('monedas_codigo_banguat_unico');
    await propietario.query(`update core.monedas set codigo_banguat = null where codigo = 'EUR'`);
  });

  it('el quetzal no puede tener código del Banguat', async () => {
    const asignar = escenario.propietario.query(`update core.monedas set codigo_banguat = 3 where codigo = 'GTQ'`);

    expect(await restriccionDeError(asignar)).toBe('monedas_gtq_sin_codigo');
  });

  it('las letras van completas o ninguna', async () => {
    const solo = escenario.propietario.query(`update core.monedas set letras_singular = 'EURO' where codigo = 'EUR'`);

    expect(await restriccionDeError(solo)).toBe('monedas_letras_completas');
  });

  it('la aplicación edita monedas pero no las borra', async () => {
    const editar = escenario.aplicacion.query(`update core.monedas set activa = false where codigo = 'EUR'`);
    const borrar = escenario.aplicacion.query(`delete from core.monedas where codigo = 'EUR'`);

    expect(await codigoDeError(editar)).toBeUndefined();
    expect(await codigoDeError(borrar)).toBe('42501');
  });
});

describe('código estable de la moneda', () => {
  const cambiarCodigo = (codigo: string) =>
    escenario.propietario.query(`update core.monedas set codigo_banguat = ${codigo} where codigo = 'EUR'`);

  it('con tipos del Banguat cargados, solo deja el mismo código o quitarlo', async () => {
    await cambiarCodigo('24');
    await escenario.tipoDelBanguat({ moneda: 'EUR', fecha: '2026-11-02' });

    expect(await restriccionDeError(cambiarCodigo('9'))).toBe('monedas_codigo_banguat_estable');
    expect(await codigoDeError(cambiarCodigo('24'))).toBeUndefined();
    expect(await codigoDeError(cambiarCodigo('null'))).toBeUndefined();
  });

  it('sin tipos del Banguat, o solo con tipos manuales, el código se puede cambiar', async () => {
    await escenario.propietario.query(`delete from core.tipos_de_cambio where moneda = 'EUR'`);
    await escenario.tipoManual({ moneda: 'EUR', fecha: '2026-11-03' });

    expect(await codigoDeError(cambiarCodigo('9'))).toBeUndefined();
    await cambiarCodigo('null');
  });
});
