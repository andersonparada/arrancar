import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let propietario: pg.Client;

type Opcion = { codigo: number; disponible: boolean; asignadaA: string | null };
type Moneda = { codigo: string; activa: boolean; codigoBanguat: number | null; tieneSerieDelBanguat: boolean };

/** Lo auditado de la moneda, leído como propietario de la base (la app solo puede agregar). */
async function auditoriaDeMoneda(codigo: string): Promise<string[]> {
  const { rows } = await propietario.query(
    `select accion from core.auditoria where recurso = 'core.monedas' and registro_id = $1 order by creado_en`,
    [codigo],
  );
  return rows.map((fila) => fila.accion);
}

async function limpiar(): Promise<void> {
  await propietario.query(`delete from core.tipos_de_cambio where moneda in ('USD', 'EUR', 'GBP')`);
  await propietario.query(`delete from core.consultas_al_banguat where moneda in ('EUR', 'GBP')`);
  await propietario.query(
    `update core.monedas set activa = false, codigo_banguat = null where codigo in ('EUR', 'GBP')`,
  );
  await propietario.query(`delete from core.monedas_del_banguat where codigo in (28, 29)`);
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Monedas y tipos', usuario: 'mmonedas' });
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
  propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await propietario.connect();
  await limpiar();
  await propietario.query(
    `insert into core.monedas_del_banguat (codigo, descripcion) values (28, 'Euro'), (29, 'Libra esterlina')`,
  );
});

afterAll(async () => {
  await limpiar();
  await propietario.end();
});

describe('GET /api/monedas', () => {
  it('cualquier usuario con sesión lee el catálogo con el quetzal y el dólar activos', async () => {
    const respuesta = await cuenta.propietario.get('/api/monedas');

    const porCodigo = new Map<string, Moneda>(respuesta.cuerpo.map((m: Moneda) => [m.codigo, m]));
    expect(respuesta.estado).toBe(200);
    expect(porCodigo.get('GTQ')).toMatchObject({ activa: true, codigoBanguat: null });
    expect(porCodigo.get('USD')).toMatchObject({
      activa: true,
      codigoBanguat: 2,
      descripcionBanguat: expect.any(String),
    });
    expect(porCodigo.get('EUR')).toMatchObject({ activa: false, tieneSerieDelBanguat: false });
  });

  it('exige sesión', async () => {
    expect((await entorno.nuevoCliente().get('/api/monedas')).estado).toBe(401);
  });
});

describe('GET /api/monedas/banguat', () => {
  it('es solo de soporte y dice a quién pertenece cada código', async () => {
    const propia = await cuenta.propietario.get('/api/monedas/banguat');
    const soporte = await entorno.soporte.get('/api/monedas/banguat');

    expect(propia.estado).toBe(403);
    expect(soporte.estado).toBe(200);
    expect(soporte.cuerpo.find((o: Opcion) => o.codigo === 2)).toMatchObject({ asignadaA: 'USD', disponible: true });
    expect(soporte.cuerpo.find((o: Opcion) => o.codigo === 28)).toMatchObject({ asignadaA: null, excluida: false });
  });
});

