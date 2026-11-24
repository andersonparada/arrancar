import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const MIGRACION = new URL(
  '../modulos/cuentas-por-pagar/migraciones/0014_cp_ap_cheques_de_apertura.sql',
  import.meta.url,
);
const entorno = usarEntornoApi();

describe('migración 0014 de Cuentas por pagar: permisos de ligar y desligar cheques de apertura', () => {
  it('los reciben, por rol, quienes aplicaban a la cuenta de apertura, y correrla dos veces no repite nada', async () => {
    const cuenta = await darDeAltaCuenta(entorno, {
      nombre: 'Migra cheques de apertura',
      usuario: 'propietariomigrachequesap',
      modulos: MODULOS_DE_CUENTAS_POR_PAGAR,
    });
    await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Aplica',
      apellidos: 'Apertura',
      permisos: ['cuentas-por-pagar.pagos.aplicar-a-apertura'],
    });
    await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Mira',
      permisos: ['cuentas-por-pagar.documentos.ver'],
    });
    const [directo] = await comoPropietario<{ id: string }>('select id from core.usuarios where usuario = $1', [
      cuenta.usuario,
    ]);
    const [ajeno] = await comoPropietario<{ id: string }>(
      `select ur.usuario_id as id from core.usuario_roles ur join core.roles r on r.id = ur.rol_id
       where r.nombre = 'Rol de Solo' and r.cuenta_id = $1`,
      [cuenta.cuentaId],
    );
    for (const [usuarioId, permiso] of [
      [directo!.id, 'cuentas-por-pagar.pagos.aplicar-a-apertura'],
      [ajeno!.id, 'cuentas-por-pagar.documentos.ver'],
    ])
      await comoPropietario('insert into core.usuario_permisos (cuenta_id, usuario_id, permiso) values ($1, $2, $3)', [
        cuenta.cuentaId,
        usuarioId,
        permiso,
      ]);
    const directos = (permiso: string) =>
      comoPropietario<{ usuario_id: string }>(
        'select usuario_id from core.usuario_permisos where permiso = $1 and cuenta_id = $2',
        [permiso, cuenta.cuentaId],
      );
    const roles = (permiso: string) =>
      comoPropietario<{ nombre: string }>(
        `select r.nombre from core.rol_permisos rp join core.roles r on r.id = rp.rol_id
         where rp.permiso = $1 and r.cuenta_id = $2`,
        [permiso, cuenta.cuentaId],
      );
    expect(await roles('cuentas-por-pagar.pagos.ligar-cheques-de-apertura')).toEqual([]);

    const sql = readFileSync(MIGRACION, 'utf8');
    for (const sentencia of sql.slice(sql.indexOf('INSERT INTO')).split('--> statement-breakpoint')) {
      await comoPropietario(sentencia, []);
      await comoPropietario(sentencia, []);
    }

    expect(await roles('cuentas-por-pagar.pagos.ligar-cheques-de-apertura')).toEqual([{ nombre: 'Rol de Aplica' }]);
    expect(await roles('cuentas-por-pagar.pagos.desligar-cheques-de-apertura')).toEqual([{ nombre: 'Rol de Aplica' }]);
    for (const accion of ['ligar', 'desligar'])
      expect(await directos(`cuentas-por-pagar.pagos.${accion}-cheques-de-apertura`)).toEqual([
        { usuario_id: directo!.id },
      ]);
  });
});
