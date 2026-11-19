/**
 * Prueba de integración contra PostgreSQL: los arqueos (conteo, cuadre de esperado y diferencia, motivo, anulación) y
 * los vales provisionales (checks, liquidación completa, número único, seguridad por fondo y empresa).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { arqueos } from './arqueos.tablas.js';
import { arqueoValido, crearArqueo, crearFondo, crearVale } from './datos-de-caja-chica.soporte.js';
import { contextoDe, contextoSinAlcance, prepararEscenario, restriccion, type Escenario } from './escenario.soporte.js';
import { valesProvisionales } from './vales-provisionales.tablas.js';

let e: Escenario;
let fondoId: string;

beforeAll(async () => {
  e = await prepararEscenario();
  fondoId = (await crearFondo(e)).id;
});

afterAll(async () => {
  await grupoConexiones.end();
});

type ValoresDeArqueo = Partial<typeof arqueos.$inferInsert>;
const arqueo = (cambios: ValoresDeArqueo = {}) => restriccion(crearArqueo(e, fondoId, cambios));

describe('arqueos', () => {
  it('guarda un arqueo sin diferencia, vigente, con su conteo', async () => {
    const fila = await crearArqueo(e, fondoId);

    expect(fila).toMatchObject({ estado: 'vigente', valoresPorCambiar: '0.00', diferencia: '0.00' });
    expect(fila.conteo).toEqual([{ denominacionCentavos: 10000, cantidad: 1 }]);
  });

  it('el número es positivo y no se repite por empresa y año', async () => {
    const primero = await crearArqueo(e, fondoId);

    expect(await arqueo({ numero: 0 })).toBe('arqueos_numero_positivo');
    expect(await arqueo({ numero: primero.numero })).toBe('arqueos_numero_unico');
    await expect(crearArqueo(e, fondoId, { numero: primero.numero, anioDeNumero: 2026 })).resolves.toBeDefined();
  });

  it('el conteo es un arreglo, el custodio va recortado y los montos no son negativos', async () => {
    expect(await arqueo({ conteo: { cien: 1 } as never })).toBe('arqueos_conteo_es_arreglo');
    expect(await arqueo({ custodio: ' Juan ' })).toBe('arqueos_custodio_valido');
    expect(await arqueo({ efectivoContado: '-1', diferencia: '-101' })).toBe('arqueos_montos_validos');
    expect(await arqueo({ valoresPorCambiar: '-1', diferencia: '-1' })).toBe('arqueos_montos_validos');
    expect(await arqueo({ montoDelFondo: '-1', efectivoEsperado: '-1', diferencia: '101' })).toBe(
      'arqueos_fondo_y_vales_validos',
    );
  });

  it('lo esperado y la diferencia cuadran con lo que decía el sistema', async () => {
    const pendiente = { montoDelFondo: '1000', pendienteDeReponer: '300', valesAbiertos: '100' };

    await expect(
      crearArqueo(e, fondoId, { ...pendiente, efectivoEsperado: '600', efectivoContado: '600' }),
    ).resolves.toBeDefined();
    expect(await arqueo({ ...pendiente, efectivoEsperado: '700', efectivoContado: '700' })).toBe(
      'arqueos_efectivo_esperado_cuadra',
    );
    expect(await arqueo({ efectivoContado: '90' })).toBe('arqueos_diferencia_cuadra');
  });

  it('con diferencia pide su motivo, y sin ella no lo lleva; los valores por cambiar la compensan', async () => {
    const faltante = { efectivoContado: '90', diferencia: '-10' };

    expect(await arqueo(faltante)).toBe('arqueos_motivo_de_diferencia');
    await expect(
      crearArqueo(e, fondoId, { ...faltante, motivoDeDiferencia: 'Se perdió un billete' }),
    ).resolves.toBeDefined();
    expect(await arqueo({ motivoDeDiferencia: 'Sin diferencia' })).toBe('arqueos_motivo_de_diferencia');
    await expect(crearArqueo(e, fondoId, { efectivoContado: '60', valoresPorCambiar: '40' })).resolves.toMatchObject({
      diferencia: '0.00',
    });
    expect(await arqueo({ ...faltante, motivoDeDiferencia: '' })).toBe('arqueos_motivo_de_diferencia_rango');
  });

  it('las observaciones van recortadas y de 1 a 500 caracteres', async () => {
    for (const observaciones of [' con espacios ', '', 'x'.repeat(501)]) {
      expect(await arqueo({ observaciones })).toBe('arqueos_observaciones_validas');
    }
  });

  it('el fondo es de la misma empresa y quien arquea es un usuario', async () => {
    expect(await arqueo({ arqueadoPor: crypto.randomUUID() })).toBe('arqueos_arqueado_por_usuarios_id_fk');
    const intento = enTransaccionSegura(contextoDe(e, e.empresaA2), (tx) =>
      tx.insert(arqueos).values({ ...arqueoValido(e, fondoId), empresaId: e.empresaA2 }),
    );
    expect(await restriccion(intento)).toBe('arqueos_fondo_fk');
  });

  it('la anulación se escribe completa y la fecha contable va si y solo si está anulado', async () => {
    const completa = { anuladoEn: new Date(), anuladoPor: e.usuarioId, motivoDeAnulacion: 'Error' };

    expect(await arqueo({ estado: 'anulado' })).toBe('arqueos_anulacion_completa');
    expect(await arqueo({ estado: 'otro' as never })).toBe('arqueos_estado_valido');
    expect(await arqueo({ estado: 'anulado', ...completa })).toBe('arqueos_fecha_de_anulacion_de_su_estado');
    await expect(
      crearArqueo(e, fondoId, { estado: 'anulado', ...completa, fechaDeAnulacion: '2026-03-16' }),
    ).resolves.toBeDefined();
  });

  it('un fondo no asignado no deja ver sus arqueos', async () => {
    const vistos = await enTransaccionSegura(contextoSinAlcance(e, e.otroId), (tx) => tx.select().from(arqueos));

    expect(vistos).toHaveLength(0);
  });
});

type ValoresDeVale = Partial<typeof valesProvisionales.$inferInsert>;
const vale = (cambios: ValoresDeVale = {}) => restriccion(crearVale(e, fondoId, cambios));

describe('vales provisionales', () => {
  const liquidado = (cambios: ValoresDeVale = {}): ValoresDeVale => ({
    estado: 'liquidado',
    fechaDeLiquidacion: '2026-03-12',
    liquidadoEn: new Date(),
    liquidadoPor: e.usuarioId,
    ...cambios,
  });

  it('guarda un vale abierto, sin devuelto', async () => {
    await expect(crearVale(e, fondoId)).resolves.toMatchObject({ estado: 'abierto', devuelto: '0.00' });
  });

  it('el número es positivo y no se repite por empresa y año', async () => {
    const primero = await crearVale(e, fondoId);

    expect(await vale({ numero: 0 })).toBe('vales_numero_positivo');
    expect(await vale({ numero: primero.numero })).toBe('vales_numero_unico');
    await expect(crearVale(e, fondoId, { numero: primero.numero, anioDeNumero: 2026 })).resolves.toBeDefined();
  });

  it('el monto es positivo y los textos van recortados', async () => {
    expect(await vale({ monto: '0' })).toBe('vales_monto_positivo');
    expect(await vale({ entregadoA: ' Pedro ' })).toBe('vales_entregado_a_valido');
    expect(await vale({ motivo: '' })).toBe('vales_motivo_valido');
    expect(await vale({ motivo: 'x'.repeat(301) })).toBe('vales_motivo_valido');
  });

  it('la liquidación se escribe completa y solo en un vale liquidado', async () => {
    await expect(crearVale(e, fondoId, liquidado())).resolves.toBeDefined();

    expect(await vale({ estado: 'liquidado' })).toBe('vales_liquidacion_completa');
    expect(await vale({ fechaDeLiquidacion: '2026-03-12' })).toBe('vales_liquidacion_completa');
    expect(await vale(liquidado({ liquidadoPor: null }))).toBe('vales_liquidacion_completa');
    expect(await vale(liquidado({ fechaDeLiquidacion: '2026-03-01' }))).toBe('vales_liquidacion_posterior');
  });

  it('lo devuelto no es negativo ni pasa del monto, y un vale abierto no lleva devuelto', async () => {
    await expect(crearVale(e, fondoId, liquidado({ devuelto: '50' }))).resolves.toBeDefined();

    expect(await vale(liquidado({ devuelto: '-1' }))).toBe('vales_devuelto_valido');
    expect(await vale(liquidado({ devuelto: '51' }))).toBe('vales_devuelto_valido');
    expect(await vale({ devuelto: '10' })).toBe('vales_abierto_sin_devuelto');
  });

  it('el estado es abierto, liquidado o anulado y la anulación se escribe completa', async () => {
    const completa = { anuladoEn: new Date(), anuladoPor: e.usuarioId, motivoDeAnulacion: 'Error' };

    expect(await vale({ estado: 'otro' as never })).toBe('vales_estado_valido');
    expect(await vale({ estado: 'anulado' })).toBe('vales_anulacion_completa');
    expect(await vale({ estado: 'anulado', ...completa })).toBe('vales_fecha_de_anulacion_de_su_estado');
    expect(await vale({ estado: 'anulado', ...completa, fechaDeAnulacion: '2026-03-09' })).toBe(
      'vales_fecha_de_anulacion_valida',
    );
    await expect(
      crearVale(e, fondoId, { estado: 'anulado', ...completa, fechaDeAnulacion: '2026-03-10' }),
    ).resolves.toBeDefined();
  });

  it('el fondo es de la misma empresa y un fondo no asignado no deja ver sus vales', async () => {
    const intento = enTransaccionSegura(contextoDe(e, e.empresaA2), (tx) =>
      tx.insert(valesProvisionales).values({
        empresaId: e.empresaA2,
        fondoId,
        numero: 999,
        fecha: '2026-03-10',
        entregadoA: 'Pedro',
        monto: '10',
        motivo: 'Compra',
      }),
    );
    expect(await restriccion(intento)).toBe('vales_provisionales_fondo_fk');

    const vistos = await enTransaccionSegura(contextoSinAlcance(e, e.otroId), (tx) =>
      tx.select().from(valesProvisionales),
    );
    expect(vistos).toHaveLength(0);
  });
});
