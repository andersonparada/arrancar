import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const MIGRACION = new URL('../modulos/bancos/migraciones/0035_saldos_por_cuenta_permisos.sql', import.meta.url);
const entorno = usarEntornoApi();

/** Corre a mano las instrucciones de datos de la migración, como en una base que ya tenía permisos. */
async function correrLaMigracion(): Promise<void> {
  const sql = readFileSync(MIGRACION, 'utf8');
  for (const sentencia of sql.slice(sql.indexOf('INSERT INTO')).split('--> statement-breakpoint'))
    await comoPropietario(sentencia, []);
}

describe('migración 0035: permisos de saldos por cuenta', () => {
  it('los reciben, por rol y por usuario, quienes veían o exportaban movimientos, y correrla dos veces no repite nada', async () => {
    const cuenta = await darDeAltaCuenta(entorno, {
      nombre: 'Migra saldos por cuenta',
      usuario: 'propietariomigrasaldos',
      modulos: ['bancos'],
    });
    await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Mira',
      apellidos: 'Saldos',
      permisos: ['bancos.movimientos.ver'],
    });
    await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Baja',
      apellidos: 'Saldos',
      permisos: ['bancos.movimientos.exportar'],
    });
    const [directo] = await comoPropietario<{ id: string }>('select id from core.usuarios where usuario = $1', [
      cuenta.usuario,
    ]);
    for (const permiso of ['bancos.movimientos.ver', 'bancos.movimientos.exportar'])
      await comoPropietario('insert into core.usuario_permisos (cuenta_id, usuario_id, permiso) values ($1, $2, $3)', [
        cuenta.cuentaId,
        directo!.id,
        permiso,
      ]);
    const roles = (permiso: string) =>
      comoPropietario<{ nombre: string }>(
        `select r.nombre from core.rol_permisos rp join core.roles r on r.id = rp.rol_id
         where rp.permiso = $1 and r.cuenta_id = $2`,
        [permiso, cuenta.cuentaId],
      );
    const directos = (permiso: string) =>
      comoPropietario<{ permiso: string }>(
        'select permiso from core.usuario_permisos where permiso = $1 and cuenta_id = $2',
        [permiso, cuenta.cuentaId],
      );
    expect(await roles('bancos.saldos-por-cuenta.ver')).toEqual([]);

    await correrLaMigracion();
    await correrLaMigracion();

    expect(await roles('bancos.saldos-por-cuenta.ver')).toEqual([{ nombre: 'Rol de Mira' }]);
    expect(await roles('bancos.saldos-por-cuenta.exportar')).toEqual([{ nombre: 'Rol de Baja' }]);
    expect(await directos('bancos.saldos-por-cuenta.ver')).toHaveLength(1);
    expect(await directos('bancos.saldos-por-cuenta.exportar')).toHaveLength(1);
  });
});
