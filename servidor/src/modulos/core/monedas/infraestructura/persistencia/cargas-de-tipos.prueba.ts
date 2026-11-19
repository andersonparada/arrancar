/**
 * Prueba de integración contra PostgreSQL de la carga automática: qué monedas se cargan, la bitácora por llamada con las
 * filas nuevas, el relleno sin duplicar, la actualización de `core.monedas_del_banguat` y el cerrojo de una sola carga.
 */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../base-datos/conexion.js';
import { EscenarioDeMultimoneda } from '../../../base-datos/multimoneda-de-core.soporte.js';
import type { ConsultaHecha } from '../../aplicacion/puertos/cargas-de-tipos.js';
import type { PublicacionDeTipoDeCambio } from '../../dominio/publicacion.js';
import { CargasDeTiposDrizzle } from './cargas-de-tipos.drizzle.js';
import { CerrojoDeCargaPostgres } from './cerrojo-de-carga.drizzle.js';

const escenario = new EscenarioDeMultimoneda();
const cargas = new CargasDeTiposDrizzle(bd);
let listaOriginal: { codigo: number; descripcion: string; disponible: boolean; vista_por_ultima_vez: Date }[];

beforeAll(async () => {
  await escenario.preparar();
  listaOriginal = (await escenario.propietario.query(`select * from core.monedas_del_banguat`)).rows;
  await escenario.propietario.query(`update core.monedas set activa = true, codigo_banguat = 24 where codigo = 'EUR'`);
  await escenario.propietario.query(`update core.monedas set codigo_banguat = 9 where codigo = 'GBP'`);
});

afterAll(async () => {
  await escenario.propietario.query(`update core.monedas set activa = false where codigo = 'EUR'`);
  await escenario.limpiar();
  await escenario.propietario.query(`delete from core.monedas_del_banguat where codigo = 777`);
  for (const fila of listaOriginal)
    await escenario.propietario.query(
      `update core.monedas_del_banguat set descripcion = $2, disponible = $3, vista_por_ultima_vez = $4 where codigo = $1`,
      [fila.codigo, fila.descripcion, fila.disponible, fila.vista_por_ultima_vez],
    );
  await escenario.cerrar();
});

const publicacion = (fecha: string, referencia: string): PublicacionDeTipoDeCambio => ({
  moneda: 'EUR',
  codigoBanguat: 24,
  fecha,
  referencia,
  compra: referencia,
  venta: referencia,
  convencion: 'quetzales_por_unidad',
});

const consulta = (cambios: Partial<ConsultaHecha> = {}): ConsultaHecha => ({
  iniciadaEn: new Date(),
  terminadaEn: new Date(),
  operacion: 'TipoCambioRangoMoneda',
  vuelta: 'manana',
  moneda: 'EUR',
  codigoBanguat: 24,
  desde: '2026-11-10',
  hasta: '2026-11-12',
  resultado: 'exito',
  filasRechazadas: 0,
  detalle: null,
  disparadaPor: null,
  ...cambios,
});

describe('monedasACargar', () => {
  it('son las activas con código del Banguat: ni las inactivas con código ni el quetzal', async () => {
    const monedas = (await cargas.monedasACargar()).map((m) => m.moneda);

    expect(monedas).toContain('USD');
    expect(monedas).toContain('EUR');
    expect(monedas).not.toContain('GBP');
    expect(monedas).not.toContain('GTQ');
    expect(await cargas.monedasACargar()).toContainEqual({ moneda: 'EUR', codigoBanguat: 24 });
  });
});

describe('guardar', () => {
  it('deja la fila de la bitácora con las filas nuevas y los tipos ligados a ella', async () => {
    const nuevas = await cargas.guardar(consulta({ detalle: 'x' }), [
      publicacion('2026-11-10', '9.1'),
      publicacion('2026-11-11', '9.12'),
    ]);

    const { rows } = await escenario.propietario.query(
      `select c.filas_nuevas, c.operacion, c.vuelta, count(t.id)::int as tipos
         from core.consultas_al_banguat c join core.tipos_de_cambio t on t.consulta_id = c.id
        where c.detalle = 'x' group by c.id`,
    );
    expect(nuevas).toBe(2);
    expect(rows).toEqual([{ filas_nuevas: 2, operacion: 'TipoCambioRangoMoneda', vuelta: 'manana', tipos: 2 }]);
  });

  it('una moneda distinta del dólar sin convención no se guarda: la base la rechaza hasta tener el cruce', async () => {
    const { convencion: _omitida, ...sinConvencion } = publicacion('2026-11-20', '1.1257');

    await expect(cargas.guardar(consulta({ detalle: 'sin-convencion' }), [sinConvencion])).rejects.toThrow();
  });

  it('no duplica ni reemplaza lo ya guardado: la segunda vez deja 0 filas nuevas', async () => {
    const nuevas = await cargas.guardar(consulta({ detalle: 'x' }), [
      publicacion('2026-11-10', '9.5'),
      publicacion('2026-11-12', '9.2'),
    ]);

    const { rows } = await escenario.propietario.query(
      `select fecha::text, referencia::text from core.tipos_de_cambio where moneda = 'EUR' order by fecha`,
    );
    expect(nuevas).toBe(1);
    expect(rows).toEqual([
      { fecha: '2026-11-10', referencia: '9.10000000' },
      { fecha: '2026-11-11', referencia: '9.12000000' },
      { fecha: '2026-11-12', referencia: '9.20000000' },
    ]);
  });

  it('una consulta sin datos o con error queda en la bitácora sin tipos', async () => {
    await cargas.guardar(consulta({ resultado: 'error', detalle: 'x'.repeat(900) }), []);

    const { rows } = await escenario.propietario.query(
      `select char_length(detalle)::int as largo from core.consultas_al_banguat where resultado = 'error' and moneda = 'EUR'`,
    );
    expect(rows).toEqual([{ largo: 500 }]);
  });
});

