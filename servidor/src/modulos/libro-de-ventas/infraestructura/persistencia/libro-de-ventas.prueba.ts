/**
 * Prueba de integración contra PostgreSQL (base de pruebas): seguridad por empresa de los conceptos de ingreso, sus
 * `check` y llaves, seguridad por cuenta de los datos fiscales del cliente con su llave compuesta hacia
 * `terceros.clientes`, y la auditoría permanente de la migración 0001.
 */
import { eq } from 'drizzle-orm';
import pg, { DatabaseError } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import { bdPropietario } from '../../../core/base-datos/sembrado-de-prueba.soporte.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { clientes } from '../../../terceros/infraestructura/persistencia/clientes.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import { conceptosDeIngreso } from './conceptos-de-ingreso.tablas.js';
import { datosFiscalesDeCliente } from './datos-fiscales-de-cliente.tablas.js';

let usuarioId: string;
let cuentaA: string;
let cuentaB: string;
let empresaA1: string;
let empresaA2: string;
let empresaB: string;
let clienteDeA: string;

const en = (empresaId: string, cuentaId: string): ContextoEmpresa => ({ empresaId, cuentaId, usuarioId });
const enA1 = () => en(empresaA1, cuentaA);

/** La restricción que rechazó la operación: Drizzle envuelve el error de PostgreSQL en sus causas. */
async function restriccionQueViola(operacion: Promise<unknown>): Promise<string | undefined> {
  try {
    await operacion;
  } catch (error) {
    for (let actual = error; actual; actual = (actual as { cause?: unknown }).cause) {
      if (actual instanceof DatabaseError) return actual.constraint;
    }
  }
  return undefined;
}

async function comoPropietario<T extends pg.QueryResultRow>(sql: string): Promise<T[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    return (await conexion.query<T>(sql)).rows;
  } finally {
    await conexion.end();
  }
}

async function crearClienteEn(cuentaId: string, empresaId: string): Promise<string> {
  return enTransaccionSegura(en(empresaId, cuentaId), async (tx) => {
    const [tercero] = await tx
      .insert(terceros)
      .values({ cuentaId, tipo: 'juridica', razonSocial: 'Cliente', nombreMostrar: 'Cliente' })
      .returning();
    const [cliente] = await tx
      .insert(clientes)
      .values({ cuentaId, terceroId: tercero!.id, clase: 'directo' })
      .returning();
    return cliente!.id;
  });
}

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await comoPropietario('truncate core.cuentas, core.usuarios cascade');
  const [a, b] = await bd
    .insert(cuentas)
    .values([{ nombre: 'Cuenta A' }, { nombre: 'Cuenta B' }])
    .returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'ventaslvuno', nombres: 'Ventas', hashContrasena: 'x' })
    .returning();
  const filas = await bdPropietario
    .insert(empresas)
    .values([
      { cuentaId: a!.id, nombre: 'Empresa A1' },
      { cuentaId: a!.id, nombre: 'Empresa A2' },
      { cuentaId: b!.id, nombre: 'Empresa B' },
    ])
    .returning();
  usuarioId = usuario!.id;
  [cuentaA, cuentaB] = [a!.id, b!.id];
  [empresaA1, empresaA2, empresaB] = filas.map((fila) => fila.id) as [string, string, string];
  clienteDeA = await crearClienteEn(cuentaA, empresaA1);
});

afterAll(async () => {
  await grupoConexiones.end();
});

const concepto = (empresaId: string, cambios: Partial<typeof conceptosDeIngreso.$inferInsert> = {}) => ({
  empresaId,
  nombre: 'Venta de bienes',
  tipo: 'bien' as const,
  ...cambios,
});

const insertarConcepto = (valores: typeof conceptosDeIngreso.$inferInsert, contexto = enA1()) =>
  enTransaccionSegura(contexto, (tx) => tx.insert(conceptosDeIngreso).values(valores).returning());