describe('PATCH /api/monedas/:codigo', () => {
  it('el propietario de la cuenta no puede cambiar monedas', async () => {
    const respuesta = await cuenta.propietario.patch('/api/monedas/EUR', { activa: true });

    expect(respuesta.estado).toBe(403);
  });

  it('soporte activa y desactiva una moneda, y queda en la auditoría', async () => {
    const activada = await entorno.soporte.patch('/api/monedas/EUR', { activa: true });
    const desactivada = await entorno.soporte.patch('/api/monedas/EUR', { activa: false });

    expect(activada.cuerpo).toMatchObject({ codigo: 'EUR', activa: true });
    expect(desactivada.cuerpo.activa).toBe(false);
    expect(await auditoriaDeMoneda('EUR')).toEqual(['reactivar', 'inactivar']);
  });

  it('pone las letras del monto en mayúsculas, las dos juntas', async () => {
    const completas = await entorno.soporte.patch('/api/monedas/GBP', {
      letrasSingular: 'libra',
      letrasPlural: 'libras',
    });
    const incompletas = await entorno.soporte.patch('/api/monedas/EUR', { letrasSingular: 'euro' });

    expect(completas.cuerpo).toMatchObject({ letrasSingular: 'LIBRA', letrasPlural: 'LIBRAS' });
    expect(incompletas.estado).toBe(422);
    expect(incompletas.cuerpo.error.codigo).toBe('letras_incompletas');
    await propietario.query(
      `update core.monedas set letras_singular = null, letras_plural = null where codigo = 'GBP'`,
    );
  });

  it('no activa monedas sin dos decimales ni desactiva el quetzal', async () => {
    const yen = await entorno.soporte.patch('/api/monedas/JPY', { activa: true });
    const quetzal = await entorno.soporte.patch('/api/monedas/GTQ', { activa: false });
    const conCodigo = await entorno.soporte.patch('/api/monedas/GTQ', { codigoBanguat: 28 });

    expect(yen.cuerpo.error.codigo).toBe('moneda_sin_dos_decimales');
    expect(quetzal.cuerpo.error.codigo).toBe('moneda_base_no_se_desactiva');
    expect(conCodigo.cuerpo.error.codigo).toBe('codigo_del_banguat_en_gtq');
    expect([yen.estado, quetzal.estado, conCodigo.estado]).toEqual([422, 422, 422]);
  });

  it('rechaza códigos que el Banguat no ofrece o que ya son de otra moneda', async () => {
    const inexistente = await entorno.soporte.patch('/api/monedas/EUR', { codigoBanguat: 77 });
    const enUso = await entorno.soporte.patch('/api/monedas/EUR', { codigoBanguat: 2 });

    expect(inexistente.estado).toBe(422);
    expect(inexistente.cuerpo.error.codigo).toBe('codigo_del_banguat_no_ofrecido');
    expect(enUso.estado).toBe(409);
    expect(enUso.cuerpo.error).toMatchObject({ codigo: 'codigo_del_banguat_en_uso', detalles: { moneda: 'USD' } });
  });

  it('valida el cuerpo y responde 404 a una moneda que no existe', async () => {
    expect((await entorno.soporte.patch('/api/monedas/EUR', { codigoBanguat: 1.5 })).estado).toBe(400);
    expect((await entorno.soporte.patch('/api/monedas/EURO', { activa: true })).estado).toBe(400);
    expect((await entorno.soporte.patch('/api/monedas/XXX', { activa: true })).estado).toBe(404);
  });

  it('une el euro con su código; con tipos cargados no deja cambiarlo; quitarlo se audita', async () => {
    const unida = await entorno.soporte.patch('/api/monedas/EUR', { codigoBanguat: 28 });
    expect(unida.cuerpo).toMatchObject({ codigoBanguat: 28, descripcionBanguat: 'Euro', tieneSerieDelBanguat: false });

    const consulta = await propietario.query(
      `insert into core.consultas_al_banguat (iniciada_en, terminada_en, operacion, vuelta, moneda, resultado)
       values (now(), now(), 'TipoCambioRangoMoneda', 'manana', 'EUR', 'exito') returning id`,
    );
    await propietario.query(
      `insert into core.tipos_de_cambio (moneda, fecha, referencia, origen, codigo_banguat, consulta_id)
       values ('EUR', '2026-01-05', 8.8, 'banguat', 28, $1)`,
      [consulta.rows[0].id],
    );

    const lista = await cuenta.propietario.get('/api/monedas');
    const otro = await entorno.soporte.patch('/api/monedas/EUR', { codigoBanguat: 29 });
    const quitada = await entorno.soporte.patch('/api/monedas/EUR', { codigoBanguat: null });

    expect(lista.cuerpo.find((m: Moneda) => m.codigo === 'EUR')).toMatchObject({ tieneSerieDelBanguat: true });
    expect(otro.estado).toBe(409);
    expect(otro.cuerpo.error).toMatchObject({
      codigo: 'codigo_del_banguat_con_otra_serie',
      detalles: { moneda: 'EUR', codigoDeLaSerie: 28 },
    });
    expect(quitada.cuerpo.codigoBanguat).toBeNull();
    expect(await auditoriaDeMoneda('EUR')).toContain('corregir');
  });
});
