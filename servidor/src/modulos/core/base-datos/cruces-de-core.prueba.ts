/**
 * Prueba de integración contra PostgreSQL: la migración `0033_cruces_del_banguat` (`docs/modulos/diseno-multimoneda.md`,
 * adenda B.4, B.7 y B.8): la convención de cada código del Banguat, las columnas de los cruces en
 * `core.tipos_de_cambio`, los resultados nuevos de la bitácora, el zloty y la guarda de datos existentes.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { codigoDeError, EscenarioDeMultimoneda, restriccionDeError } from './multimoneda-de-core.soporte.js';

const escenario = new EscenarioDeMultimoneda();
const FECHA = '2031-03-10';
let dolarId: string;

beforeAll(async () => {
  await escenario.preparar();
  await escenario.tipoDelBanguat({ moneda: 'USD', fecha: FECHA, referencia: '7.64489' }, 2);
  dolarId = await escenario.unaFila(`select id from core.tipos_de_cambio where moneda = 'USD' and fecha = $1`, [FECHA]);
});

afterAll(async () => {
  await escenario.propietario.query(`delete from core.tipos_de_cambio where moneda in ('EUR', 'GBP')`);
  await escenario.propietario.query(`delete from core.tipos_de_cambio where moneda = 'USD' and fecha = $1`, [FECHA]);
  await escenario.limpiar();
  await escenario.cerrar();
});

interface ValoresDeCruce {
  convencion?: string;
  dolar?: string | null;
  compra?: string;
  venta?: string;
}

/** Un cruce de la libra con lo indicado (por omisión, uno completo). */
function cruce(valores: ValoresDeCruce) {
  const { convencion = 'usd_por_unidad', dolar = dolarId, compra = '1.3164', venta = '1.3165' } = valores;
  return escenario.propietario.query(
    `insert into core.tipos_de_cambio (moneda, fecha, referencia, compra, venta, origen, codigo_banguat, consulta_id,
       convencion, dolar_usado_id) values ('GBP', $1, 10.06411544, $2, $3, 'banguat', 9, $4, $5, $6)`,
    [FECHA, compra, venta, escenario.consultaId, convencion, dolar],
  );
}

const borrarCruces = () => escenario.propietario.query(`delete from core.tipos_de_cambio where moneda = 'GBP'`);

describe('convención de los códigos del Banguat', () => {
  it('cada código conocido trae la convención de B.4, y los excluidos quedan sin ella', async () => {
    const { rows } = await escenario.propietario.query(
      `select convencion, array_agg(codigo order by codigo) as codigos from core.monedas_del_banguat
       where codigo <= 42 group by convencion`,
    );
    const porConvencion = Object.fromEntries(rows.map((fila) => [fila.convencion ?? 'ninguna', fila.codigos]));

    expect(porConvencion.quetzales_por_unidad).toEqual([2]);
    expect(porConvencion.usd_por_unidad).toEqual([9, 24]);
    expect(porConvencion.unidades_por_usd).toEqual([
      3, 5, 7, 15, 16, 18, 19, 21, 23, 25, 29, 30, 31, 32, 33, 34, 35, 36, 38, 39, 40, 42,
    ]);
    expect(porConvencion.ninguna).toEqual([1, 4, 6, 8, 11, 12, 13, 14, 17, 22, 26, 27, 28, 37, 41]);
  });

  it('la convención solo admite los tres valores', async () => {
    const cambiar = escenario.propietario.query(
      `update core.monedas_del_banguat set convencion = 'otra' where codigo = 3`,
    );

    expect(await restriccionDeError(cambiar)).toBe('monedas_del_banguat_convencion_valida');
  });

  it('la aplicación actualiza la descripción pero no la convención, y un código nuevo nace sin ella', async () => {
    const { aplicacion, propietario } = escenario;
    const cambiarConvencion = aplicacion.query(`update core.monedas_del_banguat set convencion = null`);
    const cambiarDescripcion = aplicacion.query(
      `update core.monedas_del_banguat set descripcion = descripcion where codigo = 3`,
    );

    expect(await codigoDeError(cambiarConvencion)).toBe('42501');
    expect(await codigoDeError(cambiarDescripcion)).toBeUndefined();
    await aplicacion.query(`insert into core.monedas_del_banguat (codigo, descripcion) values (888, 'Nueva')`);
    const nueva = await propietario.query(`select convencion from core.monedas_del_banguat where codigo = 888`);
    await propietario.query(`delete from core.monedas_del_banguat where codigo = 888`);
    expect(nueva.rows).toEqual([{ convencion: null }]);
  });

  it('el zloty polaco existe inactivo, sin código y sin letras', async () => {
    const { rows } = await escenario.propietario.query(
      `select nombre, simbolo, decimales, activa, codigo_banguat, letras_singular from core.monedas where codigo = 'PLN'`,
    );

    expect(rows).toEqual([
      {
        nombre: 'Zloty polaco',
        simbolo: 'zł',
        decimales: 2,
        activa: false,
        codigo_banguat: null,
        letras_singular: null,
      },
    ]);
  });
});