describe('conceptos de ingreso: seguridad por empresa y restricciones', () => {
  it('cada empresa ve solo los suyos, aunque sea de la misma cuenta', async () => {
    await insertarConcepto(concepto(empresaA1));
    const visibles = (empresaId: string, cuentaId: string) =>
      enTransaccionSegura(en(empresaId, cuentaId), (tx) => tx.select().from(conceptosDeIngreso));

    expect(await visibles(empresaA1, cuentaA)).toHaveLength(1);
    expect(await visibles(empresaA2, cuentaA)).toEqual([]);
    expect(await visibles(empresaB, cuentaB)).toEqual([]);
  });

  it('no se puede escribir a nombre de otra empresa', async () => {
    await expect(insertarConcepto(concepto(empresaA2, { nombre: 'Intruso' }), enA1())).rejects.toThrow();
  });

  it('el nombre no se repite en la empresa (sin mayúsculas ni acentos), pero otra empresa puede usarlo', async () => {
    const repetido = restriccionQueViola(insertarConcepto(concepto(empresaA1, { nombre: '  VENTA DE BIÉNES ' })));

    expect(await repetido).toBe('conceptos_de_ingreso_nombre_unico');
    await expect(insertarConcepto(concepto(empresaA2), en(empresaA2, cuentaA))).resolves.toBeTruthy();
  });

  it.each([
    ['nombre vacío', { nombre: '   ' }, 'conceptos_de_ingreso_nombre_largo'],
    ['nombre de más de 80 letras', { nombre: 'x'.repeat(81) }, 'conceptos_de_ingreso_nombre_largo'],
    ['tipo desconocido', { nombre: 'Otro', tipo: 'mixto' as never }, 'conceptos_de_ingreso_tipo'],
    ['clave de sistema desconocida', { nombre: 'Otro', claveDeSistema: 'otra' as never }, 'conceptos_de_ingreso_clave'],
    [
      'concepto de sistema inactivo',
      { nombre: 'Sistema', claveDeSistema: 'venta_de_activo_fijo' as const, activo: false },
      'conceptos_de_ingreso_sistema_activo',
    ],
  ] as const)('rechaza %s (check)', async (_caso, cambios, restriccion) => {
    expect(await restriccionQueViola(insertarConcepto(concepto(empresaA1, cambios as never)))).toBe(restriccion);
  });

  it('cada empresa tiene a lo sumo un concepto por clave de sistema', async () => {
    const sistema = { nombre: 'Venta de activo fijo', claveDeSistema: 'venta_de_activo_fijo' as const };
    await insertarConcepto(concepto(empresaA1, sistema));

    const repetido = restriccionQueViola(insertarConcepto(concepto(empresaA1, { ...sistema, nombre: 'Otra venta' })));

    expect(await repetido).toBe('conceptos_de_ingreso_clave_unica');
    await expect(insertarConcepto(concepto(empresaA2, sistema), en(empresaA2, cuentaA))).resolves.toBeTruthy();
  });
});

const fiscales = (
  clienteId: string,
  cambios: Partial<typeof datosFiscalesDeCliente.$inferInsert> = {},
): typeof datosFiscalesDeCliente.$inferInsert => ({
  clienteId,
  agenteDeRetencionIva: 'contribuyente_especial',
  ...cambios,
});