describe('lecturas para el relleno y la comparación', () => {
  it('fechasConTipoDelBanguat solo da las del rango y valorAnterior el último previo', async () => {
    expect(await cargas.fechasConTipoDelBanguat('EUR', '2026-11-11', '2026-11-12')).toEqual(
      expect.arrayContaining(['2026-11-11', '2026-11-12']),
    );
    expect(await cargas.fechasConTipoDelBanguat('EUR', '2026-11-11', '2026-11-12')).toHaveLength(2);
    expect(Number(await cargas.valorAnterior('EUR', '2026-11-05', '2026-11-12'))).toBe(9.12);
    expect(await cargas.valorAnterior('EUR', '2026-11-05', '2026-11-10')).toBeNull();
  });

  it('consultasDesde da lo registrado desde el instante pedido', async () => {
    const hace = await cargas.consultasDesde(new Date(Date.now() - 3_600_000));
    const futuras = await cargas.consultasDesde(new Date(Date.now() + 3_600_000));

    expect(hace.some((c) => c.vuelta === 'manana')).toBe(true);
    expect(futuras).toEqual([]);
  });
});

describe('actualizarLista', () => {
  it('agrega y actualiza lo que vino y deja `disponible = false` lo que ya no viene, sin borrar nada', async () => {
    const ahora = new Date();
    const resultado = await cargas.actualizarLista(
      [
        { codigo: 24, descripcion: 'Euro de la zona euro' },
        { codigo: 777, descripcion: 'Moneda nueva' },
      ],
      ahora,
      consulta({ operacion: 'VariablesDisponibles', vuelta: 'lista', moneda: null, codigoBanguat: null, detalle: 'x' }),
    );

    const { rows } = await escenario.propietario.query(
      `select codigo, descripcion, disponible from core.monedas_del_banguat where codigo in (2, 3, 9, 24, 777) order by codigo`,
    );
    expect(resultado.nuevas).toBe(1);
    expect(resultado.noDisponibles).toBeGreaterThanOrEqual(3);
    expect(rows).toEqual([
      { codigo: 2, descripcion: expect.any(String), disponible: false },
      { codigo: 3, descripcion: expect.any(String), disponible: false },
      { codigo: 9, descripcion: expect.any(String), disponible: false },
      { codigo: 24, descripcion: 'Euro de la zona euro', disponible: true },
      { codigo: 777, descripcion: 'Moneda nueva', disponible: true },
    ]);
    const convenciones = await escenario.propietario.query(
      `select codigo, convencion from core.monedas_del_banguat where codigo in (2, 24, 777) order by codigo`,
    );
    expect(convenciones.rows).toEqual([
      { codigo: 2, convencion: 'quetzales_por_unidad' },
      { codigo: 24, convencion: 'usd_por_unidad' },
      { codigo: 777, convencion: null },
    ]);
    const estado = await cargas.estadoDeLaLista();
    expect(estado.monedas).toBeGreaterThanOrEqual(5);
    expect(estado.vistaPorUltimaVez?.getTime()).toBeGreaterThanOrEqual(ahora.getTime() - 1000);
  });
});

describe('el cerrojo de una sola carga', () => {
  const cerrojo = new CerrojoDeCargaPostgres(grupoConexiones);
  const CLAVE = 7_301_913_002;

  it('corre el trabajo si está libre y lo suelta al terminar', async () => {
    expect(await cerrojo.ejecutarSiLibre(async () => 'hecho')).toBe('hecho');
    expect(await cerrojo.ejecutarSiLibre(async () => 'otra vez')).toBe('otra vez');
  });

  it('si otra instancia lo tiene, no hace nada y devuelve null', async () => {
    const otra = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    await otra.connect();
    await otra.query('select pg_advisory_lock($1)', [CLAVE]);
    let corrio = false;
    try {
      expect(
        await cerrojo.ejecutarSiLibre(async () => {
          corrio = true;
        }),
      ).toBeNull();
    } finally {
      await otra.query('select pg_advisory_unlock($1)', [CLAVE]);
      await otra.end();
    }
    expect(corrio).toBe(false);
    expect(await cerrojo.ejecutarSiLibre(async () => 'libre')).toBe('libre');
  });
});
