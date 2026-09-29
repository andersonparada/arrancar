import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const MIGRACION = new URL('../modulos/bancos/migraciones/0029_h8_interes_bruto_e_isr_retenido.sql', import.meta.url);
const entorno = usarEntornoApi();

describe('migración 0028: permisos del reporte de intereses', () => {
  it('los reciben, por rol, quienes veían o exportaban movimientos, y correrla dos veces no repite nada', async () => {
    const cuenta = await darDeAltaCuenta(entorno, {
      nombre: 'Migra intereses',
      usuario: 'propietariomigraintereses',
      modulos: ['bancos'],
    });
    await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Mira',
      apellidos: 'Movimientos',
      permisos: ['bancos.movimientos.ver'],
    });
    await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Baja',
      apellidos: 'Movimientos',
      permisos: ['bancos.movimientos.exportar'],
    });
    const roles = (permiso: string) =>
      comoPropietario<{ nombre: string }>(
        `select r.nombre from core.rol_permisos rp join core.roles r on r.id = rp.rol_id
         where rp.permiso = $1 and r.cuenta_id = $2`,
        [permiso, cuenta.cuentaId],
      );
    expect(await roles('bancos.intereses.ver')).toEqual([]);

    const sql = readFileSync(MIGRACION, 'utf8');
    const permisosDeLaMigracion = sql.slice(sql.indexOf('INSERT INTO'));
    for (const sentencia of permisosDeLaMigracion.split('--> statement-breakpoint')) {
      await comoPropietario(sentencia, []);
      await comoPropietario(sentencia, []);
    }

    expect(await roles('bancos.intereses.ver')).toEqual([{ nombre: 'Rol de Mira' }]);
    expect(await roles('bancos.intereses.exportar')).toEqual([{ nombre: 'Rol de Baja' }]);
  });
});
