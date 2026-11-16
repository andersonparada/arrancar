/**
 * Rendimiento de los reportes de proveedor (CP5-3, §9 del diseño): el mismo volumen de CP5-2 en dos empresas (para comprobar
 * que no se recorren las filas de la otra) y, en la primera, un proveedor con 1,850 documentos y 100 pagos en un año. Tope de
 * 1.5 s por consulta (el diseño espera 300 ms) y 8 s para el Excel. Pide una base recién creada: las estadísticas de TODAS las
 * tablas sembradas se actualizan con `analyze`, porque sin ellas el plan cambia y la prueba mide otra cosa.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, prepararEscenario, type EscenarioDeDocumentos } from './soporte/escenario-de-documentos.js';
import { analizarTablasDelVolumen, sembrarVolumenDeLaEmpresa } from './soporte/volumen-de-reportes.js';

const RUTA = '/api/cuentas-por-pagar/reportes';
const TOPE_EN_MS = 1500;
const TOPE_DEL_EXCEL_EN_MS = 8000;
const entorno = usarEntornoApi();
let escenarios: EscenarioDeDocumentos[];
let proveedorGrande: string;

async function sembrarProveedorGrande({ cuenta }: EscenarioDeDocumentos, usuarioId: string): Promise<string> {
  const [proveedor] = await consultar<{ id: string }>(
    `with t as (insert into terceros.terceros (cuenta_id, tipo, razon_social, nombre_mostrar, nit)
                values ($1, 'juridica', 'Grande', 'Proveedor Grande', '7999999K') returning id)
     insert into terceros.proveedores (cuenta_id, tercero_id) select $1, id from t returning id`,
    [cuenta.cuentaId],
  );
  const parametros = [cuenta.empresaId, proveedor!.id, usuarioId];
  await consultar(
    `insert into cuentas_por_pagar.documentos (empresa_id, origen, serie, numero, tipo, proveedor_id, fecha_emision, total,
       retenciones, saldo_al_inicio, retenciones_por_practicar, referencia, vencimiento, estado, registrado_en, registrado_por)
     select $1, 'saldo_inicial', 'G', 'GR' || g, 'factura', $2, date '2026-01-01' + (g % 300), 1120, 120, 1000, 0,
            'GREF' || g, date '2026-02-01' + (g % 300), 'registrado', now(), $3
       from generate_series(1, 1850) g`,
    parametros,
  );
  await consultar(
    `with k as (insert into cuentas_por_pagar.contrasenas (empresa_id, proveedor_id, numero, fecha, fecha_de_pago)
                values ($1, $2, 900001, '2026-01-10', '2026-02-10') returning id),
     d as (insert into cuentas_por_pagar.contrasena_documentos (empresa_id, proveedor_id, contrasena_id, documento_id)
           select $1, $2, k.id, c.id from k, cuentas_por_pagar.documentos c where c.proveedor_id = $2 returning contrasena_id, documento_id),
     p as (insert into cuentas_por_pagar.pagos (empresa_id, proveedor_id, numero, forma, fecha, monto, motivo, con_carga_cerrada)
           select $1, $2, 900000 + g, 'cuenta_de_apertura', date '2026-03-01' + g, 10, 'Volumen', false
             from generate_series(1, 100) g returning id, numero)
     insert into cuentas_por_pagar.aplicaciones_de_pagos (empresa_id, proveedor_id, pago_id, contrasena_id, cargo_id, monto)
     select $1, $2, p.id, (select contrasena_id from d limit 1), (select documento_id from d order by documento_id limit 1 offset p.numero - 900001), 10
       from p`,
    [cuenta.empresaId, proveedor!.id],
  );
  return proveedor!.id;
}

beforeAll(async () => {
  escenarios = [
    await prepararEscenario(entorno, 'cxprepprovvola', MODULOS_DE_CUENTAS_POR_PAGAR),
    await prepararEscenario(entorno, 'cxprepprovvolb', MODULOS_DE_CUENTAS_POR_PAGAR),
  ];
  for (const escenario of escenarios) {
    const [usuario] = await consultar<{ id: string }>('select id from core.usuarios where usuario = $1', [
      escenario.cuenta.usuario,
    ]);
    await sembrarVolumenDeLaEmpresa({
      cuentaId: escenario.cuenta.cuentaId,
      empresaId: escenario.cuenta.empresaId,
      usuarioId: usuario!.id,
    });
    if (escenario === escenarios[0]) proveedorGrande = await sembrarProveedorGrande(escenario, usuario!.id);
  }
  await analizarTablasDelVolumen();
}, 400_000);

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
  console.warn(`[CP5-3 rendimiento] GET ${ruta.split('?')[0]}: ${mejor.toFixed(0)} ms`);
  return { ms: mejor, cuerpo };
}

describe('reportes de proveedor con 20,000 documentos y 30,000 pagos por empresa', { timeout: 60_000 }, () => {
  it('R3: el estado de cuenta de un proveedor con 1,850 documentos en un año, interno y para el proveedor', async () => {
    const consulta = `proveedorId=${proveedorGrande}&desde=2026-01-01&hasta=2026-12-31`;

    const interna = await milisegundosDe(`${RUTA}/estado-de-cuenta?${consulta}`);
    const paraElProveedor = await milisegundosDe(`${RUTA}/estado-de-cuenta?${consulta}&presentacion=para_el_proveedor`);

    expect(interna.cuerpo.lineas).toHaveLength(1950);
    expect(paraElProveedor.cuerpo.totales.saldoFinal).toBe(interna.cuerpo.totales.saldoFinal);
    expect(interna.ms).toBeLessThan(TOPE_EN_MS);
    expect(paraElProveedor.ms).toBeLessThan(TOPE_EN_MS);
  });

  it('R3: el Excel de ese estado, en menos de 8 segundos', async () => {
    const inicio = performance.now();
    const exportado = await empresaA().get(
      `${RUTA}/estado-de-cuenta/exportar?proveedorId=${proveedorGrande}&desde=2026-01-01&hasta=2026-12-31`,
    );
    const ms = performance.now() - inicio;

    console.warn(`[CP5-3 rendimiento] GET estado-de-cuenta/exportar: ${ms.toFixed(0)} ms`);
    expect(exportado.estado).toBe(200);
    expect(ms).toBeLessThan(TOPE_DEL_EXCEL_EN_MS);
  });

  it('R4: los saldos a favor de las 3,000 notas a un corte', async () => {
    const { ms, cuerpo } = await milisegundosDe(`${RUTA}/saldos-a-favor?corte=2026-09-30`);

    expect(cuerpo.filas.length).toBeGreaterThan(2000);
    expect(ms).toBeLessThan(TOPE_EN_MS);
  });

  it('R5: las contraseñas vencidas de los 501 proveedores', async () => {
    const { ms, cuerpo } = await milisegundosDe(`${RUTA}/contrasenas-por-pagar`);

    expect(cuerpo.filas.length).toBeGreaterThan(400);
    expect(ms).toBeLessThan(TOPE_EN_MS);
  });
});
