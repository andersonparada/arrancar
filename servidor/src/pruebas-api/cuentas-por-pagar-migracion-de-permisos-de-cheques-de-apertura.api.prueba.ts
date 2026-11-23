import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
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
      usuario: 'propietariomigrachequesapertura',
      modulos: ['cuentas-por-pagar'],
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
  });
});
