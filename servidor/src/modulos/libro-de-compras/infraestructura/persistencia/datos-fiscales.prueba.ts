/**
 * Prueba de integración contra PostgreSQL (base de pruebas): la seguridad por filas de los datos fiscales (la de
 * la empresa es por empresa; la del proveedor, por cuenta), la llave compuesta hacia `terceros.proveedores` y los
 * `check` de coherencia.
 */
import { eq } from 'drizzle-orm';
import pg, { DatabaseError } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { migrarModulos } from '../../../core/base-datos/migrador.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { cuentas } from '../../../core/cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import { datosFiscalesDeEmpresa, datosFiscalesDeProveedor } from './datos-fiscales.tablas.js';

let usuarioId: string;
let cuentaA: string;
let cuentaB: string;
let empresaA1: string;
let empresaA2: string;
let empresaB: string;
let proveedorDeA: string;

const en = (empresaId: string, cuentaId: string): ContextoEmpresa => ({ empresaId, cuentaId, usuarioId });

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

async function vaciarComoPropietario(): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();
}

async function crearProveedorEn(cuentaId: string, empresaId: string): Promise<string> {
  return enTransaccionSegura(en(empresaId, cuentaId), async (tx) => {
    const [tercero] = await tx
      .insert(terceros)
      .values({ cuentaId, tipo: 'juridica', razonSocial: 'Proveedor', nombreMostrar: 'Proveedor' })
      .returning();
    const [proveedor] = await tx.insert(proveedores).values({ cuentaId, terceroId: tercero!.id }).returning();
    return proveedor!.id;
  });
}

const fiscalesDeProveedor = (proveedorId: string, cambios: Record<string, unknown> = {}) => ({
  proveedorId,
  esPequenoContribuyente: false,
  regimenIsr: 'utilidades',
  esAgenteDeRetencionIva: false,
  seLeRetieneIva: true,
  seLeRetieneIsr: false,
  seLeRetieneIvaPequenoContribuyente: false,
  ...cambios,
});

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await vaciarComoPropietario();
  const [a, b] = await bd
    .insert(cuentas)
    .values([{ nombre: 'Cuenta A' }, { nombre: 'Cuenta B' }])
    .returning();
  const [usuario] = await bd
    .insert(usuarios)
    .values({ usuario: 'fiscales', nombres: 'Fiscales', hashContrasena: 'x' })
    .returning();
  const filas = await bd
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
  proveedorDeA = await crearProveedorEn(cuentaA, empresaA1);
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('datos fiscales de la empresa: seguridad por empresa', () => {
  it('cada empresa ve solo los suyos, aunque sea de la misma cuenta', async () => {
    await enTransaccionSegura(en(empresaA1, cuentaA), (tx) =>
      tx.insert(datosFiscalesDeEmpresa).values({ empresaId: empresaA1, agenteDeRetencionIva: 'exportador' }),
    );
    const visibles = (empresaId: string, cuentaId: string) =>
      enTransaccionSegura(en(empresaId, cuentaId), (tx) => tx.select().from(datosFiscalesDeEmpresa));

    expect(await visibles(empresaA1, cuentaA)).toHaveLength(1);
    expect(await visibles(empresaA2, cuentaA)).toEqual([]);
    expect(await visibles(empresaB, cuentaB)).toEqual([]);
  });

  it('no se puede escribir en los de otra empresa', async () => {
    const intento = enTransaccionSegura(en(empresaA2, cuentaA), (tx) =>
      tx.insert(datosFiscalesDeEmpresa).values({ empresaId: empresaA1 }),
    );

    await expect(intento).rejects.toThrow();
  });

  it('un pequeño contribuyente no puede ser agente de retención (check)', async () => {
    const intento = enTransaccionSegura(en(empresaA2, cuentaA), (tx) =>
      tx
        .insert(datosFiscalesDeEmpresa)
        .values({ empresaId: empresaA2, regimenIva: 'pequeno_contribuyente', agenteDeRetencionIva: 'otro' }),
    );

    expect(await restriccionQueViola(intento)).toBe('datos_fiscales_de_empresa_pequeno_no_retiene');
  });
});

