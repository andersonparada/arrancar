/**
 * Prueba de integración contra PostgreSQL: los anticipos (checks, únicos, llaves hacia Bancos, el tercero y la
 * localidad, liquidación y destino de lo no liquidado, anulación, seguridad por empresa).
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { anticipos } from './anticipos.tablas.js';
import { crearAnticipo, valorDeAnticipo } from './datos-de-cuentas-por-liquidar.soporte.js';
import {
  comoPropietario,
  contextoDe,
  crearMovimiento,
  prepararEscenario,
  restriccion,
  type Escenario,
} from './escenario.soporte.js';

let e: Escenario;

beforeAll(async () => {
  e = await prepararEscenario();
});

afterAll(async () => {
  await grupoConexiones.end();
});

type Valores = Partial<typeof anticipos.$inferInsert>;
const anticipo = (cambios: Valores = {}) => restriccion(crearAnticipo(e, cambios));

const liquidado = (cambios: Valores = {}): Valores => ({
  estado: 'liquidado',
  fechaDeLiquidacion: '2026-03-20',
  liquidadoEn: new Date(),
  liquidadoPor: e.usuarioId,
  ...cambios,
});

describe('anticipos: la entrega', () => {
  it('guarda un anticipo abierto, sin liquidar, de su empresa', async () => {
    const fila = await crearAnticipo(e);

    expect(fila).toMatchObject({
      estado: 'abierto',
      anioDeNumero: 0,
      devuelto: '0.00',
      reembolsado: '0.00',
      noLiquidado: '0.00',
      destinoDeNoLiquidado: null,
      cuotas: null,
    });
    expect(fila.creadoPor).toBe(e.usuarioId);
  });

  it('el número es positivo y no se repite por empresa y año', async () => {
    const primero = await crearAnticipo(e);

    expect(await anticipo({ numero: 0 })).toBe('anticipos_numero_positivo');
    expect(await anticipo({ numero: primero.numero })).toBe('anticipos_numero_unico');
    await expect(crearAnticipo(e, { numero: primero.numero, anioDeNumero: 2026 })).resolves.toBeDefined();
  });

  it('el beneficiario es un tercero que existe y su nombre va recortado, de 1 a 150 caracteres', async () => {
    expect(await anticipo({ beneficiarioId: crypto.randomUUID() })).toBe('anticipos_beneficiario_id_terceros_id_fk');
    for (const beneficiario of [' Ana ', '', 'x'.repeat(151)]) {
      expect(await anticipo({ beneficiario })).toBe('anticipos_beneficiario_valido');
    }
  });

  it('la clase, la descripción, el monto, la fecha límite y la forma son válidos', async () => {
    expect(await anticipo({ clase: 'regalo' as never })).toBe('anticipos_clase_valida');
    expect(await anticipo({ descripcion: '' })).toBe('anticipos_descripcion_valida');
    expect(await anticipo({ monto: '0' })).toBe('anticipos_monto_positivo');
    expect(await anticipo({ fechaLimite: '2026-03-09' })).toBe('anticipos_fecha_limite_valida');
    expect(await anticipo({ forma: 'efectivo' as never })).toBe('anticipos_forma_valida');
    await expect(crearAnticipo(e, { fechaLimite: '2026-03-10', forma: 'nota_de_debito' })).resolves.toBeDefined();
  });

  it('el motivo de entregar a quien tenía vencidos va recortado y de 1 a 300 caracteres', async () => {
    await expect(crearAnticipo(e, { motivoConVencidos: 'Urgente' })).resolves.toBeDefined();

    expect(await anticipo({ motivoConVencidos: '' })).toBe('anticipos_motivo_con_vencidos_valido');
  });

  it('el cheque o la nota de Bancos existe y respalda un solo anticipo', async () => {
    const movimientoId = await crearMovimiento(e);
    await crearAnticipo(e, { movimientoId });

    expect(await anticipo({ movimientoId })).toBe('anticipos_movimiento_unico');
    expect(await anticipo({ movimientoId: crypto.randomUUID() })).toBe('anticipos_movimiento_id_movimientos_id_fk');
  });

  it('la localidad es de la misma empresa (llave compuesta)', async () => {
    await expect(crearAnticipo(e, { localidadId: e.localidadA1 })).resolves.toBeDefined();

    expect(await anticipo({ localidadId: e.localidadA2 })).toBe('anticipos_localidad_fk');
  });

  it('el usuario beneficiario existe y, si se borra, el nombre queda', async () => {
    const [otro] = await bd
      .insert(usuarios)
      .values({ usuario: 'beneficiarioborrable', nombres: 'Beneficiario', hashContrasena: 'x' })
      .returning();
    const fila = await crearAnticipo(e, { beneficiarioUsuarioId: otro!.id, beneficiario: 'Borrable' });

    expect(await anticipo({ beneficiarioUsuarioId: crypto.randomUUID() })).toBe(
      'anticipos_beneficiario_usuario_id_usuarios_id_fk',
    );
    await comoPropietario('delete from core.usuarios where id = $1', [otro!.id]);
    const [despues] = await enTransaccionSegura(contextoDe(e), (tx) =>
      tx.select().from(anticipos).where(eq(anticipos.id, fila.id)),
    );
    expect(despues).toMatchObject({ beneficiarioUsuarioId: null, beneficiario: 'Borrable' });
  });
});

describe('anticipos: estado y liquidación', () => {
  it('el estado es abierto, liquidado o anulado y la liquidación se escribe completa', async () => {
    expect(await anticipo({ estado: 'cerrado' as never })).toBe('anticipos_estado_valido');
    await expect(crearAnticipo(e, liquidado())).resolves.toBeDefined();

    expect(await anticipo({ estado: 'liquidado' })).toBe('anticipos_liquidacion_completa');
    expect(await anticipo({ fechaDeLiquidacion: '2026-03-20' })).toBe('anticipos_liquidacion_completa');
    expect(await anticipo(liquidado({ liquidadoPor: null }))).toBe('anticipos_liquidacion_completa');
  });

  it('un anticipo abierto no lleva devuelto, reembolso ni no liquidado', async () => {
    const deposito = await crearMovimiento(e);

    expect(await anticipo({ devuelto: '10', movimientoDeDevolucionId: deposito })).toBe(
      'anticipos_abierto_sin_liquidar',
    );
    expect(await anticipo({ reembolsado: '10', movimientoDeReembolsoId: deposito })).toBe(
      'anticipos_abierto_sin_liquidar',
    );
    expect(
      await anticipo({ noLiquidado: '10', destinoDeNoLiquidado: 'perdida', motivoDeNoLiquidado: 'Se perdió' }),
    ).toBe('anticipos_abierto_sin_liquidar');
  });

  it('lo devuelto lleva su depósito, y lo reembolsado, su movimiento', async () => {
    const deposito = await crearMovimiento(e);
    await expect(
      crearAnticipo(e, liquidado({ devuelto: '100', movimientoDeDevolucionId: deposito })),
    ).resolves.toBeDefined();

    expect(await anticipo(liquidado({ devuelto: '100' }))).toBe('anticipos_devolucion_con_deposito');
    expect(await anticipo(liquidado({ movimientoDeDevolucionId: await crearMovimiento(e) }))).toBe(
      'anticipos_devolucion_con_deposito',
    );
    expect(await anticipo(liquidado({ reembolsado: '50' }))).toBe('anticipos_reembolso_con_movimiento');
    expect(await anticipo(liquidado({ movimientoDeDevolucionId: deposito, devuelto: '1' }))).toBe(
      'anticipos_devolucion_unica',
    );
  });

  it('el reembolso solo existe si no sobró nada: ni devuelto ni no liquidado', async () => {
    const reembolso = await crearMovimiento(e);
    await expect(
      crearAnticipo(e, liquidado({ reembolsado: '50', movimientoDeReembolsoId: reembolso })),
    ).resolves.toBeDefined();

    expect(
      await anticipo(
        liquidado({
          reembolsado: '50',
          movimientoDeReembolsoId: await crearMovimiento(e),
          devuelto: '10',
          movimientoDeDevolucionId: await crearMovimiento(e),
        }),
      ),
    ).toBe('anticipos_reembolso_sin_sobrante');
    expect(await anticipo(liquidado({ reembolsado: '50', movimientoDeReembolsoId: reembolso }))).toBe(
      'anticipos_reembolso_unico',
    );
  });

  it('lo devuelto y lo no liquidado no son negativos ni pasan del monto', async () => {
    expect(await anticipo(liquidado({ devuelto: '-1' }))).toBe('anticipos_montos_liquidados_validos');
    expect(await anticipo(liquidado({ noLiquidado: '-1' }))).toBe('anticipos_montos_liquidados_validos');
    const pasado = liquidado({
      devuelto: '900',
      movimientoDeDevolucionId: await crearMovimiento(e),
      noLiquidado: '101',
      destinoDeNoLiquidado: 'perdida',
      motivoDeNoLiquidado: 'Se perdió',
    });
    expect(await anticipo(pasado)).toBe('anticipos_liquidacion_no_pasa_del_monto');
  });
});

describe('anticipos: lo no liquidado', () => {
  const noLiquidado = (cambios: Valores = {}) =>
    liquidado({
      noLiquidado: '100',
      destinoDeNoLiquidado: 'perdida',
      motivoDeNoLiquidado: 'No presentó facturas',
      ...cambios,
    });

  it('lo no liquidado lleva su destino y su motivo, y cada destino es uno de los tres', async () => {
    for (const destinoDeNoLiquidado of ['perdida', 'cobrar', 'renta_del_trabajo'] as const) {
      await expect(crearAnticipo(e, noLiquidado({ destinoDeNoLiquidado }))).resolves.toBeDefined();
    }

    expect(await anticipo(noLiquidado({ destinoDeNoLiquidado: null }))).toBe('anticipos_destino_de_lo_no_liquidado');
    expect(await anticipo(noLiquidado({ destinoDeNoLiquidado: 'regalo' as never }))).toBe('anticipos_destino_valido');
    expect(await anticipo(noLiquidado({ motivoDeNoLiquidado: null }))).toBe('anticipos_motivo_de_lo_no_liquidado');
    expect(await anticipo(noLiquidado({ motivoDeNoLiquidado: '' }))).toBe('anticipos_motivo_de_lo_no_liquidado_rango');
    expect(await anticipo(liquidado({ motivoDeNoLiquidado: 'Sin monto' }))).toBe('anticipos_motivo_de_lo_no_liquidado');
  });

  it('la renta del trabajo solo cabe en el anticipo de un empleado', async () => {
    const aUnTercero = noLiquidado({ esEmpleado: false, destinoDeNoLiquidado: 'renta_del_trabajo' });

    expect(await anticipo(aUnTercero)).toBe('anticipos_renta_solo_de_empleados');
    await expect(crearAnticipo(e, { ...aUnTercero, destinoDeNoLiquidado: 'cobrar', cuotas: 6 })).resolves.toBeDefined();
  });

  it('las cuotas solo van al cobrar y son al menos una', async () => {
    await expect(crearAnticipo(e, noLiquidado({ destinoDeNoLiquidado: 'cobrar', cuotas: 5 }))).resolves.toMatchObject({
      cuotas: 5,
    });

    expect(await anticipo(noLiquidado({ cuotas: 5 }))).toBe('anticipos_cuotas_solo_al_cobrar');
    expect(await anticipo(noLiquidado({ destinoDeNoLiquidado: 'cobrar', cuotas: 0 }))).toBe(
      'anticipos_cuotas_solo_al_cobrar',
    );
  });
});

describe('anticipos: anulación y seguridad', () => {
  const completa = () => ({ anuladoEn: new Date(), anuladoPor: e.usuarioId, motivoDeAnulacion: 'Error' });

  it('la anulación se escribe completa y su fecha contable no es anterior a la de la entrega', async () => {
    const anulado = (fechaDeAnulacion?: string) => ({ estado: 'anulado' as const, ...completa(), fechaDeAnulacion });

    expect(await anticipo({ estado: 'anulado' })).toBe('anticipos_anulacion_completa');
    expect(await anticipo({ anuladoEn: new Date() })).toBe('anticipos_anulacion_completa');
    expect(await anticipo(anulado())).toBe('anticipos_fecha_de_anulacion_de_su_estado');
    expect(await anticipo(anulado('2026-03-09'))).toBe('anticipos_fecha_de_anulacion_valida');
    expect(await anticipo({ ...anulado('2026-03-10'), motivoDeAnulacion: '' })).toBe(
      'anticipos_motivo_de_anulacion_rango',
    );
    await expect(crearAnticipo(e, anulado('2026-03-10'))).resolves.toBeDefined();
  });

  it('otra empresa no ve los anticipos ni puede escribir en los de esta', async () => {
    await crearAnticipo(e);

    const vistos = await enTransaccionSegura(contextoDe(e, e.empresaA2), (tx) => tx.select().from(anticipos));
    expect(vistos).toHaveLength(0);
    const ajeno = await valorDeAnticipo(e);
    const intento = enTransaccionSegura(contextoDe(e, e.empresaA2), (tx) => tx.insert(anticipos).values(ajeno));
    await expect(intento).rejects.toThrow();
  });
});