describe('datos fiscales del cliente: seguridad por cuenta y llave compuesta', () => {
  it('se guardan con la cuenta de la transacción, sin que el código la escriba', async () => {
    await enTransaccionSegura(enA1(), (tx) => tx.insert(datosFiscalesDeCliente).values(fiscales(clienteDeA)));

    const [fila] = await enTransaccionSegura(enA1(), (tx) => tx.select().from(datosFiscalesDeCliente));
    expect(fila).toMatchObject({ clienteId: clienteDeA, cuentaId: cuentaA, retieneIsr: false });
  });

  it('otra empresa de la misma cuenta los ve (son de la cuenta); otra cuenta, no', async () => {
    const visibles = (empresaId: string, cuentaId: string) =>
      enTransaccionSegura(en(empresaId, cuentaId), (tx) => tx.select().from(datosFiscalesDeCliente));

    expect(await visibles(empresaA2, cuentaA)).toHaveLength(1);
    expect(await visibles(empresaB, cuentaB)).toEqual([]);
  });

  it('otra cuenta no puede cambiarlos', async () => {
    const cambiados = await enTransaccionSegura(en(empresaB, cuentaB), (tx) =>
      tx
        .update(datosFiscalesDeCliente)
        .set({ retieneIsr: true })
        .where(eq(datosFiscalesDeCliente.clienteId, clienteDeA))
        .returning(),
    );

    expect(cambiados).toEqual([]);
  });

  it('un cliente de otra cuenta no se puede referenciar (llave compuesta con la cuenta)', async () => {
    const sinDatos = await crearClienteEn(cuentaA, empresaA1);
    const intento = enTransaccionSegura(en(empresaB, cuentaB), (tx) =>
      tx.insert(datosFiscalesDeCliente).values(fiscales(sinDatos)),
    );

    expect(await restriccionQueViola(intento)).toBe('datos_fiscales_de_cliente_cliente_fk');
  });

  it('si el cliente desaparece, se van sus datos fiscales', async () => {
    const efimero = await crearClienteEn(cuentaA, empresaA1);
    await enTransaccionSegura(enA1(), (tx) => tx.insert(datosFiscalesDeCliente).values(fiscales(efimero)));

    await enTransaccionSegura(enA1(), (tx) => tx.delete(clientes).where(eq(clientes.id, efimero)));

    const restantes = await enTransaccionSegura(enA1(), (tx) =>
      tx.select().from(datosFiscalesDeCliente).where(eq(datosFiscalesDeCliente.clienteId, efimero)),
    );
    expect(restantes).toEqual([]);
  });

  it.each([
    ['agente de retención desconocido', { agenteDeRetencionIva: 'inventado' }, 'datos_fiscales_de_cliente_agente'],
    [
      'exportar productos agropecuarios sin ser exportador',
      { exportaProductosAgropecuarios: true },
      'datos_fiscales_de_cliente_exportador',
    ],
    [
      'retener el IVA de pequeño contribuyente sin ser agente',
      { agenteDeRetencionIva: 'ninguno', retieneIvaAPequenoContribuyente: true },
      'datos_fiscales_de_cliente_iva_a_pequeno',
    ],
  ])('rechaza %s (check)', async (_caso, cambios, restriccion) => {
    const cliente = await crearClienteEn(cuentaA, empresaA1);

    const intento = enTransaccionSegura(enA1(), (tx) =>
      tx.insert(datosFiscalesDeCliente).values(fiscales(cliente, cambios as never)),
    );

    expect(await restriccionQueViola(intento)).toBe(restriccion);
  });

  it('un exportador de productos agropecuarios que además retiene a pequeños contribuyentes es válido', async () => {
    const cliente = await crearClienteEn(cuentaA, empresaA1);
    const valores = fiscales(cliente, {
      agenteDeRetencionIva: 'exportador' as const,
      exportaProductosAgropecuarios: true,
      retieneIvaAPequenoContribuyente: true,
    });

    await expect(
      enTransaccionSegura(enA1(), (tx) => tx.insert(datosFiscalesDeCliente).values(valores)),
    ).resolves.toBeTruthy();
  });
});

describe('auditoría permanente del módulo (migración 0001)', () => {
  it('los documentos y las retenciones de ventas están en el catálogo, con el motivo corregido', async () => {
    const filas = await comoPropietario<{ recurso: string; motivo: string }>(
      "select recurso, motivo from core.recursos_de_auditoria_permanente where recurso like 'libro-de-ventas.%' order by recurso",
    );

    expect(filas.map((fila) => fila.recurso)).toEqual(['libro-de-ventas.documentos', 'libro-de-ventas.retenciones']);
    for (const { motivo } of filas) expect(motivo).toContain('Código de Comercio art. 382');
  });
});