describe('datos fiscales del proveedor: seguridad por cuenta y llave compuesta', () => {
  it('se guardan con la cuenta de la transacción, sin que el código la escriba', async () => {
    await enTransaccionSegura(en(empresaA1, cuentaA), (tx) =>
      tx.insert(datosFiscalesDeProveedor).values(fiscalesDeProveedor(proveedorDeA)),
    );

    const [fila] = await enTransaccionSegura(en(empresaA1, cuentaA), (tx) =>
      tx.select().from(datosFiscalesDeProveedor),
    );
    expect(fila).toMatchObject({ proveedorId: proveedorDeA, cuentaId: cuentaA });
  });

  it('otra empresa de la misma cuenta los ve (son de la cuenta); otra cuenta, no', async () => {
    const visibles = (empresaId: string, cuentaId: string) =>
      enTransaccionSegura(en(empresaId, cuentaId), (tx) => tx.select().from(datosFiscalesDeProveedor));

    expect(await visibles(empresaA2, cuentaA)).toHaveLength(1);
    expect(await visibles(empresaB, cuentaB)).toEqual([]);
  });

  it('otra cuenta no puede cambiarlos ni borrarlos', async () => {
    const cambiados = await enTransaccionSegura(en(empresaB, cuentaB), (tx) =>
      tx
        .update(datosFiscalesDeProveedor)
        .set({ seLeRetieneIva: false })
        .where(eq(datosFiscalesDeProveedor.proveedorId, proveedorDeA))
        .returning(),
    );

    expect(cambiados).toEqual([]);
  });

  it('un proveedor de otra cuenta no se puede referenciar (llave compuesta con la cuenta)', async () => {
    const sinDatos = await crearProveedorEn(cuentaA, empresaA1);
    const intento = enTransaccionSegura(en(empresaB, cuentaB), (tx) =>
      tx.insert(datosFiscalesDeProveedor).values(fiscalesDeProveedor(sinDatos)),
    );

    expect(await restriccionQueViola(intento)).toBe('datos_fiscales_de_proveedor_proveedor_fk');
  });

  it('si el proveedor desaparece, se van sus datos fiscales', async () => {
    const proveedorEfimero = await crearProveedorEn(cuentaA, empresaA1);
    await enTransaccionSegura(en(empresaA1, cuentaA), (tx) =>
      tx.insert(datosFiscalesDeProveedor).values(fiscalesDeProveedor(proveedorEfimero)),
    );

    await enTransaccionSegura(en(empresaA1, cuentaA), (tx) =>
      tx.delete(proveedores).where(eq(proveedores.id, proveedorEfimero)),
    );

    const restantes = await enTransaccionSegura(en(empresaA1, cuentaA), (tx) =>
      tx.select().from(datosFiscalesDeProveedor).where(eq(datosFiscalesDeProveedor.proveedorId, proveedorEfimero)),
    );
    expect(restantes).toEqual([]);
  });
});

describe('datos fiscales del proveedor: check de coherencia', () => {
  const casos: Array<[string, Record<string, unknown>, string]> = [
    ['un pequeño contribuyente con régimen de ISR', { esPequenoContribuyente: true }, 'regimen_isr'],
    ['quien no es pequeño sin régimen de ISR', { regimenIsr: null }, 'regimen_isr'],
    [
      'un pequeño contribuyente agente de retención',
      { esPequenoContribuyente: true, regimenIsr: null, esAgenteDeRetencionIva: true, seLeRetieneIva: false },
      'pequeno_no_es_agente',
    ],
    [
      'retener el 5 % a quien no es pequeño contribuyente',
      { seLeRetieneIvaPequenoContribuyente: true },
      'retencion_iva_pequeno',
    ],
    [
      'retener el IVA general a un pequeño contribuyente',
      { esPequenoContribuyente: true, regimenIsr: null, seLeRetieneIva: true },
      'retencion_iva_general',
    ],
    [
      'retener ISR a un pequeño contribuyente',
      { esPequenoContribuyente: true, regimenIsr: null, seLeRetieneIva: false, seLeRetieneIsr: true },
      'retencion_isr',
    ],
    ['un régimen de ISR que no existe', { regimenIsr: 'inventado' }, 'regimen_isr_valido'],
  ];

  it.each(casos)('rechaza %s', async (_nombre, cambios, restriccion) => {
    const proveedorId = await crearProveedorEn(cuentaA, empresaA1);
    const intento = enTransaccionSegura(en(empresaA1, cuentaA), (tx) =>
      tx.insert(datosFiscalesDeProveedor).values(fiscalesDeProveedor(proveedorId, cambios) as never),
    );

    expect(await restriccionQueViola(intento)).toBe(`datos_fiscales_de_proveedor_${restriccion}`);
  });
});
