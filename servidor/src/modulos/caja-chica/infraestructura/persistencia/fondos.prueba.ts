/**
 * Prueba de integración contra PostgreSQL: los fondos (checks, únicos, llave compuesta de la localidad, RLS por
 * empresa) y su alcance por registro (cada usuario ve los fondos que tiene asignados; el creador queda asignado).
 */
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { accesosAFondos } from './accesos-a-fondos.tablas.js';
import {
  comoPropietario,
  contextoDe,
  contextoSinAlcance,
  prepararEscenario,
  restriccion,
  type Escenario,
} from './escenario.soporte.js';
import { crearFondo } from './datos-de-caja-chica.soporte.js';
import { fondos } from './fondos.tablas.js';

let e: Escenario;

beforeAll(async () => {
  e = await prepararEscenario();
});

afterAll(async () => {
  await grupoConexiones.end();
});

const nombresVisibles = async (usuarioId: string, todos: boolean, empresaId = e.empresaA1) => {
  const filas = await enTransaccionSegura(
    todos ? contextoDe(e, empresaId, usuarioId) : contextoSinAlcance(e, usuarioId, empresaId),
    (tx) => tx.select({ nombre: fondos.nombre }).from(fondos),
  );
  return filas.map((fila) => fila.nombre).sort();
};

describe('fondos: valores', () => {
  it('guarda un fondo abierto con los valores por omisión', async () => {
    const fondo = await crearFondo(e, { nombre: 'Finca El Roble', topePorComprobante: '2000' });

    expect(fondo).toMatchObject({ estado: 'abierto', origen: 'banco', localidadId: null, cuentaBancariaId: null });
    expect(fondo.creadoPor).toBe(e.usuarioId);
  });

  it('el nombre va recortado, de 1 a 80 caracteres y sin repetirse en la empresa (sin mayúsculas ni acentos)', async () => {
    for (const nombre of [' Caja ', '', 'x'.repeat(81)]) {
      expect(await restriccion(crearFondo(e, { nombre }))).toBe('fondos_nombre_valido');
    }
    await crearFondo(e, { nombre: 'Oficina Central' });

    expect(await restriccion(crearFondo(e, { nombre: 'OFICINA central' }))).toBe('fondos_nombre_unico');
    await expect(crearFondo(e, { nombre: 'Oficina Central' }, contextoDe(e, e.empresaA2))).resolves.toBeDefined();
  });

  it('el tope es positivo si se escribe', async () => {
    expect(await restriccion(crearFondo(e, { topePorComprobante: '0' }))).toBe('fondos_tope_positivo');
    expect(await restriccion(crearFondo(e, { topePorComprobante: '-5' }))).toBe('fondos_tope_positivo');
  });

  it('el origen es banco o saldo inicial', async () => {
    await expect(crearFondo(e, { origen: 'saldo_inicial' })).resolves.toBeDefined();
    expect(await restriccion(crearFondo(e, { origen: 'otro' as never }))).toBe('fondos_origen_valido');
  });

  it('las observaciones van recortadas y de 1 a 500 caracteres', async () => {
    for (const observaciones of [' con espacios ', '', 'x'.repeat(501)]) {
      expect(await restriccion(crearFondo(e, { observaciones }))).toBe('fondos_observaciones_validas');
    }
  });

  it('la cuenta bancaria debe existir', async () => {
    await expect(crearFondo(e, { cuentaBancariaId: e.cuentaBancariaA1 })).resolves.toBeDefined();
    expect(await restriccion(crearFondo(e, { cuentaBancariaId: crypto.randomUUID() }))).toBe(
      'fondos_cuenta_bancaria_id_cuentas_bancarias_id_fk',
    );
  });
});

describe('fondos: localidad', () => {
  it('la localidad es de la misma empresa (llave compuesta)', async () => {
    await expect(crearFondo(e, { localidadId: e.localidadA1 })).resolves.toBeDefined();

    expect(await restriccion(crearFondo(e, { localidadId: e.localidadA2 }))).toBe('fondos_localidad_fk');
    expect(await restriccion(crearFondo(e, { localidadId: crypto.randomUUID() }))).toBe('fondos_localidad_fk');
  });
});

describe('fondos: cierre', () => {
  const cierre = () => ({
    estado: 'cerrado' as const,
    fechaDeCierre: '2026-04-01',
    cerradoEn: new Date(),
    cerradoPor: e.usuarioId,
    motivoDeCierre: 'Ya no se usa',
  });

  it('el cierre se escribe completo y solo en un fondo cerrado', async () => {
    await expect(crearFondo(e, cierre())).resolves.toBeDefined();

    expect(await restriccion(crearFondo(e, { estado: 'cerrado' }))).toBe('fondos_cierre_completo');
    expect(await restriccion(crearFondo(e, { ...cierre(), cerradoPor: null }))).toBe('fondos_cierre_completo');
    expect(await restriccion(crearFondo(e, { motivoDeCierre: 'Sin cerrar' }))).toBe('fondos_cierre_completo');
  });

  it('el estado es abierto o cerrado, el motivo de 1 a 300 y el cierre no es anterior a la apertura', async () => {
    expect(await restriccion(crearFondo(e, { estado: 'anulado' as never }))).toBe('fondos_estado_valido');
    expect(await restriccion(crearFondo(e, { ...cierre(), motivoDeCierre: '' }))).toBe('fondos_motivo_de_cierre_rango');
    expect(await restriccion(crearFondo(e, { ...cierre(), fechaDeCierre: '2026-02-28' }))).toBe(
      'fondos_fecha_de_cierre_valida',
    );
  });
});

