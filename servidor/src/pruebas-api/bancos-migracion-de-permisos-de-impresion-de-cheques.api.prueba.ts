import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const MIGRACION = new URL('../modulos/bancos/migraciones/0038_impresion_de_cheques.sql', import.meta.url);
const entorno = usarEntornoApi();

describe('migración 0038: permisos de la impresión de cheques', () => {
  it('los reciben, por rol y por usuario, quienes tenían el permiso base, y correrla dos veces no repite nada', async () => {
    const miCuenta = await darDeAltaCuenta(entorno, {
      nombre: 'Migra IC',
      usuario: 'propietariomigraic',
      modulos: ['bancos'],
    });
    const pares: Array<[string, string, string]> = [
      ['bancos.cheques.emitir', 'bancos.cheques.imprimir', 'Emite'],
      ['bancos.cheques.anular', 'bancos.cheques.reimprimir', 'Anula'],
      ['bancos.chequeras.ver', 'bancos.formatos-de-cheque.ver', 'Mira'],
      ['bancos.chequeras.exportar', 'bancos.correlativos-de-cheques.exportar', 'Baja'],
    ];
    for (const [base, , nombre] of pares)
      await crearUsuarioConPermisos(entorno, miCuenta, { nombres: nombre, apellidos: 'Migra', permisos: [base] });
    const [directo] = await comoPropietario<{ id: string }>('select id from core.usuarios where usuario = $1', [
      miCuenta.usuario,
    ]);
    await comoPropietario('insert into core.usuario_permisos (cuenta_id, usuario_id, permiso) values ($1, $2, $3)', [
      miCuenta.cuentaId,
      directo!.id,
      'bancos.cheques.anular',
    ]);
    const roles = (permiso: string) =>
      comoPropietario<{ nombre: string }>(
        `select r.nombre from core.rol_permisos rp join core.roles r on r.id = rp.rol_id
         where rp.permiso = $1 and r.cuenta_id = $2`,
        [permiso, miCuenta.cuentaId],
      );
    expect(await roles('bancos.cheques.reimprimir')).toEqual([]);

    const sql = readFileSync(MIGRACION, 'utf8');
    for (let vez = 0; vez < 2; vez += 1)
      for (const sentencia of sql.slice(sql.indexOf('INSERT INTO "core"')).split('--> statement-breakpoint'))
        await comoPropietario(sentencia, []);

    for (const [, nuevo, nombre] of pares) expect(await roles(nuevo)).toEqual([{ nombre: `Rol de ${nombre}` }]);
    const directos = await comoPropietario(
      `select 1 from core.usuario_permisos where permiso = 'bancos.cheques.reimprimir' and cuenta_id = $1`,
      [miCuenta.cuentaId],
    );
    expect(directos).toHaveLength(1);
  });
});
