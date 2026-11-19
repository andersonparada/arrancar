import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';

const MIGRACION = new URL('../modulos/libro-de-compras/migraciones/0038_bancarizacion_compartida.sql', import.meta.url);
const VIEJA = 'cuentas-por-pagar.bancarizacion.umbral';
const NUEVA = 'libro-de-compras.bancarizacion.umbral';
usarEntornoApi();

const valorDe = (clave: string) =>
  comoPropietario<{ valor: number }>(
    `select valor from core.configuraciones where nivel = 'instalacion' and clave = $1`,
    [clave],
  );

describe('migración 0037: el umbral de bancarización pasa al libro', () => {
  it('copia el valor de instalación de la clave vieja a la nueva sin pisar uno ya puesto, y es repetible', async () => {
    await comoPropietario(`delete from core.configuraciones where clave in ($1, $2)`, [VIEJA, NUEVA]);
    await comoPropietario(
      `insert into core.configuraciones (nivel, clave, valor) values ('instalacion', $1, to_jsonb(30000))`,
      [VIEJA],
    );
    const sql = readFileSync(MIGRACION, 'utf8');

    await comoPropietario(sql, []);
    await comoPropietario(sql, []);

    expect(await valorDe(NUEVA)).toEqual([{ valor: 30000 }]);
    expect(await valorDe(VIEJA)).toEqual([{ valor: 30000 }]);
    await comoPropietario(`delete from core.configuraciones where clave in ($1, $2)`, [VIEJA, NUEVA]);
  });

  it('sin valor en la clave vieja no crea nada', async () => {
    await comoPropietario(`delete from core.configuraciones where clave in ($1, $2)`, [VIEJA, NUEVA]);

    await comoPropietario(readFileSync(MIGRACION, 'utf8'), []);

    expect(await valorDe(NUEVA)).toEqual([]);
  });
});
