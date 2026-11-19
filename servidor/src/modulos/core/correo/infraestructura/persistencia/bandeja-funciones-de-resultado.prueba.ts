/**
 * Prueba de integración contra PostgreSQL: la resolución de un intento y la depuración de correos, que corren como `arrancar_app`
 * (sin ver las filas de otras empresas ni poder borrar).
 */
import type pg from 'pg';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  ayudantesDeBandeja,
  enMinutos,
  guardarServidor,
  insertarDestinatario,
  prepararBandeja,
  type EscenarioDeBandeja,
} from '../../pruebas/bandeja.soporte.js';

interface OpcionesDeResolucion {
  codigo?: string | null;
  rechazados?: string[];
}

const bandeja = prepararBandeja();
const { unCorreo, fila } = ayudantesDeBandeja(bandeja);
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

describe('core.resolver_correo', () => {
  const resolver = async (
    id: string,
    resultado: string,
    { codigo = null, rechazados = [] }: OpcionesDeResolucion = {},
  ) =>
    (
      await aplicacion.query('select core.resolver_correo($1, $2, $3, $4::text[], 120) as estado', [
        id,
        resultado,
        codigo,
        rechazados,
      ])
    ).rows[0].estado;
  const enviando = (intentos = 1) => unCorreo('A1', { estado: 'enviando', intentos });
  const minutosHasta = (fecha: Date) => (fecha.getTime() - Date.now()) / 60_000;

  it('enviado: marca la fecha y el resultado de cada destinatario', async () => {
    const id = await enviando();
    await insertarDestinatario(propietario, {
      correoId: id,
      cuentaId: escenario.cuentaA,
      empresaId: escenario.empresaA1,
      direccion: 'Malo@prueba.com',
    });

    expect(await resolver(id, 'enviado', { rechazados: ['malo@prueba.com'] })).toBe('enviado');

    const guardada = await fila(id);
    expect(guardada).toMatchObject({ estado: 'enviado', bloqueado_hasta: null, ultimo_error_codigo: null });
    expect(guardada.enviado_en).toBeInstanceOf(Date);
    const { rows } = await propietario.query(
      'select direccion, resultado from core.destinatarios_de_correos where correo_saliente_id = $1 order by direccion',
      [id],
    );
    expect(rows.map((r) => r.resultado).sort()).toEqual(['aceptado', 'rechazado']);
  });

  it('temporal: vuelve a pendiente con la espera siguiente (1 minuto con 20 % de azar) y anota el intento', async () => {
    const id = await enviando(1);

    expect(await resolver(id, 'temporal', { codigo: 'ETIMEDOUT' })).toBe('pendiente');

    const guardada = await fila(id);
    expect(guardada).toMatchObject({ estado: 'pendiente', intentos: 1, ultimo_error_codigo: 'ETIMEDOUT' });
    expect(minutosHasta(guardada.proximo_intento)).toBeGreaterThan(0.7);
    expect(minutosHasta(guardada.proximo_intento)).toBeLessThan(1.3);
    const { rows } = await propietario.query(
      'select numero, resultado, codigo, duracion_ms from core.intentos_de_correos where correo_saliente_id = $1',
      [id],
    );
    expect(rows).toEqual([{ numero: 1, resultado: 'temporal', codigo: 'ETIMEDOUT', duracion_ms: 120 }]);
  });

  it.each([
    [2, 5],
    [3, 30],
    [4, 120],
    [5, 720],
    [7, 1440],
  ])('temporal en el intento %i espera cerca de %i minutos', async (intentos, minutos) => {
    const id = await enviando(intentos);

    await resolver(id, 'temporal', { codigo: '421' });

    const espera = minutosHasta((await fila(id)).proximo_intento);
    expect(espera).toBeGreaterThan(minutos * 0.78);
    expect(espera).toBeLessThan(minutos * 1.22);
  });

  it('temporal en el octavo intento queda fallido', async () => {
    const id = await enviando(8);

    expect(await resolver(id, 'temporal', { codigo: 'ETIMEDOUT' })).toBe('fallido');
    expect((await fila(id)).bloqueado_hasta).toBeNull();
  });

  it('permanente: fallido de inmediato', async () => {
    const id = await enviando(1);

    expect(await resolver(id, 'permanente', { codigo: '550' })).toBe('fallido');
    expect(await fila(id)).toMatchObject({ estado: 'fallido', ultimo_error_codigo: '550' });
  });

  it('autenticación o sin servidor: no gasta intento y espera 15 minutos; los intentos se numeran seguidos', async () => {
    const id = await enviando(1);

    await resolver(id, 'autenticacion', { codigo: 'EAUTH' });
    expect(await fila(id)).toMatchObject({ estado: 'pendiente', intentos: 0 });
    expect(minutosHasta((await fila(id)).proximo_intento)).toBeGreaterThan(14);
    await propietario.query(
      `update core.correos_salientes set estado = 'enviando', bloqueado_hasta = now() + interval '5 minutes', intentos = 1 where id = $1`,
      [id],
    );
    await resolver(id, 'sin_servidor');

    const { rows } = await propietario.query(
      'select numero, resultado from core.intentos_de_correos where correo_saliente_id = $1 order by numero',
      [id],
    );
    expect(rows).toEqual([
      { numero: 1, resultado: 'autenticacion' },
      { numero: 2, resultado: 'sin_servidor' },
    ]);
  });

  it('nunca guarda el texto del servidor: un código con espacios queda como DESCONOCIDO', async () => {
    const id = await enviando();

    await resolver(id, 'permanente', { codigo: '550 5.1.1 The email account does not exist' });

    expect((await fila(id)).ultimo_error_codigo).toBe('DESCONOCIDO');
    const { rows } = await propietario.query(
      'select codigo from core.intentos_de_correos where correo_saliente_id = $1',
      [id],
    );
    expect(rows[0].codigo).toBeNull();
  });

  it('solo resuelve correos que están enviándose y resultados conocidos', async () => {
    const pendiente = await unCorreo('A1');
    const id = await enviando();

    await expect(resolver(pendiente, 'enviado')).rejects.toThrow(/no está enviándose/);
    await expect(resolver(id, 'raro')).rejects.toThrow(/Resultado desconocido/);
  });
});

