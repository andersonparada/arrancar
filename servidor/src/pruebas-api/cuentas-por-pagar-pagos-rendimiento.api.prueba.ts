/**
 * Rendimiento de los saldos calculados con pagos (CP4-2, §10.3 del diseño): 20,000 documentos y 30,000 pagos de un
 * proveedor. La lista de documentos, la ficha de un documento, la contraseña con sus 100 documentos y el saldo del
 * proveedor deben responder bien dentro del tope; si no, se evalúa guardar el saldo (U4), no antes.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDeContrasenas } from './soporte/cuentas-por-pagar-contrasenas.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar } from './soporte/escenario-de-documentos.js';

const RUTA_CXP = '/api/cuentas-por-pagar';
const DOCUMENTOS = 20000;
const PAGOS = 30000;
/** El diseño espera ~200 ms; el tope de la prueba es holgado para que no falle en una máquina cargada. */
const TOPE_EN_MS = 1500;
const entorno = usarEntornoApi();
let mundo: EscenarioDeContrasenas;
let proveedorId: string;
let empresaId: string;
let contrasenaId: string;

/** Documentos, contraseñas de 100 documentos y pagos de Q100.00 (los primeros 10,000 cargos reciben dos). */
async function sembrarVolumen(): Promise<void> {
  const [usuario] = await consultar<{ id: string }>('select id from core.usuarios where usuario = $1', [
    mundo.escenario.cuenta.usuario,
  ]);
  await consultar(
    `insert into cuentas_por_pagar.documentos (empresa_id, origen, serie, numero, tipo, proveedor_id, fecha_emision, total,
       retenciones, saldo_al_inicio, retenciones_por_practicar, referencia, vencimiento, estado, registrado_en, registrado_por)
     select $1, 'saldo_inicial', 'V', 'VOL' || g, 'factura', $2, '2026-10-20', 1120, 120, 700, 50, 'REF' || g,
            date '2026-11-20' + (g % 90), 'registrado', now(), $3 from generate_series(1, ${DOCUMENTOS}) g`,
    [empresaId, proveedorId, usuario!.id],
  );
  await consultar(
    `insert into cuentas_por_pagar.contrasenas (empresa_id, proveedor_id, numero, fecha, fecha_de_pago)
     select $1, $2, 1000 + g, '2026-11-01', '2026-12-01' from generate_series(1, ${DOCUMENTOS / 100}) g`,
    [empresaId, proveedorId],
  );
  await consultar(
    `with d as (select id, row_number() over (order by numero) rn from cuentas_por_pagar.documentos where numero like 'VOL%'),
          c as (select id, row_number() over (order by numero) rn from cuentas_por_pagar.contrasenas where numero > 1000)
     insert into cuentas_por_pagar.contrasena_documentos (empresa_id, proveedor_id, contrasena_id, documento_id)
     select $1, $2, c.id, d.id from d join c on c.rn = ((d.rn - 1) / 100) + 1`,
    [empresaId, proveedorId],
  );
  await consultar(
    `with base as (
       select g, cd.documento_id, cd.contrasena_id, gen_random_uuid() as pago_id
         from generate_series(1, ${PAGOS}) g
         join (select documento_id, contrasena_id, row_number() over (order by documento_id) rn
                 from cuentas_por_pagar.contrasena_documentos where proveedor_id = $2) cd
           on cd.rn = ((g - 1) % ${DOCUMENTOS}) + 1),
     pagos_nuevos as (
       insert into cuentas_por_pagar.pagos (id, empresa_id, proveedor_id, contrasena_id, numero, forma, fecha, monto, motivo,
         con_carga_cerrada)
       select pago_id, $1, $2, contrasena_id, g, 'cuenta_de_apertura', '2026-11-01', 100, 'Volumen', false from base
       returning id)
     insert into cuentas_por_pagar.aplicaciones_de_pagos (empresa_id, proveedor_id, pago_id, contrasena_id, cargo_id, monto)
     select $1, $2, pago_id, contrasena_id, documento_id, 100 from base`,
    [empresaId, proveedorId],
  );
  await consultar('analyze cuentas_por_pagar.documentos');
  await consultar('analyze cuentas_por_pagar.aplicaciones_de_pagos');
  await consultar('analyze cuentas_por_pagar.pagos');
}

