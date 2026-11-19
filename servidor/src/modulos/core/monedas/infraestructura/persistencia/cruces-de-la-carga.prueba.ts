/**
 * Prueba de integración contra PostgreSQL de la carga de las demás monedas (adenda B.3 y B.6): el cruce se pasa a
 * quetzales con el dólar `banguat` de la misma fecha y la fila guarda lo publicado, la convención y el dólar usado.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bd } from '../../../base-datos/conexion.js';
import { EscenarioDeMultimoneda } from '../../../base-datos/multimoneda-de-core.soporte.js';
import { ConsultarAlBanguat, type PedidoAlBanguat } from '../../aplicacion/casos-uso/consultar-al-banguat.js';
import type { PublicacionDeTipoDeCambio } from '../../dominio/publicacion.js';
import { FuenteDeTiposDeCambioEnMemoria } from '../../pruebas/fuente-de-tipos-de-cambio-en-memoria.js';
import { CargasDeTiposDrizzle } from './cargas-de-tipos.drizzle.js';

const escenario = new EscenarioDeMultimoneda();
const cargas = new CargasDeTiposDrizzle(bd);
const fuente = new FuenteDeTiposDeCambioEnMemoria();
const consultar = new ConsultarAlBanguat({
  fuentes: { dolar: fuente, demas: fuente },
  cargas,
  ahora: () => new Date('2031-03-12T12:00:00Z'),
});

const LUNES = '2031-03-10';
const MARTES = '2031-03-11';
const ASUETO = '2031-10-20';

const dolar = (fecha: string, referencia: string): PublicacionDeTipoDeCambio => ({
  moneda: 'USD',
  codigoBanguat: 2,
  fecha,
  referencia,
  compra: referencia,
  venta: referencia,
});

const euro = (fecha: string, publicado: string): PublicacionDeTipoDeCambio => ({
  moneda: 'EUR',
  codigoBanguat: 24,
  fecha,
  referencia: publicado,
  compra: publicado,
  venta: publicado,
});

const pedirEuro = (desde: string, hasta: string) => {
  const pedido: PedidoAlBanguat = {
    vuelta: 'manual',
    operacion: 'TipoCambioRangoMoneda',
    moneda: { moneda: 'EUR', codigoBanguat: 24, convencion: 'usd_por_unidad' },
    hoy: '2031-12-31',
    desde,
    hasta,
  };
  return consultar.ejecutar(pedido);
};

const cargarDolar = (...dias: PublicacionDeTipoDeCambio[]) => {
  fuente.publicaciones.splice(0, fuente.publicaciones.length, ...dias);
  const fechas = dias.map((d) => d.fecha).sort();
  return consultar.ejecutar({
    vuelta: 'manual',
    operacion: 'TipoCambioRango',
    moneda: { moneda: 'USD', codigoBanguat: 2, convencion: 'quetzales_por_unidad' },
    hoy: '2031-12-31',
    desde: fechas[0]!,
    hasta: fechas.at(-1)!,
  });
};

const filasDeEuro = async () =>
  (
    await escenario.propietario.query(
      `select e.fecha::text, e.referencia::text, e.compra::text, e.venta::text, e.convencion, e.dolar_usado_id, d.fecha::text as fecha_dolar
         from core.tipos_de_cambio e left join core.tipos_de_cambio d on d.id = e.dolar_usado_id
        where e.moneda = 'EUR' order by e.fecha`,
    )
  ).rows;

async function borrarTodo(): Promise<void> {
  await escenario.propietario.query(`delete from core.tipos_de_cambio where moneda = 'EUR'`);
  await escenario.propietario.query(`delete from core.tipos_de_cambio where moneda = 'USD' and fecha >= '2031-01-01'`);
  await escenario.propietario.query(`delete from core.consultas_al_banguat where desde >= '2031-01-01'`);
}

beforeAll(async () => {
  await escenario.preparar();
  await escenario.propietario.query(`update core.monedas set activa = true, codigo_banguat = 24 where codigo = 'EUR'`);
  await borrarTodo();
});

afterAll(async () => {
  await borrarTodo();
  await escenario.propietario.query(`update core.monedas set activa = false where codigo = 'EUR'`);
  await escenario.cerrar();
});

describe('el euro con el dólar de su fecha', () => {
  it('el del lunes se calcula con el dólar del lunes y guarda lo publicado, la convención y el dólar usado', async () => {
    await cargarDolar(dolar(LUNES, '7.64489'));
    fuente.publicaciones.splice(0, fuente.publicaciones.length, euro(LUNES, '1.1257'));

    const resumen = await pedirEuro(LUNES, LUNES);

    expect(resumen).toMatchObject({ resultado: 'exito', filasNuevas: 1 });
    expect(await filasDeEuro()).toEqual([
      {
        fecha: LUNES,
        referencia: '8.60585267',
        compra: '1.12570000',
        venta: '1.12570000',
        convencion: 'usd_por_unidad',
        dolar_usado_id: expect.any(String),
        fecha_dolar: LUNES,
      },
    ]);
  });

  it('la referencia guardada se rehace con su propia fila: promedio publicado por el dólar usado', async () => {
    const { rows } = await escenario.propietario.query(
      `select count(*)::int as filas,
              count(*) filter (where e.referencia = round(d.referencia * (e.compra + e.venta) / 2, 8))::int as correctas
         from core.tipos_de_cambio e join core.tipos_de_cambio d on d.id = e.dolar_usado_id
        where e.moneda = 'EUR'`,
    );

    expect(rows[0]).toEqual({ filas: 1, correctas: 1 });
  });

  it('sin el dólar de esa fecha no se guarda (sin_dolar_del_dia) y se rellena al llegar el dólar', async () => {
    fuente.publicaciones.splice(0, fuente.publicaciones.length, euro(MARTES, '1.1260'));

    const sinDolar = await pedirEuro(MARTES, MARTES);
    await cargarDolar(dolar(MARTES, '7.64500'));
    fuente.publicaciones.splice(0, fuente.publicaciones.length, euro(MARTES, '1.1260'));
    const conDolar = await pedirEuro(MARTES, MARTES);

    expect(sinDolar).toMatchObject({ resultado: 'sin_dolar_del_dia', filasNuevas: 0, filasRechazadas: 1 });
    expect(conDolar).toMatchObject({ resultado: 'exito', filasNuevas: 1 });
    expect((await filasDeEuro()).map((fila) => fila.fecha)).toEqual([LUNES, MARTES]);
  });

  it('un euro que llega al revés (0.8883 euros por dólar) no se guarda: convencion_dudosa', async () => {
    const miercoles = '2031-03-12';
    await cargarDolar(dolar(miercoles, '7.64500'));
    fuente.publicaciones.splice(0, fuente.publicaciones.length, euro(miercoles, '0.8883'));

    const resumen = await pedirEuro(miercoles, miercoles);

    expect(resumen).toMatchObject({ resultado: 'convencion_dudosa', filasNuevas: 0 });
    expect((await filasDeEuro()).map((fila) => fila.fecha)).not.toContain(miercoles);
  });

  it('el de un asueto se calcula con el dólar repetido de ese día', async () => {
    await cargarDolar(dolar(ASUETO, '7.70000'));
    fuente.publicaciones.splice(0, fuente.publicaciones.length, euro(ASUETO, '1.1700'));

    const resumen = await pedirEuro(ASUETO, ASUETO);

    expect(resumen).toMatchObject({ resultado: 'exito', filasNuevas: 1 });
    expect((await filasDeEuro()).at(-1)).toMatchObject({
      fecha: ASUETO,
      referencia: '9.00900000',
      fecha_dolar: ASUETO,
    });
  });

  it('una moneda sin convención deja constancia (sin_convencion) y no llama al Banguat', async () => {
    const antes = fuente.consultas;

    const resumen = await consultar.ejecutar({
      vuelta: 'manual',
      operacion: 'TipoCambioRangoMoneda',
      moneda: { moneda: 'EUR', codigoBanguat: 24, convencion: null },
      hoy: '2031-12-31',
      desde: LUNES,
      hasta: LUNES,
    });

    expect(resumen.resultado).toBe('sin_convencion');
    expect(fuente.consultas).toBe(antes);
    const { rows } = await escenario.propietario.query(
      `select resultado from core.consultas_al_banguat where desde = $1 and resultado = 'sin_convencion'`,
      [LUNES],
    );
    expect(rows).toHaveLength(1);
  });
});
