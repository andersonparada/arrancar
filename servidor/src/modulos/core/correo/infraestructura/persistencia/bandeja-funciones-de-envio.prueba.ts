/**
 * Prueba de integración contra PostgreSQL: los cupos y la toma de correos pendientes, que corren como `arrancar_app`
 * (sin ver las filas de otras empresas ni poder borrar).
 */
import type pg from 'pg';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../../configuracion.js';
import {
  ayudantesDeBandeja,
  comoApp,
  enMinutos,
  guardarServidor,
  insertarDestinatario,
  prepararBandeja,
  type EscenarioDeBandeja,
} from '../../pruebas/bandeja.soporte.js';

const bandeja = prepararBandeja();
const { unCorreo, tomar, fila } = ayudantesDeBandeja(bandeja);
let propietario: pg.Client;
let aplicacion: pg.Client;
let escenario: EscenarioDeBandeja;

beforeAll(() => {
  ({ propietario, aplicacion, escenario } = bandeja);
});

beforeEach(async () => {
  await propietario.query('truncate core.correos_salientes cascade');
  await guardarServidor(propietario, true);
});

describe('core.reservar_cupo_de_correo', () => {
  const reservar = (contexto: { empresaId?: string; cuentaId?: string }, direcciones: string[]) =>
    comoApp<{
      por_hora: number;
      por_dia: number;
      de_la_instalacion_por_hora: number;
      por_destinatario: Record<string, number>;
    }>(aplicacion, contexto, ['select * from core.reservar_cupo_de_correo($1::text[])', [direcciones]]);
  const contextoA = () => ({ empresaId: escenario.empresaA1, cuentaId: escenario.cuentaA });

  it('sin cuenta en la transacción falla', async () => {
    await expect(reservar({}, [])).rejects.toThrow(/No hay una cuenta/);
  });

  it('cuenta por hora y por día los correos de todas las empresas de la cuenta, no los de otra', async () => {
    await unCorreo('A1');
    await unCorreo('A2');
    await unCorreo('A1', { creadoEn: enMinutos(-180) });
    await unCorreo('A1', { creadoEn: enMinutos(-60 * 30) });
    await unCorreo('B');

    const { rows } = await reservar(contextoA(), []);

    expect(rows[0]).toMatchObject({ por_hora: 2, por_dia: 3, de_la_instalacion_por_hora: 3 });
  });

  it('cuenta por destinatario en 24 horas sin distinguir mayúsculas, solo de la propia cuenta', async () => {
    const id = await unCorreo('A1');
    await insertarDestinatario(propietario, {
      correoId: id,
      cuentaId: escenario.cuentaA,
      empresaId: escenario.empresaA1,
      direccion: 'Ana@prueba.com',
    });
    const ajeno = await unCorreo('B');
    await insertarDestinatario(propietario, {
      correoId: ajeno,
      cuentaId: escenario.cuentaB,
      empresaId: escenario.empresaB,
      direccion: 'ana@prueba.com',
    });
    const viejo = await unCorreo('A1', { creadoEn: enMinutos(-60 * 30) });
    await insertarDestinatario(propietario, {
      correoId: viejo,
      cuentaId: escenario.cuentaA,
      empresaId: escenario.empresaA1,
      creadoEn: enMinutos(-60 * 30),
      direccion: 'ana@prueba.com',
    });

    const { rows } = await reservar(contextoA(), ['ANA@prueba.com', 'nadie@prueba.com']);

    expect(rows[0]?.por_destinatario).toEqual({ 'ana@prueba.com': 1, 'nadie@prueba.com': 0 });
  });

  it('acepta como máximo 10 direcciones', async () => {
    const once = Array.from({ length: 11 }, (_, i) => `d${i}@prueba.com`);

    await expect(reservar(contextoA(), once)).rejects.toThrow(/máximo 10/);
  });

  it('toma un candado por cuenta: una segunda transacción de la misma cuenta espera a la primera', async () => {
    const otra = new (await import('pg')).default.Client({ connectionString: configuracion.DATABASE_URL });
    await otra.connect();
    await aplicacion.query('begin');
    await aplicacion.query(`select set_config('app.cuenta_id', $1, true)`, [escenario.cuentaA]);
    await aplicacion.query('select * from core.reservar_cupo_de_correo($1::text[])', [[]]);
    await otra.query('begin');
    await otra.query(`select set_config('app.cuenta_id', $1, true), set_config('lock_timeout', '300ms', true)`, [
      escenario.cuentaA,
    ]);

    await expect(otra.query('select * from core.reservar_cupo_de_correo($1::text[])', [[]])).rejects.toThrow(
      /lock timeout/,
    );

    await otra.query('rollback');
    await otra.end();
    await aplicacion.query('rollback');
  });
});

