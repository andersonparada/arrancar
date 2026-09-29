/**
 * Prueba de integración de la ventana de asignación: solo con `app.alcance_para_asignar` se
 * ven todos los registros y se escribe en la tabla de accesos; cambiar y eliminar siguen cerrados.
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { enTransaccionSegura } from '../compartido/pruebas/en-transaccion-segura.js';
import {
  RECURSO,
  borrarEsquemaDePrueba,
  como,
  comoPropietario,
  ids,
  nombres,
  paraAsignar,
  prepararEsquemaDePrueba,
} from './alcance-datos.soporte.js';

beforeAll(prepararEsquemaDePrueba);
afterAll(borrarEsquemaDePrueba);

const asignar = (usuarioId: string, registroId: string) =>
  sql`insert into prueba.accesos_a_registros (empresa_id, usuario_id, registro_id) values (${ids.e1}, ${usuarioId}, ${registroId})`;

describe('asignaciones fuera de la ventana', () => {
  it('sin la ventana no puede asignar, ni siquiera un registro que ve', async () => {
    const intento = enTransaccionSegura(como(ids.asignado), (tx) => tx.execute(asignar(ids.sinAsignar, ids.r1)));
    await expect(intento).rejects.toThrow();
  });

  it('el alcance total no da derecho a asignar', async () => {
    const intento = enTransaccionSegura(como(ids.sinAsignar, [RECURSO]), (tx) =>
      tx.execute(asignar(ids.sinAsignar, ids.r2)),
    );
    await expect(intento).rejects.toThrow();
  });

  it('sin la ventana no puede cambiar ni quitar asignaciones', async () => {
    const resultado = await enTransaccionSegura(como(ids.asignado, [RECURSO]), async (tx) => {
      const cambiadas = await tx.execute(
        sql`update prueba.accesos_a_registros set actualizado_por = ${ids.asignado} returning registro_id`,
      );
      const quitadas = await tx.execute(sql`delete from prueba.accesos_a_registros returning registro_id`);
      return [cambiadas.rows.length, quitadas.rows.length];
    });
    expect(resultado).toEqual([0, 0]);
  });

  it('la ventana de otro recurso no sirve para este', async () => {
    const contexto = { ...como(ids.asignado), recursosParaAsignar: ['otro.recurso'] };
    expect(await nombres(contexto)).toEqual(['Uno']);
    await expect(enTransaccionSegura(contexto, (tx) => tx.execute(asignar(ids.sinAsignar, ids.r1)))).rejects.toThrow();
  });
});

describe('ventana de asignación', () => {
  it('ve todos los registros de la empresa, aunque no tenga ninguno asignado', async () => {
    expect(await nombres(paraAsignar(ids.sinAsignar))).toEqual(['Dos', 'Uno']);
  });

  it('la tabla dependiente sigue filtrada por lo que el usuario ve normalmente', async () => {
    expect(await nombres(paraAsignar(ids.sinAsignar), 'prueba.dependientes')).toEqual(['dep-libre']);
  });

  it('no puede cambiar ni borrar registros que no tiene asignados', async () => {
    const resultado = await enTransaccionSegura(paraAsignar(ids.sinAsignar), async (tx) => {
      const cambiados = await tx.execute(sql`update prueba.registros set nombre = 'X' returning id`);
      const borrados = await tx.execute(sql`delete from prueba.registros returning id`);
      return [cambiados.rows.length, borrados.rows.length];
    });
    expect(resultado).toEqual([0, 0]);
  });

  it('asigna cualquier registro de la empresa a otro miembro, y lo quita', async () => {
    await enTransaccionSegura(paraAsignar(ids.asignado), (tx) => tx.execute(asignar(ids.sinAsignar, ids.r2)));
    expect(await nombres(como(ids.sinAsignar))).toEqual(['Dos']);
    const quitados = await enTransaccionSegura(paraAsignar(ids.asignado), (tx) =>
      tx.execute(
        sql`delete from prueba.accesos_a_registros where usuario_id = ${ids.sinAsignar} returning registro_id`,
      ),
    );
    expect(quitados.rows).toHaveLength(1);
    expect(await nombres(como(ids.sinAsignar))).toEqual([]);
  });

  it('puede asignarse a sí mismo un registro que no ve', async () => {
    await enTransaccionSegura(paraAsignar(ids.sinAsignar), (tx) => tx.execute(asignar(ids.sinAsignar, ids.r1)));
    expect(await nombres(como(ids.sinAsignar))).toEqual(['Uno']);
    await comoPropietario(`delete from prueba.accesos_a_registros where usuario_id = '${ids.sinAsignar}'`);
  });

  it('quien no es miembro de la empresa no puede recibir asignaciones', async () => {
    const intento = enTransaccionSegura(paraAsignar(ids.asignado), (tx) => tx.execute(asignar(ids.ajeno, ids.r1)));
    await expect(intento).rejects.toThrow();
  });

  it('en otra empresa solo ve lo de esa empresa y no asigna registros ajenos', async () => {
    expect(await nombres(paraAsignar(ids.asignado, ids.e2))).toEqual(['De otra empresa']);
    const intento = enTransaccionSegura(paraAsignar(ids.asignado, ids.e2), (tx) =>
      tx.execute(asignar(ids.otroAsignado, ids.r1)),
    );
    await expect(intento).rejects.toThrow();
  });

  it('leer, insertar y borrar en las tres tablas no provoca recursión de políticas', async () => {
    await enTransaccionSegura(paraAsignar(ids.asignado), async (tx) => {
      await tx.execute(sql`select * from prueba.accesos_a_registros`);
      await tx.execute(sql`select * from prueba.registros`);
      await tx.execute(sql`delete from prueba.dependientes where nombre = 'no-existe'`);
      await tx.execute(sql`delete from prueba.accesos_a_registros where registro_id is null`);
    });
  });
});
