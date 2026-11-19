/**
 * Prueba de integración contra PostgreSQL: la bandeja de correos respeta RLS (otra empresa, otra cuenta), la app no
 * puede borrar y las restricciones de las tablas rechazan lo que no debe guardarse.
 */
import type pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { comoApp, insertarCorreo, prepararBandeja, type EscenarioDeBandeja } from '../../pruebas/bandeja.soporte.js';

const bandeja = prepararBandeja();
let propietario: pg.Client;
let aplicacion: pg.Client;
let escenario: EscenarioDeBandeja;
let correoA1: string;
let correoB: string;

const SELECCION = 'select id from core.correos_salientes order by id';

beforeAll(async () => {
  ({ propietario, aplicacion, escenario } = bandeja);
  correoA1 = await insertarCorreo(propietario, { cuentaId: escenario.cuentaA, empresaId: escenario.empresaA1 });
  correoB = await insertarCorreo(propietario, { cuentaId: escenario.cuentaB, empresaId: escenario.empresaB });
  await propietario.query(
    `insert into core.intentos_de_correos (correo_saliente_id, empresa_id, numero, resultado)
     values ($1, $2, 1, 'temporal')`,
    [correoA1, escenario.empresaA1],
  );
});

const contextoA1 = () => ({ empresaId: escenario.empresaA1, cuentaId: escenario.cuentaA });

describe('aislamiento de la bandeja (RLS)', () => {
  it('cada empresa solo ve sus correos, destinatarios e intentos', async () => {
    const propios = await comoApp(aplicacion, contextoA1(), SELECCION);
    const destinatarios = await comoApp(
      aplicacion,
      contextoA1(),
      'select correo_saliente_id from core.destinatarios_de_correos',
    );
    const intentos = await comoApp(aplicacion, contextoA1(), 'select correo_saliente_id from core.intentos_de_correos');

    expect(propios.rows).toEqual([{ id: correoA1 }]);
    expect(destinatarios.rows).toEqual([{ correo_saliente_id: correoA1 }]);
    expect(intentos.rows).toEqual([{ correo_saliente_id: correoA1 }]);
  });

  it('otra empresa de la misma cuenta no ve nada', async () => {
    const ctx = { empresaId: escenario.empresaA2, cuentaId: escenario.cuentaA };

    for (const tabla of ['correos_salientes', 'destinatarios_de_correos', 'intentos_de_correos']) {
      expect((await comoApp(aplicacion, ctx, `select 1 from core.${tabla}`)).rows).toEqual([]);
    }
  });

  it('una empresa de otra cuenta no ve nada de la cuenta A', async () => {
    const ctx = { empresaId: escenario.empresaB, cuentaId: escenario.cuentaB };

    expect((await comoApp(aplicacion, ctx, SELECCION)).rows).toEqual([{ id: correoB }]);
    expect((await comoApp(aplicacion, ctx, 'select 1 from core.intentos_de_correos')).rows).toEqual([]);
  });

  it('sin empresa en la transacción no se ve ninguna fila', async () => {
    expect((await comoApp(aplicacion, {}, SELECCION)).rows).toEqual([]);
  });

  it('no deja insertar un correo a nombre de otra empresa', async () => {
    const insertar = comoApp(aplicacion, contextoA1(), [
      `insert into core.correos_salientes (empresa_id, cuenta_id, tipo, recurso_origen, registro_origen_id, asunto,
         cuerpo_texto, cuerpo_html, nombre_visible, message_id)
       values ($1, $2, 'prueba.aviso', 'x.y', gen_random_uuid(), 'A', 't', 'h', 'N', '<intruso@prueba.com>')`,
      [escenario.empresaB, escenario.cuentaB],
    ]);

    await expect(insertar).rejects.toThrow(/row-level security/);
  });

  it('la app inserta un correo en su empresa con la cuenta y la empresa de la transacción', async () => {
    const respuesta = await comoApp<{ empresa_id: string; cuenta_id: string }>(
      aplicacion,
      contextoA1(),
      `insert into core.correos_salientes (tipo, recurso_origen, registro_origen_id, asunto, cuerpo_texto, cuerpo_html,
         nombre_visible, message_id)
       values ('prueba.aviso', 'x.y', gen_random_uuid(), 'A', 't', 'h', 'N', '<propio@prueba.com>')
       returning empresa_id, cuenta_id`,
    );

    expect(respuesta.rows[0]).toEqual({ empresa_id: escenario.empresaA1, cuenta_id: escenario.cuentaA });
  });
});

