/**
 * Rendimiento de los reportes de saldos a una fecha de corte (CP5-2, §9 del diseño): dos empresas (para comprobar que no
 * se recorren las filas de la otra), cada una con 20,000 documentos en 500 proveedores, 10,000 aplicaciones de notas, 2,000
 * ajustes, 30,000 pagos (500 anulados y 300 posfechados) y 1,000 reintegros. Tope de 1.5 s por consulta (el diseño espera
 * 300 ms) y 8 s para el Excel de 20,000 filas. Pide una base recién creada: las estadísticas de TODAS las tablas
 * sembradas se actualizan con `analyze`, porque sin ellas el plan cambia y la prueba mide otra cosa.
 */
import { PgDialect } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { saldosAlCorte } from '../modulos/cuentas-por-pagar/infraestructura/persistencia/saldos-al-corte.sql.js';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, prepararEscenario, type EscenarioDeDocumentos } from './soporte/escenario-de-documentos.js';
import { analizarTablasDelVolumen, sembrarVolumenDeLaEmpresa, VOLUMEN } from './soporte/volumen-de-reportes.js';

const RUTA = '/api/cuentas-por-pagar/reportes';
const CORTE = '2026-09-30';
const TOPE_EN_MS = 1500;
const TOPE_DEL_EXCEL_EN_MS = 8000;
const entorno = usarEntornoApi();
let escenarios: EscenarioDeDocumentos[];

async function sembrar(escenario: EscenarioDeDocumentos): Promise<void> {
  const [usuario] = await consultar<{ id: string }>('select id from core.usuarios where usuario = $1', [
    escenario.cuenta.usuario,
  ]);
  await sembrarVolumenDeLaEmpresa({
    cuentaId: escenario.cuenta.cuentaId,
    empresaId: escenario.cuenta.empresaId,
    usuarioId: usuario!.id,
  });
}

beforeAll(async () => {
  escenarios = [
    await prepararEscenario(entorno, 'cxprepvolumena', MODULOS_DE_CUENTAS_POR_PAGAR),
    await prepararEscenario(entorno, 'cxprepvolumenb', MODULOS_DE_CUENTAS_POR_PAGAR),
  ];
  for (const escenario of escenarios) await sembrar(escenario);
  await analizarTablasDelVolumen();
}, 300_000);

const empresaA = () => escenarios[0]!.cuenta.propietario;

/** Lo que tarda una consulta, la mejor de tres (la primera calienta la conexión y los planes). */
async function milisegundosDe(ruta: string): Promise<{ ms: number; cuerpo: any }> {
  let mejor = Number.POSITIVE_INFINITY;
  let cuerpo: any;
  for (let intento = 0; intento < 3; intento++) {
    const inicio = performance.now();
    const respuesta = await empresaA().get(ruta);
    mejor = Math.min(mejor, performance.now() - inicio);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo).slice(0, 300)).toBe(200);
    cuerpo = respuesta.cuerpo;
  }
  console.warn(`[CP5-2 rendimiento] GET ${ruta.split('?')[0]}: ${mejor.toFixed(0)} ms`);
  return { ms: mejor, cuerpo };
}

describe('reportes de saldos con 20,000 documentos y 30,000 pagos por empresa', { timeout: 60_000 }, () => {
  it('R1: saldos por proveedor a un corte, sin mezclar las dos empresas', async () => {
    const { ms, cuerpo } = await milisegundosDe(`${RUTA}/saldos-por-proveedor?corte=${CORTE}`);

    expect(cuerpo.acreedores.length + cuerpo.deudores.length).toBe(VOLUMEN.proveedores);
    expect(Number(cuerpo.totales.totalCargos)).toBeGreaterThan(0);
    expect(ms).toBeLessThan(TOPE_EN_MS);
  });

  it('R2: una página de 100 con los totales de los 17,000 cargos', async () => {
    const { ms, cuerpo } = await milisegundosDe(`${RUTA}/documentos?corte=${CORTE}&limite=100&pagina=3`);

    expect(cuerpo.filas).toHaveLength(100);
    expect(cuerpo.total).toBe(VOLUMEN.cargos);
    expect(ms).toBeLessThan(TOPE_EN_MS);
  });

  it('R2: el Excel de todos los cargos, en menos de 8 segundos', async () => {
    const inicio = performance.now();
    const exportado = await empresaA().get(`${RUTA}/documentos/exportar?corte=${CORTE}`);
    const ms = performance.now() - inicio;

    console.warn(`[CP5-2 rendimiento] GET documentos/exportar: ${ms.toFixed(0)} ms`);
    expect(exportado.estado).toBe(200);
    expect(ms).toBeLessThan(TOPE_DEL_EXCEL_EN_MS);
  });
});

describe('el plan de R1', () => {
  it('usa los índices de la migración 0012 y no recorre las aplicaciones de notas ni los ajustes de las dos empresas', async () => {
    const e = escenarios[0]!.cuenta;
    const consulta = new PgDialect().sqlToQuery(
      sql`with ${saldosAlCorte({ empresaId: e.empresaId, corte: CORTE, fechaDeInicio: null })}
          select proveedor_id, sum(saldo) from saldos group by proveedor_id`,
    );
    const filas = await consultar<{ 'QUERY PLAN': string }>(
      `explain (analyze, buffers) ${consulta.sql}`,
      consulta.params as unknown[],
    );
    const plan = filas.map((fila) => fila['QUERY PLAN']).join('\n');

    // Con las dos empresas por mitad, PostgreSQL elige recorrer enteras las tablas de pagos y reintegros: por eso la
    // migración solo trae los índices de notas y ajustes, que el plan sí usa.
    expect(plan, plan).not.toMatch(/Seq Scan on aplicaciones_de_notas/);
    expect(plan, plan).not.toMatch(/Seq Scan on ajustes_de_saldo/);
    expect(plan, plan).toMatch(/aplicaciones_de_notas_corte_idx/);
    expect(plan, plan).toMatch(/ajustes_corte_idx/);
  });
});
