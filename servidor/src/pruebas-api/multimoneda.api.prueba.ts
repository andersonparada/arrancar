/** MM-5: el módulo Multimoneda: la orden `monedas_disponibles` con el módulo activo e inactivo y el reporte de tipos con su Excel. */
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import '../modulos/core/contratos/multimoneda.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { filasDeExcel } from './soporte/apertura-por-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const RUTA = '/api/multimoneda/tipos-de-cambio';
let con: CuentaDePrueba;
let sin: CuentaDePrueba;
let propietario: pg.Client;

async function operadorDe(cuenta: CuentaDePrueba): Promise<Operador> {
  const { rows } = await propietario.query<{ id: string }>('select id from core.usuarios where usuario = $1', [
    cuenta.usuario,
  ]);
  return { usuarioId: rows[0]!.id, cuentaId: cuenta.cuentaId, empresaId: cuenta.empresaId, esSuperacceso: false };
}

async function limpiar(): Promise<void> {
  await propietario.query(
    `delete from core.tipos_de_cambio where moneda = 'USD' and fecha between '2026-03-01' and '2026-03-31'`,
  );
  await propietario.query(`update core.monedas set activa = false where codigo = 'EUR'`);
}

beforeAll(async () => {
  con = await darDeAltaCuenta(entorno, { nombre: 'Con multimoneda', usuario: 'mmconmulti', modulos: ['multimoneda'] });
  sin = await darDeAltaCuenta(entorno, { nombre: 'Sin multimoneda', usuario: 'mmsinmulti' });
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: con.empresaId });
  propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await propietario.connect();
  await limpiar();
});

afterAll(async () => {
  await limpiar();
  await propietario.end();
});

describe('la orden multimoneda.monedas_disponibles', () => {
  it('con el módulo activo da las monedas activas distintas del quetzal', async () => {
    const operador = await operadorDe(con);

    const antes = await mediador.enviar(operador, 'multimoneda.monedas_disponibles', {});
    await entorno.soporte.patch('/api/monedas/EUR', { activa: true });
    const despues = await mediador.enviar(operador, 'multimoneda.monedas_disponibles', {});

    expect(antes.monedas.map((m) => m.codigo)).toContain('USD');
    expect(antes.monedas.map((m) => m.codigo)).not.toContain('GTQ');
    expect(antes.monedas.map((m) => m.codigo)).not.toContain('EUR');
    expect(despues.monedas.find((m) => m.codigo === 'EUR')).toEqual({
      codigo: 'EUR',
      nombre: expect.any(String),
      simbolo: expect.any(String),
      decimales: 2,
    });
  });

  it('con el módulo inactivo responde ModuloNoDisponible y solo valdría el quetzal', async () => {
    const operador = await operadorDe(sin);

    await expect(mediador.enviar(operador, 'multimoneda.monedas_disponibles', {})).rejects.toMatchObject({
      codigo: 'modulo_no_disponible',
    });
  });
});

describe('GET /api/multimoneda/tipos-de-cambio', () => {
  beforeAll(async () => {
    for (const [fecha, referencia] of [
      ['2026-03-02', '7.70'],
      ['2026-03-03', '7.71'],
    ] as const)
      await entorno.soporte.post('/api/tipos-de-cambio', {
        moneda: 'USD',
        fecha,
        referencia,
        motivo: 'Prueba de Multimoneda',
      });
  });

  const consulta = '?moneda=USD&desde=2026-03-01&hasta=2026-03-31';

  it('da la serie con su origen y la leyenda de la fuente, sin motivo ni usuario', async () => {
    const respuesta = await con.propietario.get(`${RUTA}${consulta}`);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ moneda: 'USD', fuente: 'Banco de Guatemala' });
    expect(respuesta.cuerpo.filas).toEqual([
      expect.objectContaining({ fecha: '2026-03-02', referencia: '7.7', origen: 'manual' }),
      expect.objectContaining({ fecha: '2026-03-03', referencia: '7.71', origen: 'manual' }),
    ]);
    expect(JSON.stringify(respuesta.cuerpo)).not.toContain('Prueba de Multimoneda');
  });

  it('exporta a Excel con la fuente en cada fila', async () => {
    const respuesta = await con.propietario.get(`${RUTA}/exportar${consulta}`);

    const filas = await filasDeExcel(respuesta.cuerpo as Buffer);
    expect(respuesta.estado).toBe(200);
    expect(filas[0]).toEqual(
      expect.arrayContaining([
        'Fecha',
        'Moneda',
        'Compra publicada',
        'Venta publicada',
        'Convención',
        'Dólar usado',
        'Fuente',
      ]),
    );
    expect(filas).toHaveLength(3);
    expect(filas[1]).toEqual(expect.arrayContaining(['USD', 'Ingreso manual de soporte']));
  });

  it('rechaza un rango de más de 366 días y no ofrece ni plantilla ni importación', async () => {
    const largo = await con.propietario.get(`${RUTA}?moneda=USD&desde=2024-01-01&hasta=2026-01-01`);
    const plantilla = await con.propietario.get(`${RUTA}/plantilla`);

    expect(largo.estado).toBe(400);
    expect(plantilla.estado).toBe(404);
  });

  it('pide el permiso de ver y, aparte, el de exportar', async () => {
    const soloVer = await crearUsuarioConPermisos(entorno, con, {
      nombres: 'Solo',
      apellidos: 'Ver tipos',
      permisos: ['multimoneda.tipos-de-cambio.ver'],
    });
    const soloExportar = await crearUsuarioConPermisos(entorno, con, {
      nombres: 'Exportador',
      apellidos: 'Tipos',
      permisos: ['multimoneda.tipos-de-cambio.exportar'],
    });

    expect((await soloVer.get(`${RUTA}${consulta}`)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA}/exportar${consulta}`)).estado).toBe(403);
    expect((await soloExportar.get(`${RUTA}${consulta}`)).estado).toBe(403);
    expect((await soloExportar.get(`${RUTA}/exportar${consulta}`)).estado).toBe(200);
  });

  it('una cuenta sin el módulo no ve el reporte', async () => {
    const respuesta = await sin.propietario.get(`${RUTA}${consulta}`);

    expect(respuesta.estado).toBe(403);
  });
});