describe('la app no puede borrar ni reescribir la bandeja', () => {
  it('borrar un correo propio no borra nada', async () => {
    const respuesta = await comoApp(aplicacion, contextoA1(), 'delete from core.correos_salientes');

    expect(respuesta.rowCount).toBe(0);
    expect((await propietario.query('select 1 from core.correos_salientes where id = $1', [correoA1])).rowCount).toBe(
      1,
    );
  });

  it('borrar destinatarios o intentos propios no borra nada', async () => {
    expect((await comoApp(aplicacion, contextoA1(), 'delete from core.destinatarios_de_correos')).rowCount).toBe(0);
    expect((await comoApp(aplicacion, contextoA1(), 'delete from core.intentos_de_correos')).rowCount).toBe(0);
  });

  it('no puede cambiar el resultado de un destinatario ni escribir intentos', async () => {
    const cambiar = await comoApp(
      aplicacion,
      contextoA1(),
      `update core.destinatarios_de_correos set resultado = 'aceptado'`,
    );
    const insertar = comoApp(aplicacion, contextoA1(), [
      `insert into core.intentos_de_correos (correo_saliente_id, empresa_id, numero, resultado)
       values ($1, $2, 9, 'enviado')`,
      [correoA1, escenario.empresaA1],
    ]);

    expect(cambiar.rowCount).toBe(0);
    await expect(insertar).rejects.toThrow(/row-level security/);
  });

  it('cancelar (update) funciona en la propia empresa y no toca la ajena', async () => {
    const cancelar = `update core.correos_salientes set estado = 'cancelado', cancelado_en = now(), motivo_de_cancelacion = 'Prueba'`;

    expect((await comoApp(aplicacion, contextoA1(), cancelar)).rowCount).toBe(1);
    const ajena = await comoApp(aplicacion, { empresaId: escenario.empresaA2, cuentaId: escenario.cuentaA }, cancelar);
    expect(ajena.rowCount).toBe(0);
  });

  it('no puede mover un correo a otra empresa', async () => {
    const mover = comoApp(aplicacion, contextoA1(), [
      'update core.correos_salientes set empresa_id = $1, cuenta_id = $2',
      [escenario.empresaB, escenario.cuentaB],
    ]);

    await expect(mover).rejects.toThrow(/row-level security/);
  });
});

describe('restricciones de la bandeja', () => {
  const cambiar = (asignacion: string) =>
    propietario.query(`update core.correos_salientes set ${asignacion} where id = $1`, [correoB]);

  it.each([
    ['un asunto con salto de línea', `asunto = E'Hola\\r\\nBcc: x@y.com'`],
    ['un asunto vacío', `asunto = ''`],
    ['un tipo mal formado', `tipo = 'Sin Punto'`],
    ['enviando sin arriendo', `estado = 'enviando'`],
    ['más de 8 intentos', 'intentos = 9'],
    ['un error con texto del servidor', `ultimo_error_codigo = '550 5.1.1 User unknown'`],
    ['un estado desconocido', `estado = 'raro'`],
    ['sin cuerpo y sin marca de depuración', 'cuerpo_texto = null'],
    ['un adjunto sin nombre', `adjunto_nombre = 'a.pdf'`],
  ])('rechaza %s', async (_caso, asignacion) => {
    await expect(cambiar(asignacion)).rejects.toThrow(/violates check constraint/);
  });

  it('no repite el Message-ID', async () => {
    await expect(
      propietario.query(
        'update core.correos_salientes set message_id = (select message_id from core.correos_salientes where id = $1) where id = $2',
        [correoA1, correoB],
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it('un destinatario no se repite en el mismo correo ni lleva una clase desconocida', async () => {
    const insertar = (clase: string, direccion: string) =>
      propietario.query(
        `insert into core.destinatarios_de_correos (correo_saliente_id, empresa_id, cuenta_id, clase, direccion, origen)
         values ($1, $2, $3, $4, $5, 'tercero')`,
        [correoB, escenario.empresaB, escenario.cuentaB, clase, direccion],
      );
    const existente = (
      await propietario.query('select direccion from core.destinatarios_de_correos where correo_saliente_id = $1', [
        correoB,
      ])
    ).rows[0].direccion;

    await expect(insertar('para', existente)).rejects.toThrow(/duplicate key/);
    await expect(insertar('oculta', 'otro@prueba.com')).rejects.toThrow(/violates check constraint/);
  });
});
