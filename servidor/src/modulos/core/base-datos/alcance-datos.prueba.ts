/**
 * Prueba de integración del alcance por registro: las políticas que construye `alcance.ts`
 * sobre el esquema `prueba` (ver `alcance-datos.soporte.ts`) muestran solo lo asignado al
 * usuario, salvo alcance total; el disparador asigna al creador.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { enTransaccionSegura } from '../compartido/pruebas/en-transaccion-segura.js';
import { politicaPorAlcance } from './alcance.js';
import {
  ALCANCE,
  RECURSO,
  borrarEsquemaDePrueba,
  como,
  comoPropietario,
  dialecto,
  ids,
  nombres,
  prepararEsquemaDePrueba,
} from './alcance-datos.soporte.js';

beforeAll(prepararEsquemaDePrueba);
afterAll(borrarEsquemaDePrueba);

describe('alcance por registro (RLS)', () => {
  it('el usuario solo ve los registros que tiene asignados', async () => {
    expect(await nombres(como(ids.asignado))).toEqual(['Uno']);
  });

  it('un usuario sin asignaciones no ve ningún registro', async () => {
    expect(await nombres(como(ids.sinAsignar))).toEqual([]);
  });

  it('con alcance total sobre el recurso ve todos los registros de la empresa', async () => {
    expect(await nombres(como(ids.sinAsignar, [RECURSO]))).toEqual(['Dos', 'Uno']);
  });

  it('el alcance total de otro recurso no sirve para este', async () => {
    expect(await nombres(como(ids.sinAsignar, ['otro.recurso']))).toEqual([]);
  });

  it('otra empresa no muestra nada, ni con alcance total', async () => {
    expect(await nombres(como(ids.asignado, [], ids.e2))).toEqual([]);
  });

  it('no puede cambiar ni borrar registros que no tiene asignados', async () => {
    const resultado = await enTransaccionSegura(como(ids.asignado), async (tx) => {
      const cambiados = await tx.execute(
        sql`update prueba.registros set nombre = 'X' where nombre = 'Dos' returning id`,
      );
      const borrados = await tx.execute(sql`delete from prueba.registros where nombre = 'Dos' returning id`);
      return [cambiados.rows.length, borrados.rows.length];
    });
    expect(resultado).toEqual([0, 0]);
  });

  it('un dependiente con columna opcional muestra los nulos y los de registros visibles', async () => {
    expect(await nombres(como(ids.asignado), 'prueba.dependientes')).toEqual(['dep-libre', 'dep-uno']);
  });

  it('un dependiente no puede apuntar a un registro que el usuario no ve', async () => {
    const intento = enTransaccionSegura(como(ids.asignado), (tx) =>
      tx.execute(
        sql`insert into prueba.dependientes (empresa_id, registro_id, nombre) values (${ids.e1}, ${ids.r2}, 'intruso')`,
      ),
    );
    await expect(intento).rejects.toThrow();
  });

  it('la política de una tabla dependiente obligatoria también filtra por alcance', () => {
    const politica = politicaPorAlcance(ALCANCE, 'registro_id');
    expect(politica.name).toBe('alcance_prueba_registros');
    expect(dialecto.sqlToQuery(politica.using as ReturnType<typeof sql.raw>).sql).not.toContain('is null');
  });
});

describe('asignar al creador (disparador)', () => {
  const crear = (usuarioId: string, nombre: string) =>
    enTransaccionSegura(como(usuarioId), (tx) =>
      tx.execute(sql`insert into prueba.registros (empresa_id, nombre) values (${ids.e1}, ${nombre})`),
    );

  it('quien crea sin alcance total puede hacerlo, y el registro queda asignado a él', async () => {
    await crear(ids.sinAsignar, 'Creado por sin');
    expect(await nombres(como(ids.sinAsignar))).toEqual(['Creado por sin']);
    expect(await nombres(como(ids.asignado))).toEqual(['Uno']);
  });

  it('quien no es miembro de la empresa (superacceso) crea sin quedar asignado', async () => {
    await crear(ids.ajeno, 'Creado por ajeno');
    const asignados = await comoPropietario(
      `select 1 from prueba.accesos_a_registros where usuario_id = '${ids.ajeno}'`,
    );
    expect(asignados.rows).toHaveLength(0);
  });

  it('con sinAsignarAlCrear (importar desde Excel) el registro queda sin asignar', async () => {
    await enTransaccionSegura({ ...como(ids.otroAsignado), sinAsignarAlCrear: true }, (tx) =>
      tx.execute(sql`insert into prueba.registros (empresa_id, nombre) values (${ids.e1}, 'Importado')`),
    );
    const asignados = await comoPropietario(
      `select 1 from prueba.accesos_a_registros a join prueba.registros r on r.id = a.registro_id where r.nombre = 'Importado'`,
    );
    expect(asignados.rows).toHaveLength(0);
    expect(await nombres(como(ids.otroAsignado))).not.toContain('Importado');
  });

  it('sin usuario en la transacción (semillas, migraciones) no asigna a nadie', async () => {
    const antes = await comoPropietario('select count(*)::int as n from prueba.accesos_a_registros');
    await comoPropietario(`insert into prueba.registros (empresa_id, nombre) values ('${ids.e1}', 'De semilla')`);
    const despues = await comoPropietario('select count(*)::int as n from prueba.accesos_a_registros');
    expect(despues.rows[0]).toEqual(antes.rows[0]);
  });
});
