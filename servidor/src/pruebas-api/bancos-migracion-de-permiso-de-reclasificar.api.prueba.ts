import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const MIGRACION = new URL('../modulos/bancos/migraciones/0026_permiso_de_reclasificar_cheques.sql', import.meta.url);
const entorno = usarEntornoApi();

describe('migración 0026: permiso de reclasificar cheques', () => {
  it('lo reciben los roles que ya editaban notas y nadie más, y correrla dos veces no repite nada', async () => {
    const cuenta = await darDeAltaCuenta(entorno, {
      nombre: 'Migra permiso',
      usuario: 'propietariomigrapermiso',
      modulos: ['bancos'],
    });
    await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Editor',
      apellidos: 'Notas',
      permisos: ['bancos.notas.editar'],
    });
    await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector',
      apellidos: 'Notas',
      permisos: ['bancos.notas.ver'],
    });
    const roles = (permiso: string) =>
      comoPropietario<{ nombre: string }>(
        `select r.nombre from core.rol_permisos rp join core.roles r on r.id = rp.rol_id
         where rp.permiso = $1 and r.cuenta_id = $2`,
        [permiso, cuenta.cuentaId],
      );
    expect(await roles('bancos.cheques.reclasificar')).toEqual([]);

    const sql = readFileSync(MIGRACION, 'utf8');
    await comoPropietario(sql, []);
    await comoPropietario(sql, []);

    expect(await roles('bancos.cheques.reclasificar')).toEqual([{ nombre: 'Rol de Editor' }]);
  });
});