describe('fondos: seguridad por empresa y por fondo asignado', () => {
  it('otra empresa no ve los fondos, ni con alcance total', async () => {
    await crearFondo(e, { nombre: 'Solo de A1' });

    expect(await nombresVisibles(e.usuarioId, true, e.empresaA2)).not.toContain('Solo de A1');
    expect(await nombresVisibles(e.usuarioId, true, e.empresaB)).toEqual([]);
  });

  it('no se puede crear un fondo de otra empresa', async () => {
    const intento = enTransaccionSegura(contextoDe(e, e.empresaA2), (tx) =>
      tx.insert(fondos).values({ empresaId: e.empresaA1, nombre: 'Ajeno', fechaDeApertura: '2026-03-01' }),
    );

    await expect(intento).rejects.toThrow();
  });

  it('quien crea el fondo queda asignado y lo ve sin alcance total', async () => {
    // Sin `returning`: la política de lectura se evalúa antes de que el disparador asigne el fondo.
    await enTransaccionSegura(contextoSinAlcance(e, e.custodioId), (tx) =>
      tx.insert(fondos).values({ empresaId: e.empresaA1, nombre: 'Del custodio', fechaDeApertura: '2026-03-01' }),
    );

    expect(await nombresVisibles(e.custodioId, false)).toEqual(['Del custodio']);
    expect(await nombresVisibles(e.otroId, false)).toEqual([]);
    const accesos = await comoPropietario<{ usuario_id: string }>(
      `select a.usuario_id from caja_chica.accesos_a_fondos a join caja_chica.fondos f on f.id = a.fondo_id
       where f.nombre = 'Del custodio'`,
    );
    expect(accesos.rows.map((fila) => fila.usuario_id)).toEqual([e.custodioId]);
  });

  it('un fondo no asignado no se ve, ni se puede cambiar o borrar', async () => {
    const ajeno = await crearFondo(e, { nombre: 'No asignado' });
    const contexto = contextoSinAlcance(e, e.otroId);

    expect(await nombresVisibles(e.otroId, false)).not.toContain('No asignado');
    const cambiados = await enTransaccionSegura(contexto, (tx) =>
      tx.execute(sql`update caja_chica.fondos set observaciones = 'X' where id = ${ajeno.id} returning id`),
    );
    const borrados = await enTransaccionSegura(contexto, (tx) =>
      tx.execute(sql`delete from caja_chica.fondos where id = ${ajeno.id} returning id`),
    );
    expect(cambiados.rows).toHaveLength(0);
    expect(borrados.rows).toHaveLength(0);
  });

  it('con alcance total ve todos los fondos de la empresa', async () => {
    const todos = await nombresVisibles(e.otroId, true);

    expect(todos).toEqual(expect.arrayContaining(['No asignado', 'Del custodio']));
  });
});

describe('accesos a fondos', () => {
  it('el usuario debe ser de la empresa y el fondo, de la misma (llaves compuestas)', async () => {
    const fondo = await crearFondo(e);
    const asignar = (usuarioId: string, empresaId: string, fondoId: string) =>
      comoPropietario(
        'insert into caja_chica.accesos_a_fondos (empresa_id, usuario_id, fondo_id) values ($1, $2, $3)',
        [empresaId, usuarioId, fondoId],
      );

    await expect(asignar(e.otroId, e.empresaA1, fondo.id)).resolves.toBeDefined();
    await expect(asignar(e.otroId, e.empresaA2, fondo.id)).rejects.toThrow(/accesos_a_fondos_/);
    await expect(asignar(e.otroId, e.empresaA1, crypto.randomUUID())).rejects.toThrow(/accesos_a_fondos_fondo_fk/);
  });

  it('al borrar el fondo se borran sus accesos', async () => {
    const fondo = await crearFondo(e);
    await comoPropietario(
      'insert into caja_chica.accesos_a_fondos (empresa_id, usuario_id, fondo_id) values ($1, $2, $3)',
      [e.empresaA1, e.custodioId, fondo.id],
    );

    await comoPropietario('delete from caja_chica.fondos where id = $1', [fondo.id]);

    const filas = await enTransaccionSegura(contextoDe(e), (tx) =>
      tx
        .select()
        .from(accesosAFondos)
        .where(sql`fondo_id = ${fondo.id}`),
    );
    expect(filas).toHaveLength(0);
  });
});
