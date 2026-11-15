/**
 * Prueba de integración contra PostgreSQL: los retiros de efectivo (checks, únicos, llaves hacia Bancos y el usuario
 * custodio, RLS).
 */
import pg from 'pg';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../../../../configuracion.js';
import { bd, grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { contextoDe, errorDePostgres, prepararEscenario, type Escenario } from './escenario.soporte.js';
import { prepararBancos } from './movimientos-de-bancos.soporte.js';
import { retirosDeEfectivo } from './retiros-de-efectivo.tablas.js';

let e: Escenario;
let nuevoMovimiento: () => Promise<string>;
let secuencia = 0;
const contexto = () => contextoDe(e, e.empresaA1, e.cuentaA);

type NuevoRetiro = typeof retirosDeEfectivo.$inferInsert;

async function retiroValido(cambios: Partial<NuevoRetiro> = {}): Promise<NuevoRetiro> {
  secuencia += 1;
  return {
    empresaId: e.empresaA1,
    numero: secuencia,
    forma: 'cheque',
    fecha: '2026-03-15',
    monto: '1000',
    movimientoId: await nuevoMovimiento(),
    custodio: 'Juan Pérez',
    ...cambios,
  };
}

async function crearRetiro(cambios: Partial<NuevoRetiro> = {}) {
  const valores = await retiroValido(cambios);
  const [fila] = await enTransaccionSegura(contexto(), (tx) =>
    tx.insert(retirosDeEfectivo).values(valores).returning(),
  );
  return fila!;
}

const restriccion = async (operacion: Promise<unknown>) => (await errorDePostgres(operacion))?.constraint;

const anulacion = { anuladoEn: new Date(), anuladoPor: undefined as string | undefined, motivoDeAnulacion: 'Error' };

async function liquidado(cambios: Partial<NuevoRetiro> = {}): Promise<Partial<NuevoRetiro>> {
  return {
    estado: 'liquidado',
    fechaDeLiquidacion: '2026-03-20',
    liquidadoEn: new Date(),
    liquidadoPor: e.usuarioId,
    ...cambios,
  };
}

beforeAll(async () => {
  e = await prepararEscenario('cuentasporpagarretiros');
  nuevoMovimiento = await prepararBancos(contexto());
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('retiros de efectivo', () => {
  it('guarda un retiro abierto sin liquidar', async () => {
    const retiro = await crearRetiro({ observaciones: 'Para el mercado' });

    expect(retiro).toMatchObject({
      estado: 'abierto',
      anioDeNumero: 0,
      devuelto: '0.00',
      faltante: '0.00',
      custodioUsuarioId: null,
      movimientoDeDevolucionId: null,
    });
  });

  it('el número es positivo y no se repite por empresa y año', async () => {
    const primero = await crearRetiro();

    expect(await restriccion(crearRetiro({ numero: 0 }))).toBe('retiros_numero_positivo');
    expect(await restriccion(crearRetiro({ numero: primero.numero }))).toBe('retiros_numero_unico');
    await expect(crearRetiro({ numero: primero.numero, anioDeNumero: 2026 })).resolves.toBeDefined();
  });

  it('la forma es cheque o nota de débito y el monto es positivo', async () => {
    await expect(crearRetiro({ forma: 'nota_de_debito' })).resolves.toBeDefined();

    expect(await restriccion(crearRetiro({ forma: 'efectivo' as never }))).toBe('retiros_forma_valida');
    expect(await restriccion(crearRetiro({ monto: '0' }))).toBe('retiros_monto_positivo');
  });

  it('el movimiento debe existir y es de un solo retiro', async () => {
    const movimientoId = await nuevoMovimiento();
    await crearRetiro({ movimientoId });

    expect(await restriccion(crearRetiro({ movimientoId: crypto.randomUUID() }))).toBe('retiros_movimiento_fk');
    expect(await restriccion(crearRetiro({ movimientoId }))).toBe('retiros_movimiento_unico');
  });

  it('el custodio va recortado y de 1 a 150 caracteres', async () => {
    for (const custodio of [' Juan ', '', 'x'.repeat(151)]) {
      expect(await restriccion(crearRetiro({ custodio }))).toBe('retiros_custodio_valido');
    }
    await expect(crearRetiro({ custodio: 'x'.repeat(150) })).resolves.toBeDefined();
  });

  it('la fecha de la anulación va si y solo si está anulado, y no es anterior a la del registro', async () => {
    const completa = { anuladoEn: new Date(), anuladoPor: e.usuarioId, motivoDeAnulacion: 'Error' };
    const anulado = (fechaDeAnulacion?: string) => ({ estado: 'anulado' as const, ...completa, fechaDeAnulacion });

    expect(await restriccion(crearRetiro(anulado()))).toBe('retiros_fecha_de_anulacion_de_su_estado');
    expect(await restriccion(crearRetiro({ fechaDeAnulacion: '2026-03-15' }))).toBe(
      'retiros_fecha_de_anulacion_de_su_estado',
    );
    expect(await restriccion(crearRetiro(anulado('2026-03-14')))).toBe('retiros_fecha_de_anulacion_valida');
    await expect(crearRetiro(anulado('2026-03-15'))).resolves.toBeDefined();
    await expect(crearRetiro(anulado('2026-05-01'))).resolves.toBeDefined();
  });

  it('las observaciones van recortadas y de 1 a 500 caracteres', async () => {
    for (const observaciones of [' con espacios ', '', 'x'.repeat(501)]) {
      expect(await restriccion(crearRetiro({ observaciones }))).toBe('retiros_observaciones_validas');
    }
  });

  it('el custodio usuario existe, y si el usuario se borra el nombre queda', async () => {
    const [otro] = await bd
      .insert(usuarios)
      .values({ usuario: 'custodioborrable', nombres: 'Custodio', hashContrasena: 'x' })
      .returning();
    const retiro = await crearRetiro({ custodioUsuarioId: otro!.id, custodio: 'Custodio Borrable' });

    expect(await restriccion(crearRetiro({ custodioUsuarioId: crypto.randomUUID() }))).toBe(
      'retiros_de_efectivo_custodio_usuario_id_usuarios_id_fk',
    );
    const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    await conexion.connect();
    await conexion.query('delete from core.usuarios where id = $1', [otro!.id]);
    await conexion.end();
    const [despues] = await enTransaccionSegura(contexto(), (tx) =>
      tx.select().from(retirosDeEfectivo).where(eq(retirosDeEfectivo.id, retiro.id)),
    );
    expect(despues).toMatchObject({ custodioUsuarioId: null, custodio: 'Custodio Borrable' });
  });

  it('el estado es uno de los tres y la anulación se escribe completa', async () => {
    const completa = { ...anulacion, anuladoPor: e.usuarioId, fechaDeAnulacion: '2026-03-15' };

    expect(await restriccion(crearRetiro({ estado: 'cerrado' as never }))).toBe('retiros_estado_valido');
    expect(await restriccion(crearRetiro({ estado: 'anulado' }))).toBe('retiros_anulacion_completa');
    expect(await restriccion(crearRetiro({ ...completa }))).toBe('retiros_anulacion_completa');
    expect(await restriccion(crearRetiro({ anuladoEn: new Date() }))).toBe('retiros_anulacion_completa');
    expect(await restriccion(crearRetiro({ estado: 'anulado', ...completa, motivoDeAnulacion: '' }))).toBe(
      'retiros_motivo_de_anulacion_rango',
    );
    await expect(crearRetiro({ estado: 'anulado', ...completa })).resolves.toBeDefined();
  });

  it('la liquidación se escribe completa y solo en un retiro liquidado', async () => {
    expect(await restriccion(crearRetiro({ estado: 'liquidado' }))).toBe('retiros_liquidacion_completa');
    expect(await restriccion(crearRetiro({ fechaDeLiquidacion: '2026-03-20' }))).toBe('retiros_liquidacion_completa');
    expect(await restriccion(crearRetiro(await liquidado({ liquidadoPor: null })))).toBe(
      'retiros_liquidacion_completa',
    );
    await expect(crearRetiro(await liquidado())).resolves.toBeDefined();
  });

  it('un retiro abierto no lleva devuelto, faltante ni depósito', async () => {
    const deposito = await nuevoMovimiento();

    expect(await restriccion(crearRetiro({ devuelto: '10', movimientoDeDevolucionId: deposito }))).toBe(
      'retiros_abierto_sin_liquidar',
    );
    expect(await restriccion(crearRetiro({ faltante: '10', motivoDeFaltante: 'Se perdió' }))).toBe(
      'retiros_abierto_sin_liquidar',
    );
  });

  it('lo devuelto y el faltante no son negativos ni pasan del monto', async () => {
    expect(await restriccion(crearRetiro(await liquidado({ devuelto: '-1' })))).toBe('retiros_devuelto_valido');
    expect(await restriccion(crearRetiro(await liquidado({ faltante: '-1' })))).toBe('retiros_faltante_valido');
    const deposito = await nuevoMovimiento();
    expect(
      await restriccion(
        crearRetiro(
          await liquidado({
            devuelto: '900',
            movimientoDeDevolucionId: deposito,
            faltante: '101',
            motivoDeFaltante: 'Se perdió',
          }),
        ),
      ),
    ).toBe('retiros_liquidacion_no_pasa_del_monto');
  });

  it('lo devuelto lleva su depósito, que existe y es de un solo retiro', async () => {
    const deposito = await nuevoMovimiento();
    const devolucion = { devuelto: '100', movimientoDeDevolucionId: deposito };

    expect(await restriccion(crearRetiro(await liquidado({ devuelto: '100' })))).toBe(
      'retiros_devolucion_con_deposito',
    );
    expect(await restriccion(crearRetiro(await liquidado({ movimientoDeDevolucionId: deposito })))).toBe(
      'retiros_devolucion_con_deposito',
    );
    expect(
      await restriccion(
        crearRetiro(await liquidado({ devuelto: '100', movimientoDeDevolucionId: crypto.randomUUID() })),
      ),
    ).toBe('retiros_devolucion_fk');
    await crearRetiro(await liquidado(devolucion));
    expect(await restriccion(crearRetiro(await liquidado(devolucion)))).toBe('retiros_devolucion_unica');
  });

  it('el faltante lleva su motivo, de 1 a 300 caracteres', async () => {
    expect(await restriccion(crearRetiro(await liquidado({ faltante: '50' })))).toBe('retiros_motivo_de_faltante');
    expect(await restriccion(crearRetiro(await liquidado({ motivoDeFaltante: 'Sobra' })))).toBe(
      'retiros_motivo_de_faltante',
    );
    expect(await restriccion(crearRetiro(await liquidado({ faltante: '50', motivoDeFaltante: '' })))).toBe(
      'retiros_motivo_de_faltante_rango',
    );
    expect(await restriccion(crearRetiro(await liquidado({ faltante: '50', motivoDeFaltante: 'x'.repeat(301) })))).toBe(
      'retiros_motivo_de_faltante_rango',
    );
    await expect(
      crearRetiro(await liquidado({ faltante: '50', motivoDeFaltante: 'Se perdió' })),
    ).resolves.toBeDefined();
  });

  it('cada empresa ve solo sus retiros', async () => {
    await crearRetiro();

    const enA2 = await enTransaccionSegura(contextoDe(e, e.empresaA2, e.cuentaA), (tx) =>
      tx.select().from(retirosDeEfectivo),
    );

    expect(enA2).toEqual([]);
  });
});