describe('core.tipos_de_cambio: cruces', () => {
  it('un cruce completo con su dólar se guarda', async () => {
    expect(await codigoDeError(cruce({}))).toBeUndefined();
    await borrarCruces();
  });

  it('un cruce sin dólar, o un dólar sin cruce, falla', async () => {
    const sinDolar = cruce({ dolar: null });
    const dolarSinCruce = cruce({ convencion: 'quetzales_por_unidad' });

    expect(await restriccionDeError(sinDolar)).toBe('tipos_de_cambio_cruce_con_dolar');
    expect(await restriccionDeError(dolarSinCruce)).toBe('tipos_de_cambio_cruce_con_dolar');
  });

  it('un cruce lleva compra y venta, y la venta no es menor que la compra', async () => {
    const invertido = cruce({ compra: '1.3166', venta: '1.3165' });
    const sinVenta = escenario.propietario.query(
      `insert into core.tipos_de_cambio (moneda, fecha, referencia, compra, origen, codigo_banguat, consulta_id,
         convencion, dolar_usado_id) values ('GBP', $1, 10.06, 1.3164, 'banguat', 9, $2, 'usd_por_unidad', $3)`,
      [FECHA, escenario.consultaId, dolarId],
    );

    expect(await restriccionDeError(invertido)).toBe('tipos_de_cambio_cruce_con_compra_y_venta');
    expect(await restriccionDeError(sinVenta)).toBe('tipos_de_cambio_cruce_con_compra_y_venta');
  });

  it('una fila del Banguat sin convención falla y una manual sin convención pasa', async () => {
    const sinConvencion = escenario.propietario.query(
      `insert into core.tipos_de_cambio (moneda, fecha, referencia, origen, codigo_banguat, consulta_id)
       values ('EUR', $1, 8.8, 'banguat', 24, $2)`,
      [FECHA, escenario.consultaId],
    );

    expect(await restriccionDeError(sinConvencion)).toBe('tipos_de_cambio_banguat_con_convencion');
    expect(await codigoDeError(escenario.tipoManual({ moneda: 'EUR', fecha: FECHA }))).toBeUndefined();
  });

  it('la convención solo admite los tres valores', async () => {
    const otra = cruce({ convencion: 'otra', dolar: null });

    expect(await restriccionDeError(otra)).toBe('tipos_de_cambio_convencion_valida');
  });

  it('el dólar usado no se puede borrar mientras un cruce lo cite', async () => {
    await cruce({});

    const borrar = escenario.propietario.query(`delete from core.tipos_de_cambio where id = $1`, [dolarId]);

    expect(await codigoDeError(borrar)).toBe('23503');
    await borrarCruces();
  });
});

describe('core.consultas_al_banguat: resultados nuevos', () => {
  it.each(['sin_dolar_del_dia', 'convencion_dudosa', 'sin_convencion'])('admite %s', async (resultado) => {
    const insertar = escenario.aplicacion.query(
      `insert into core.consultas_al_banguat (iniciada_en, terminada_en, operacion, vuelta, resultado, detalle)
       values (now(), now(), 'TipoCambioDia', 'noche', $1, 'x')`,
      [resultado],
    );

    expect(await codigoDeError(insertar)).toBeUndefined();
  });
});

describe('guarda de datos existentes de la migración', () => {
  const ruta = new URL('../migraciones/0033_cruces_del_banguat.sql', import.meta.url);
  const guarda = readFileSync(ruta, 'utf8').split('--> statement-breakpoint')[0]!;

  it('deja pasar la migración si solo hay filas del dólar', async () => {
    expect(await codigoDeError(escenario.propietario.query(guarda))).toBeUndefined();
  });

  it('detiene la migración si hay una fila del Banguat de otra moneda', async () => {
    await escenario.tipoDelBanguat({ moneda: 'EUR', fecha: '2031-03-11' });

    const correr = escenario.propietario.query(guarda);

    await expect(correr).rejects.toThrow(/Recree la base de desarrollo/);
  });
});
