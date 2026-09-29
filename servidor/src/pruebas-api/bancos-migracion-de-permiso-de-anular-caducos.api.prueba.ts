import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const MIGRACION = new URL(
  '../modulos/bancos/migraciones/0028_h6b_permiso_de_anular_cheques_caducos.sql',
  import.meta.url,
);
const entorno = usarEntornoApi();

describe('migración 0027: permiso de anular cheques caducos', () => {
  it('lo reciben los roles que ya anulaban cheques y nadie más, y correrla dos veces no repite nada', async () => {
    const cuenta = await darDeAltaCuenta(entorno, {
      nombre: 'Migra anular caducos',
      usuario: 'propietariomigraanularcaducos',
      modulos: ['bancos'],
    });
    await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Editor',
      apellidos: 'Notas',
      permisos: ['bancos.cheques.anular'],
    });
    await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector',
      apellidos: 'Notas',
      permisos: ['bancos.cheques.ver'],
    });
    const roles = (permiso: string) =>
      comoPropietario<{ nombre: string }>(
        `select r.nombre from core.rol_permisos rp join core.roles r on r.id = rp.rol_id
         where rp.permiso = $1 and r.cuenta_id = $2`,
        [permiso, cuenta.cuentaId],
      );
    expect(await roles('bancos.cheques-caducos.anular')).toEqual([]);

    const sql = readFileSync(MIGRACION, 'utf8');
    await comoPropietario(sql, []);
    await comoPropietario(sql, []);

    expect(await roles('bancos.cheques-caducos.anular')).toEqual([{ nombre: 'Rol de Editor' }]);
  });
});