beforeAll(async () => {
  mundo = await EscenarioDeContrasenas.preparar(entorno, 'cxppagosvolumen');
  const proveedor = await mundo.unProveedor();
  proveedorId = proveedor.proveedorId;
  empresaId = mundo.escenario.cuenta.empresaId;
  await sembrarVolumen();
  contrasenaId = (
    await consultar<{ id: string }>(
      'select id from cuentas_por_pagar.contrasenas where proveedor_id = $1 order by numero limit 1',
      [proveedorId],
    )
  )[0]!.id;
}, 120_000);

/** Lo que tarda una consulta en milisegundos, la mejor de tres (la primera calienta la conexión y los planes). */
async function milisegundosDe(ruta: string): Promise<{ ms: number; cuerpo: any }> {
  let mejor = Number.POSITIVE_INFINITY;
  let cuerpo: any;
  for (let intento = 0; intento < 3; intento++) {
    const inicio = performance.now();
    const respuesta = await mundo.propietario().get(ruta);
    mejor = Math.min(mejor, performance.now() - inicio);
    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    cuerpo = respuesta.cuerpo;
  }
  console.warn(`[CP4-2 rendimiento] GET ${ruta.split('?')[0]}: ${mejor.toFixed(0)} ms`);
  return { ms: mejor, cuerpo };
}

// El tope se mide con el mejor de varios intentos; el plazo de la prueba los cubre aunque la máquina esté cargada.
describe('saldos calculados con 20,000 documentos y 30,000 pagos', { timeout: 30_000 }, () => {
  it('la lista de documentos con saldo responde dentro del tope y cuenta los 20,000', async () => {
    const { ms, cuerpo } = await milisegundosDe(
      `${RUTA_CXP}/documentos?proveedorId=${proveedorId}&conSaldo=true&limite=50`,
    );

    expect(cuerpo.total).toBe(DOCUMENTOS);
    expect(cuerpo.elementos).toHaveLength(50);
    expect(ms).toBeLessThan(TOPE_EN_MS);
  });

  it('el saldo del proveedor suma lo pagado: 20,000 × (700 − 100) − 10,000 × 100', async () => {
    const { ms, cuerpo } = await milisegundosDe(`${RUTA_CXP}/proveedores/${proveedorId}/saldo`);

    expect(cuerpo.porPagar).toBe('11000000.00');
    expect(ms).toBeLessThan(TOPE_EN_MS);
  });

  it('la ficha de un documento y la contraseña con sus 100 documentos responden dentro del tope', async () => {
    const [{ id }] = (await consultar<{ id: string }>(
      'select id from cuentas_por_pagar.documentos where numero = $1 and proveedor_id = $2',
      ['VOL1', proveedorId],
    )) as [{ id: string }];

    const ficha = await milisegundosDe(`${RUTA_CXP}/documentos/${id}`);
    const contrasena = await milisegundosDe(`${RUTA_CXP}/contrasenas/${contrasenaId}`);

    expect(ficha.cuerpo.pagos.length).toBeGreaterThanOrEqual(1);
    expect(['100.00', '200.00']).toContain(ficha.cuerpo.pagado);
    expect(contrasena.cuerpo.cargos).toHaveLength(100);
    expect(contrasena.cuerpo.pagos.length).toBeGreaterThan(0);
    expect(ficha.ms).toBeLessThan(TOPE_EN_MS);
    expect(contrasena.ms).toBeLessThan(TOPE_EN_MS);
  });
});