describe('core.tomar_correos_pendientes', () => {
  it('con el servidor apagado o sin guardar no toma nada', async () => {
    const id = await unCorreo('A1');
    await guardarServidor(propietario, false);
    expect((await tomar()).rows).toEqual([]);
    await propietario.query('delete from core.servidor_de_correo');

    expect((await tomar()).rows).toEqual([]);
    expect((await fila(id)).estado).toBe('pendiente');
  });

  it('toma los pendientes de todas las empresas, con arriendo de 5 minutos y un intento más', async () => {
    const a = await unCorreo('A1');
    const b = await unCorreo('B');

    const { rows } = await tomar(10, 5);

    expect(rows.map((r) => r.id).sort()).toEqual([a, b].sort());
    expect(rows[0]).toMatchObject({ intentos: 1 });
    expect(rows[0].destinatarios[0]).toMatchObject({ clase: 'para' });
    const guardada = await fila(a);
    expect(guardada.estado).toBe('enviando');
    expect(guardada.intentos).toBe(1);
    const minutos = (guardada.bloqueado_hasta.getTime() - Date.now()) / 60_000;
    expect(minutos).toBeGreaterThan(4.5);
    expect(minutos).toBeLessThanOrEqual(5);
  });

  it('no toma lo que aún no toca, lo ya enviado ni lo que tiene arriendo vigente', async () => {
    await unCorreo('A1', { proximoIntento: enMinutos(30) });
    await unCorreo('A1', { estado: 'enviado' });
    await unCorreo('A1', { estado: 'enviando', intentos: 1 });
    await unCorreo('A1', { estado: 'cancelado' });

    expect((await tomar()).rows).toEqual([]);
  });

  it('retoma lo que quedó enviando con el arriendo vencido', async () => {
    const id = await unCorreo('A1', { estado: 'enviando', intentos: 1, bloqueadoHasta: enMinutos(-1) });

    const { rows } = await tomar();

    expect(rows.map((r) => r.id)).toEqual([id]);
    expect((await fila(id)).intentos).toBe(2);
  });

  it('un arriendo vencido que ya gastó los 8 intentos queda fallido', async () => {
    const id = await unCorreo('A1', { estado: 'enviando', intentos: 8, bloqueadoHasta: enMinutos(-1) });

    expect((await tomar()).rows).toEqual([]);
    expect(await fila(id)).toMatchObject({
      estado: 'fallido',
      ultimo_error_codigo: 'ARRIENDO_VENCIDO',
      bloqueado_hasta: null,
    });
  });

  it('respeta el límite y valida sus parámetros', async () => {
    await unCorreo('A1');
    await unCorreo('A1');

    expect((await tomar(1)).rows).toHaveLength(1);
    await expect(tomar(0)).rejects.toThrow(/entre 1 y 50/);
    await expect(tomar(51)).rejects.toThrow(/entre 1 y 50/);
    await expect(tomar(1, 0)).rejects.toThrow(/entre 1 y 30/);
    await expect(tomar(1, 31)).rejects.toThrow(/entre 1 y 30/);
  });

  it('devuelve la ruta del adjunto', async () => {
    const {
      rows: [archivo],
    } = await propietario.query(
      `insert into core.archivos (empresa_id, ruta_original, clase, tipo_mime, tamano_bytes)
       values ($1, 'correos/x.pdf', 'documento', 'application/pdf', 10) returning id`,
      [escenario.empresaA1],
    );
    await unCorreo('A1', { adjuntoArchivoId: archivo.id });

    const { rows } = await tomar();

    expect(rows[0]).toMatchObject({ adjunto_ruta: 'correos/x.pdf', adjunto_nombre: 'comprobante.pdf' });
  });

  it('dos trabajadores a la vez no toman el mismo correo (SKIP LOCKED)', async () => {
    const [a, b] = [await unCorreo('A1'), await unCorreo('A2')];
    const otra = new (await import('pg')).default.Client({ connectionString: configuracion.DATABASE_URL });
    await otra.connect();
    await aplicacion.query('begin');
    const primero = await aplicacion.query('select id from core.tomar_correos_pendientes(1, 5)');

    const segundo = await otra.query('select id from core.tomar_correos_pendientes(1, 5)');

    await aplicacion.query('rollback');
    await otra.end();
    expect(new Set([primero.rows[0].id, segundo.rows[0].id])).toEqual(new Set([a, b]));
  });
});
