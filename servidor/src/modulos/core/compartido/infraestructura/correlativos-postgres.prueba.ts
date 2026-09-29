/**
 * Prueba de integración contra PostgreSQL (base `arrancar_pruebas`): el correlativo es consecutivo,
 * separado por empresa, por clave y por año, y un `rollback` no deja huecos.
 */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../base-datos/conexion.js';
import { migrarModulos } from '../../base-datos/migrador.js';
import { cuentas } from '../../cuentas/infraestructura/persistencia/cuentas.tablas.js';
import { empresas } from '../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { definicionesModulos } from '../../../indice.js';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import type { PoliticaDeReinicioAnual } from '../aplicacion/correlativos.js';
import { CorrelativosPostgres } from './correlativos-postgres.js';
import { UnidadDeTrabajoPostgres } from './unidad-de-trabajo-postgres.js';

const CLAVE = 'bancos.notas_de_credito';
const unidadDeTrabajo = new UnidadDeTrabajoPostgres(bd);
let empresaA: ContextoEmpresa;
let empresaB: ContextoEmpresa;

class ReinicioAnualFijo implements PoliticaDeReinicioAnual {
  constructor(private readonly aplicaSiempre: boolean) {}

  async aplica(): Promise<boolean> {
    return this.aplicaSiempre;
  }
}

const sinReinicio = new CorrelativosPostgres(new ReinicioAnualFijo(false));
const conReinicio = new CorrelativosPostgres(new ReinicioAnualFijo(true));

interface Pedido {
  clave?: string;
  fecha?: string;
  correlativos?: CorrelativosPostgres;
}

/** Pide el siguiente número dentro de su propia transacción, como un caso de uso. */
const numeroDe = (
  contexto: ContextoEmpresa,
  { clave = CLAVE, fecha = '2026-03-01', correlativos = sinReinicio }: Pedido = {},
) => unidadDeTrabajo.ejecutar(contexto, () => correlativos.siguiente(clave, fecha));

async function vaciarComoPropietario(): Promise<void> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  await conexion.query('truncate core.cuentas, core.usuarios cascade');
  await conexion.end();
}

async function prepararDosEmpresas(): Promise<void> {
  const [cuenta] = await bd.insert(cuentas).values({ nombre: 'Cuenta A' }).returning();
  const [ana] = await bd.insert(usuarios).values({ usuario: 'ana', nombres: 'Ana', hashContrasena: 'x' }).returning();
  const [a, b] = await bd
    .insert(empresas)
    .values([
      { cuentaId: cuenta!.id, nombre: 'Empresa A' },
      { cuentaId: cuenta!.id, nombre: 'Empresa B' },
    ])
    .returning();
  empresaA = { cuentaId: cuenta!.id, empresaId: a!.id, usuarioId: ana!.id };
  empresaB = { cuentaId: cuenta!.id, empresaId: b!.id, usuarioId: ana!.id };
}

beforeAll(async () => {
  await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
  await vaciarComoPropietario();
  await prepararDosEmpresas();
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('correlativos en PostgreSQL', () => {
  it('entrega consecutivos empezando en 1', async () => {
    const primero = await numeroDe(empresaA);
    const segundo = await numeroDe(empresaA);
    const tercero = await numeroDe(empresaA);

    expect([primero, segundo, tercero]).toEqual([
      { numero: 1, anio: 0 },
      { numero: 2, anio: 0 },
      { numero: 3, anio: 0 },
    ]);
  });

  it('cada empresa lleva su propio correlativo', async () => {
    const deB = await numeroDe(empresaB);

    expect(deB.numero).toBe(1);
    expect((await numeroDe(empresaA)).numero).toBe(4);
  });

  it('cada clave lleva su propio correlativo', async () => {
    const debito = await numeroDe(empresaA, { clave: 'bancos.notas_de_debito' });

    expect(debito.numero).toBe(1);
  });

  it('si la operación se deshace, el número no se consume y no queda hueco', async () => {
    const antes = await numeroDe(empresaA);

    await expect(
      unidadDeTrabajo.ejecutar(empresaA, async () => {
        await sinReinicio.siguiente(CLAVE, '2026-03-01');
        throw new Error('falla la validación después de numerar');
      }),
    ).rejects.toThrow('falla la validación');

    const despues = await numeroDe(empresaA);
    expect(despues.numero).toBe(antes.numero + 1);
  });

  it('dos operaciones al mismo tiempo reciben números distintos y seguidos', async () => {
    const [uno, otro] = await Promise.all([numeroDe(empresaB), numeroDe(empresaB)]);

    expect([uno.numero, otro.numero].sort()).toEqual([2, 3]);
  });

  it('con reinicio anual, cada año empieza en 1 y guarda su año', async () => {
    const pedido = (fecha: string): Pedido => ({ clave: 'bancos.transferencias', fecha, correlativos: conReinicio });

    const del2026 = await numeroDe(empresaA, pedido('2026-12-31'));
    const del2027 = await numeroDe(empresaA, pedido('2027-01-01'));
    const otraDel2027 = await numeroDe(empresaA, pedido('2027-05-01'));

    expect(del2026).toEqual({ numero: 1, anio: 2026 });
    expect(del2027).toEqual({ numero: 1, anio: 2027 });
    expect(otraDel2027).toEqual({ numero: 2, anio: 2027 });
  });

  it('pedir un número fuera de una unidad de trabajo falla', async () => {
    await expect(sinReinicio.siguiente(CLAVE, '2026-03-01')).rejects.toThrow(/unidad de trabajo/);
  });
});
