/**
 * BS-R1, rendimiento de «Saldos por cuenta»: 100,000 movimientos en una cuenta (el 99 % marcado en conciliaciones
 * autorizadas de enero a agosto, el resto en tránsito, más 500 pares original + inverso sin pasar por el banco). Tope de
 * 1.5 s por consulta y de 1 s para la consulta de partidas en tránsito, medida con `explain analyze`. Las estadísticas
 * se actualizan con `analyze`: sin ellas el plan cambia y la prueba mide otra cosa.
 */
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { enTransitoA } from '../modulos/bancos/infraestructura/persistencia/condiciones-en-transito.js';
import { movimientos } from '../modulos/bancos/infraestructura/persistencia/movimientos.tablas.js';
import { empresaConInicio } from './soporte/apertura-por-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import type { CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/bancos/saldos-por-cuenta';
const CORTE = '2026-08-31';
const TOTAL = 100_000;
const TOPE_EN_MS = 1500;
const TOPE_DE_LA_CONSULTA_EN_MS = 1000;
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaBancariaId = '';

const COLUMNAS = '(empresa_id, cuenta_bancaria_id, tipo, fecha, monto, concepto_id';

async function sembrar(conceptoId: string): Promise<void> {
  const parametros = [cuenta.empresaId, cuentaBancariaId, conceptoId];
  await comoPropietario(
    `insert into bancos.conciliaciones (empresa_id, cuenta_bancaria_id, anio, mes, estado, previa_al_saldo_transcrito)
     select $1, $2, 2026, m, 'autorizada', true from generate_series(1, 10) m`,
    parametros.slice(0, 2),
  );
  await comoPropietario(
    `insert into bancos.movimientos ${COLUMNAS}, conciliacion_id)
     select $1, $2, (array['credito', 'debito', 'cheque'])[1 + s.g % 3], s.d, 10 + s.g % 90, $3, c.id
       from (select g, date '2026-01-02' + (g % 300) as d from generate_series(1, ${TOTAL}) g) s
       left join bancos.conciliaciones c on c.cuenta_bancaria_id = $2 and c.mes = extract(month from s.d)::int
        and s.g % 100 <> 0 and s.d <= date '${CORTE}'`,
    parametros,
  );
  await comoPropietario(
    `with originales as (
       insert into bancos.movimientos ${COLUMNAS}, revertido_en)
       select $1, $2, 'debito', date '2026-03-05', 7, $3, now() from generate_series(1, 500) returning id
     )
     insert into bancos.movimientos ${COLUMNAS}, revierte_a_id)
     select $1, $2, 'credito', date '2026-03-06', 7, $3, id from originales`,
    parametros,
  );
  await comoPropietario('analyze bancos.movimientos', []);
  await comoPropietario('analyze bancos.conciliaciones', []);
}

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Saldos volumen', usuario: 'propietariosaldosvolumen' });
  cuentaBancariaId = await crearCuentaSinSaldo(cuenta.propietario);
  await sembrar(await conceptoGeneral(cuenta.propietario));
}, 300_000);

/** Lo que tarda la consulta, la mejor de tres (la primera calienta la conexión y los planes). */
async function milisegundosDe(ruta: string) {
  let mejor = Number.POSITIVE_INFINITY;
  let cuerpo: any;
  for (let intento = 0; intento < 3; intento++) {
    const inicio = performance.now();
    const respuesta = await cuenta.propietario.get(ruta);
    mejor = Math.min(mejor, performance.now() - inicio);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo).slice(0, 300)).toBe(200);
    cuerpo = respuesta.cuerpo;
  }
  console.warn(`[BS-R1 rendimiento] GET ${ruta.split('?')[0]}: ${mejor.toFixed(0)} ms`);
  return { ms: mejor, cuerpo };
}

describe('saldos por cuenta con 100,000 movimientos', () => {
  it(
    `responde en menos de ${TOPE_EN_MS} ms, con lo marcado fuera del tránsito y los pares compensados`,
    { timeout: 60_000 },
    async () => {
      const { ms, cuerpo } = await milisegundosDe(`${RUTA}?fecha=${CORTE}&cuentaBancariaId=${cuentaBancariaId}`);

      const saldo = cuerpo.cuentas[0];
      const enTransito =
        saldo.chequesEnCirculacion.cantidad + saldo.depositosEnTransito.cantidad + saldo.debitosEnTransito.cantidad;
      expect(ms).toBeLessThan(TOPE_EN_MS);
      expect(enTransito).toBe(1000);
      expect(saldo.partidas).toHaveLength(1000);
      expect(saldo.partidas.some((partida: { monto: string }) => partida.monto === '7.00')).toBe(false);
      expect(saldo.ultimaConciliacion).toEqual({ anio: 2026, mes: 8 });
    },
  );

  it('el reporte de movimientos con «conciliado en» de toda la cuenta sigue respondiendo en menos del tope', async () => {
    const { ms, cuerpo } = await milisegundosDe(
      `/api/bancos/movimientos/reporte?cuentaBancariaId=${cuentaBancariaId}&desde=2026-01-01&hasta=2026-01-31`,
    );

    expect(ms).toBeLessThan(TOPE_EN_MS);
    expect(cuerpo.filas.some((fila: { conciliadoEn: unknown }) => fila.conciliadoEn !== null)).toBe(true);
  });

  it(`la consulta de partidas en tránsito tarda menos de ${TOPE_DE_LA_CONSULTA_EN_MS} ms según explain analyze`, async () => {
    const consulta = new PgDialect({ casing: 'snake_case' }).sqlToQuery(
      sql`select id from ${movimientos} where ${enTransitoA(CORTE)} and ${movimientos.cuentaBancariaId} = ${cuentaBancariaId}`,
    );

    const filas = await comoPropietario<{ 'QUERY PLAN': string }>(
      `explain (analyze, buffers) ${consulta.sql}`,
      consulta.params as unknown[],
    );

    const plan = filas.map((fila) => fila['QUERY PLAN']).join('\n');
    const milisegundos = Number(/Execution Time: ([\d.]+) ms/.exec(plan)?.[1]);
    console.warn(`[BS-R1 rendimiento] explain analyze de las partidas en tránsito:\n${plan}`);
    expect(milisegundos, plan).toBeLessThan(TOPE_DE_LA_CONSULTA_EN_MS);
  });
});
