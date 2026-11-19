/**
 * Prueba de integración contra PostgreSQL (base de pruebas): las funciones de Empresas con los nombres de las
 * localidades y los departamentos (AF-P22 b, para revisión de seguridad) no aplican el alcance de localidades, pero
 * sí la empresa activa, y no devuelven más columnas que las previstas.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { comoPropietario, prepararEscenarioEnBd, type EscenarioEnBd } from '../../pruebas/escenario-en-bd.js';

let escenario: EscenarioEnBd;

const enA1 = () => escenario.en(escenario.empresaA1);

beforeAll(async () => {
  escenario = await prepararEscenarioEnBd('ubicacionesaf');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('nombres de las ubicaciones sin el alcance de localidades (funciones de Empresas, AF-P22 b)', () => {
  const nombres = (contexto: ContextoEmpresa, ids: string[] | null = null) =>
    enTransaccionSegura(contexto, async () => {
      const resultado = await transaccionEnCurso().execute(
        sql`select * from empresas.nombres_de_localidades(${
          ids
            ? sql`array[${sql.join(
                ids.map((id) => sql`${id}`),
                sql`, `,
              )}]::uuid[]`
            : sql`null`
        })`,
      );
      return resultado.rows as Array<Record<string, unknown>>;
    });

  it('quien no tiene la localidad asignada no la ve en la tabla, pero sí su nombre por la función', async () => {
    const directa = await enTransaccionSegura(enA1(), (tx) => tx.execute(sql`select id from empresas.localidades`));

    const porFuncion = await nombres(enA1());

    expect(directa.rows).toEqual([]);
    expect(porFuncion).toEqual([
      { id: escenario.localidadA1, codigo: 'FINCA', nombre: 'Finca La Esperanza', activo: true },
    ]);
  });

  it('solo da la empresa activa: nunca la hermana de la misma cuenta ni, con ids ajenos, la de otra', async () => {
    const hermana = await nombres(enA1(), [escenario.localidadA2]);
    const propia = await nombres(escenario.en(escenario.empresaA2));

    expect(hermana).toEqual([]);
    expect(propia.map((fila) => fila.codigo)).toEqual(['OFICINA']);
  });

  it('sin empresa en la transacción no devuelve nada', async () => {
    const filas = await comoPropietario('select * from empresas.nombres_de_localidades(null)');

    expect(filas).toEqual([]);
  });

  it('devuelve solo las columnas previstas y los departamentos incluyen su localidad', async () => {
    await comoPropietario(
      "insert into empresas.departamentos (empresa_id, codigo, nombre, localidad_id) values ($1, 'TALLER', 'Taller', $2)",
      [escenario.empresaA1, escenario.localidadA1],
    );

    const departamentos = await enTransaccionSegura(enA1(), (tx) =>
      tx.execute(sql`select * from empresas.nombres_de_departamentos(null)`),
    );
    expect(Object.keys(departamentos.rows[0]!).sort()).toEqual(['activo', 'codigo', 'id', 'localidad_id', 'nombre']);
  });

  it('solo arrancar_app puede ejecutarlas (no PUBLIC)', async () => {
    const [fila] = await comoPropietario<{ publico: boolean; app: boolean }>(
      `select has_function_privilege('public', 'empresas.nombres_de_localidades(uuid[])', 'execute') as publico,
              has_function_privilege('arrancar_app', 'empresas.nombres_de_localidades(uuid[])', 'execute') as app`,
    );

    expect(fila).toEqual({ publico: false, app: true });
  });
});
