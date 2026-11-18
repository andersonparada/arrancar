/**
 * Prueba de integración contra PostgreSQL: los custodios de los fondos (un vigente, el disparador que les da acceso) y
 * los cambios de monto (forma por tipo, monto, movimiento de Bancos, apertura y cierre únicos, anulación).
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { cambiosDeMonto } from './cambios-de-monto.tablas.js';
import { custodiosDeFondos } from './custodios-de-fondos.tablas.js';
import { crearArqueo, crearCambioDeMonto, crearFondo } from './datos-de-caja-chica.soporte.js';
import {
  comoPropietario,
  contextoDe,
  contextoSinAlcance,
  crearMovimiento,
  prepararEscenario,
  restriccion,
  type Escenario,
} from './escenario.soporte.js';

let e: Escenario;
let fondoId: string;

beforeAll(async () => {
  e = await prepararEscenario();
});

afterAll(async () => {
  await grupoConexiones.end();
});

type NuevoCustodio = typeof custodiosDeFondos.$inferInsert;

const nombrar = (cambios: Partial<NuevoCustodio> = {}, fondo = fondoId) =>
  enTransaccionSegura(contextoDe(e), (tx) =>
    tx
      .insert(custodiosDeFondos)
      .values({ empresaId: e.empresaA1, fondoId: fondo, custodio: 'Juan Pérez', desde: '2026-03-01', ...cambios })
      .returning(),
  );

const accesosDelFondo = async (fondo: string) => {
  const { rows } = await comoPropietario<{ usuario_id: string }>(
    'select usuario_id from caja_chica.accesos_a_fondos where fondo_id = $1',
    [fondo],
  );
  return rows.map((fila) => fila.usuario_id);
};

describe('custodios de fondos', () => {
  beforeAll(async () => {
    fondoId = (await crearFondo(e)).id;
  });

  it('guarda el primer custodio, vigente y sin motivo del cambio', async () => {
    const [custodio] = await nombrar();

    expect(custodio).toMatchObject({ hasta: null, motivoDelCambio: null, custodioUsuarioId: null });
  });

  it('el nombre va recortado y de 1 a 150 caracteres', async () => {
    const otroFondo = (await crearFondo(e)).id;
    for (const custodio of [' Juan ', '', 'x'.repeat(151)]) {
      expect(await restriccion(nombrar({ custodio }, otroFondo))).toBe('custodios_custodio_valido');
    }
  });

  it('solo hay un custodio vigente por fondo, y el anterior se cierra con su fecha', async () => {
    expect(await restriccion(nombrar())).toBe('custodios_vigente_unico');

    await comoPropietario("update caja_chica.custodios_de_fondos set hasta = '2026-03-10' where fondo_id = $1", [
      fondoId,
    ]);
    await expect(
      nombrar({ custodio: 'María Gómez', desde: '2026-03-11', motivoDelCambio: 'Renuncia' }),
    ).resolves.toBeDefined();
  });

  it('el período no termina antes de empezar y el motivo es de 1 a 300 caracteres', async () => {
    const otroFondo = (await crearFondo(e)).id;

    expect(await restriccion(nombrar({ hasta: '2026-02-28' }, otroFondo))).toBe('custodios_periodo_valido');
    expect(await restriccion(nombrar({ motivoDelCambio: '' }, otroFondo))).toBe('custodios_motivo_valido');
  });

  it('el fondo es de la misma empresa (llave compuesta)', async () => {
    const otroFondo = (await crearFondo(e)).id;
    const intento = enTransaccionSegura(contextoDe(e, e.empresaA2), (tx) =>
      tx
        .insert(custodiosDeFondos)
        .values({ empresaId: e.empresaA2, fondoId: otroFondo, custodio: 'Ajeno', desde: '2026-03-01' }),
    );

    expect(await restriccion(intento)).toBe('custodios_fondo_fk');
  });

  it('el arqueo de entrega es del mismo fondo (llave compuesta)', async () => {
    const [fondoA, fondoB] = [(await crearFondo(e)).id, (await crearFondo(e)).id];
    const arqueo = await crearArqueo(e, fondoA);

    expect(await restriccion(nombrar({ arqueoDeEntregaId: arqueo.id }, fondoB))).toBe('custodios_arqueo_de_entrega_fk');
    await expect(nombrar({ arqueoDeEntregaId: arqueo.id }, fondoA)).resolves.toBeDefined();
  });

  it('si el usuario custodio se borra, el nombre queda', async () => {
    const otroFondo = (await crearFondo(e)).id;
    const [usuario] = await bd
      .insert(usuarios)
      .values({ usuario: 'custodioborrable', nombres: 'Custodio', hashContrasena: 'x' })
      .returning();
    await nombrar({ custodioUsuarioId: usuario!.id, custodio: 'Custodio Borrable' }, otroFondo);

    await comoPropietario('delete from core.usuarios where id = $1', [usuario!.id]);

    const [despues] = await enTransaccionSegura(contextoDe(e), (tx) =>
      tx.select().from(custodiosDeFondos).where(eq(custodiosDeFondos.fondoId, otroFondo)),
    );
    expect(despues).toMatchObject({ custodioUsuarioId: null, custodio: 'Custodio Borrable' });
  });
});

describe('disparador que da acceso al custodio (CC-e)', () => {
  it('el custodio que es miembro de la empresa recibe acceso sin tener el permiso de asignar', async () => {
    const fondo = (await crearFondo(e)).id;
    expect(await accesosDelFondo(fondo)).toEqual([e.usuarioId]);

    await nombrar({ custodioUsuarioId: e.custodioId }, fondo);

    expect((await accesosDelFondo(fondo)).sort()).toEqual([e.usuarioId, e.custodioId].sort());
  });

  it('al cambiar de custodio, el anterior conserva su acceso y el nuevo lo recibe', async () => {
    const fondo = (await crearFondo(e)).id;
    await nombrar({ custodioUsuarioId: e.custodioId, hasta: '2026-03-10' }, fondo);

    await nombrar({ custodioUsuarioId: e.otroId, desde: '2026-03-11', motivoDelCambio: 'Cambio' }, fondo);

    expect(await accesosDelFondo(fondo)).toEqual(expect.arrayContaining([e.custodioId, e.otroId]));
  });

  it('un usuario que no es de la empresa no recibe acceso, y un custodio de texto tampoco', async () => {
    const fondo = (await crearFondo(e)).id;
    const [ajeno] = await bd
      .insert(usuarios)
      .values({ usuario: 'custodioajeno', nombres: 'Ajeno', hashContrasena: 'x' })
      .returning();

    await nombrar({ custodioUsuarioId: ajeno!.id }, fondo);

    expect(await accesosDelFondo(fondo)).toEqual([e.usuarioId]);
  });

  it('el custodio ve su fondo sin alcance total', async () => {
    const fondo = (await crearFondo(e)).id;
    await nombrar({ custodioUsuarioId: e.custodioId }, fondo);

    const filas = await enTransaccionSegura(contextoSinAlcance(e, e.custodioId), (tx) =>
      tx.select().from(custodiosDeFondos).where(eq(custodiosDeFondos.fondoId, fondo)),
    );

    expect(filas).toHaveLength(1);
  });
});

describe('cambios de monto', () => {
  let fondo: string;

  beforeAll(async () => {
    fondo = (await crearFondo(e)).id;
  });

  it('la apertura por saldo inicial no lleva movimiento y la de banco sí', async () => {
    await expect(crearCambioDeMonto(e, fondo)).resolves.toMatchObject({ estado: 'vigente', movimientoId: null });

    const otro = (await crearFondo(e)).id;
    const movimientoId = await crearMovimiento(e);
    await expect(crearCambioDeMonto(e, otro, { forma: 'cheque', movimientoId })).resolves.toBeDefined();
    expect(await restriccion(crearCambioDeMonto(e, otro, { tipo: 'aumento', forma: 'cheque' }))).toBe(
      'cambios_movimiento_de_su_forma',
    );
    expect(
      await restriccion(
        crearCambioDeMonto(e, otro, { tipo: 'aumento', forma: 'cheque', movimientoId: crypto.randomUUID() }),
      ),
    ).toBe('cambios_de_monto_movimiento_id_movimientos_id_fk');
  });

  it('el tipo y la forma son de la lista y cada tipo acepta solo sus formas', async () => {
    expect(await restriccion(crearCambioDeMonto(e, fondo, { tipo: 'otro' as never }))).toBe('cambios_tipo_valido');
    expect(await restriccion(crearCambioDeMonto(e, fondo, { forma: 'efectivo' as never }))).toBe(
      'cambios_forma_valida',
    );
    const movimientoId = await crearMovimiento(e, 'debito');
    for (const [tipo, forma] of [
      ['aumento', 'saldo_inicial'],
      ['disminucion', 'cheque'],
      ['apertura', 'nota_de_credito'],
      ['cierre', 'cheque'],
    ] as const) {
      const conMovimiento = forma === 'saldo_inicial' ? undefined : movimientoId;
      const rechazo = await restriccion(crearCambioDeMonto(e, fondo, { tipo, forma, movimientoId: conMovimiento }));
      expect(rechazo).toBe('cambios_tipo_y_forma');
    }
  });

  it('el monto es positivo, salvo el cierre sin depósito, que es cero', async () => {
    expect(await restriccion(crearCambioDeMonto(e, fondo, { monto: '0' }))).toBe('cambios_monto_valido');
    expect(await restriccion(crearCambioDeMonto(e, fondo, { monto: '-1' }))).toBe('cambios_monto_valido');
    const cerrado = (await crearFondo(e)).id;
    expect(
      await restriccion(crearCambioDeMonto(e, cerrado, { tipo: 'cierre', forma: 'sin_deposito', monto: '5' })),
    ).toBe('cambios_sin_deposito_es_cero');
    await expect(
      crearCambioDeMonto(e, cerrado, { tipo: 'cierre', forma: 'sin_deposito', monto: '0' }),
    ).resolves.toBeDefined();
  });

  it('una sola apertura y un solo cierre vigentes; una anulada deja abrir de nuevo', async () => {
    expect(await restriccion(crearCambioDeMonto(e, fondo))).toBe('cambios_apertura_unica');
    expect(await restriccion(crearCambioDeMonto(e, fondo, { tipo: 'aumento', forma: 'saldo_inicial' }))).toBe(
      'cambios_tipo_y_forma',
    );
    await crearCambioDeMonto(e, fondo, { tipo: 'cierre', forma: 'sin_deposito', monto: '0' });
    expect(await restriccion(crearCambioDeMonto(e, fondo, { tipo: 'cierre', forma: 'sin_deposito', monto: '0' }))).toBe(
      'cambios_cierre_unico',
    );
    await comoPropietario(
      "update caja_chica.cambios_de_monto set estado = 'anulado', anulado_en = now(), anulado_por = $1, motivo_de_anulacion = 'Error', fecha_de_anulacion = fecha where fondo_id = $2 and tipo = 'apertura'",
      [e.usuarioId, fondo],
    );
    await expect(crearCambioDeMonto(e, fondo)).resolves.toBeDefined();
  });

  it('un movimiento de Bancos respalda un solo cambio', async () => {
    const otro = (await crearFondo(e)).id;
    const movimientoId = await crearMovimiento(e);
    await crearCambioDeMonto(e, otro, { forma: 'cheque', movimientoId });

    expect(await restriccion(crearCambioDeMonto(e, otro, { tipo: 'aumento', forma: 'cheque', movimientoId }))).toBe(
      'cambios_movimiento_unico',
    );
  });

  it('la anulación se escribe completa y su fecha no es anterior a la del cambio', async () => {
    const otro = (await crearFondo(e)).id;
    const completa = { anuladoEn: new Date(), anuladoPor: e.usuarioId, motivoDeAnulacion: 'Error' };

    expect(await restriccion(crearCambioDeMonto(e, otro, { estado: 'anulado' }))).toBe('cambios_anulacion_completa');
    expect(await restriccion(crearCambioDeMonto(e, otro, { anuladoEn: new Date() }))).toBe(
      'cambios_anulacion_completa',
    );
    expect(await restriccion(crearCambioDeMonto(e, otro, { estado: 'anulado', ...completa }))).toBe(
      'cambios_fecha_de_anulacion_de_su_estado',
    );
    expect(
      await restriccion(
        crearCambioDeMonto(e, otro, { estado: 'anulado', ...completa, fechaDeAnulacion: '2026-02-01' }),
      ),
    ).toBe('cambios_fecha_de_anulacion_valida');
    await expect(
      crearCambioDeMonto(e, otro, { estado: 'anulado', ...completa, fechaDeAnulacion: '2026-03-01' }),
    ).resolves.toBeDefined();
  });

  it('el fondo es de la misma empresa y un fondo no asignado no deja ver sus cambios', async () => {
    const sinApertura = (await crearFondo(e)).id;
    const intento = enTransaccionSegura(contextoDe(e, e.empresaA2), (tx) =>
      tx.insert(cambiosDeMonto).values({
        empresaId: e.empresaA2,
        fondoId: sinApertura,
        tipo: 'apertura',
        forma: 'saldo_inicial',
        fecha: '2026-03-01',
        monto: '10',
      }),
    );
    expect(await restriccion(intento)).toBe('cambios_fondo_fk');

    const vistos = await enTransaccionSegura(contextoSinAlcance(e, e.otroId), (tx) => tx.select().from(cambiosDeMonto));
    expect(vistos).toHaveLength(0);
  });
});