describe('core.depurar_correos', () => {
  const depurar = async (dias = 30, meses = 60) =>
    (await aplicacion.query('select * from core.depurar_correos($1, $2)', [dias, meses])).rows[0];
  const haceDias = (dias: number) => enMinutos(-dias * 24 * 60);

  it('exige conservar al menos 7 días y 60 meses', async () => {
    await expect(depurar(6, 60)).rejects.toThrow(/7 días/);
    await expect(depurar(30, 59)).rejects.toThrow(/60 meses/);
  });

  it('borra el cuerpo y el adjunto de los terminados viejos y conserva la huella; no toca pendientes ni recientes', async () => {
    const {
      rows: [archivo],
    } = await propietario.query(
      `insert into core.archivos (empresa_id, ruta_original, clase, tipo_mime, tamano_bytes)
       values ($1, 'correos/y.pdf', 'documento', 'application/pdf', 10) returning id`,
      [escenario.empresaA1],
    );
    const viejo = await unCorreo('A1', { estado: 'enviado', creadoEn: haceDias(40), adjuntoArchivoId: archivo.id });
    await propietario.query(`update core.correos_salientes set adjunto_sha256 = 'abc' where id = $1`, [viejo]);
    const reciente = await unCorreo('A1', { estado: 'enviado', creadoEn: haceDias(5) });
    const pendiente = await unCorreo('A1', { creadoEn: haceDias(40) });

    expect(await depurar()).toEqual({ contenido: 1, filas: 0 });

    expect(await fila(viejo)).toMatchObject({
      cuerpo_texto: null,
      cuerpo_html: null,
      adjunto_archivo_id: null,
      adjunto_nombre: 'comprobante.pdf',
      adjunto_sha256: 'abc',
    });
    expect((await fila(viejo)).contenido_depurado_en).toBeInstanceOf(Date);
    expect((await propietario.query('select 1 from core.archivos where id = $1', [archivo.id])).rowCount).toBe(0);
    expect((await fila(reciente)).cuerpo_texto).toBe('texto');
    expect((await fila(pendiente)).cuerpo_texto).toBe('texto');
  });

  it('borra las filas terminadas de más de 60 meses, con sus destinatarios, y no las pendientes', async () => {
    const antiguo = await unCorreo('A1', { estado: 'fallido', creadoEn: haceDias(61 * 31) });
    const pendiente = await unCorreo('A1', { creadoEn: haceDias(61 * 31) });
    const reciente = await unCorreo('A1', { estado: 'enviado', creadoEn: haceDias(100) });

    const { filas } = await depurar();

    expect(filas).toBe(1);
    expect(await fila(antiguo)).toBeUndefined();
    expect(
      (await propietario.query('select 1 from core.destinatarios_de_correos where correo_saliente_id = $1', [antiguo]))
        .rowCount,
    ).toBe(0);
    expect(await fila(pendiente)).toBeDefined();
    expect(await fila(reciente)).toBeDefined();
  });
});
