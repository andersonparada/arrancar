/**
 * Prueba de integración contra PostgreSQL: las reposiciones y sus comprobantes (checks, movimiento de Bancos, único
 * vigente por comprobante y llaves compuestas: la reposición y el comprobante son del mismo fondo).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import {
  crearComprobante,
  crearFondo,
  crearReposicion,
  ligarComprobante,
  valeDeGastoValido,
} from './datos-de-caja-chica.soporte.js';
import {
  comoPropietario,
  contextoDe,
  contextoSinAlcance,
  crearMovimiento,
  prepararEscenario,
  restriccion,
  type Escenario,
} from './escenario.soporte.js';
import { reposicionComprobantes } from './reposicion-comprobantes.tablas.js';
import { reposiciones } from './reposiciones.tablas.js';

let e: Escenario;
let fondoId: string;

beforeAll(async () => {
  e = await prepararEscenario();
  fondoId = (await crearFondo(e)).id;
});

afterAll(async () => {
  await grupoConexiones.end();
});

type Valores = Partial<typeof reposiciones.$inferInsert>;
const reponer = async (cambios: Valores = {}, fondo = fondoId) =>
  crearReposicion(e, fondo, {
    movimientoId: cambios.forma === 'compensada_al_cerrar' ? null : await crearMovimiento(e),
    ...cambios,
  });

describe('reposiciones', () => {
  it('guarda una reposición vigente con su cheque de Bancos', async () => {
    const fila = await reponer();

    expect(fila).toMatchObject({ estado: 'vigente', laHizoElCustodio: false, anioDeNumero: 0, forma: 'cheque' });
  });

  it('el número es positivo y no se repite por empresa y año', async () => {
    const primera = await reponer();

    await expect(restriccion(reponer({ numero: 0 }))).resolves.toBe('reposiciones_numero_positivo');
    await expect(restriccion(reponer({ numero: primera.numero }))).resolves.toBe('reposiciones_numero_unico');
    await expect(reponer({ numero: primera.numero, anioDeNumero: 2026 })).resolves.toBeDefined();
  });

  it('la forma es cheque, nota de débito o compensada, y el monto es positivo', async () => {
    await expect(reponer({ forma: 'nota_de_debito' })).resolves.toBeDefined();

    await expect(restriccion(reponer({ forma: 'efectivo' as never }))).resolves.toBe('reposiciones_forma_valida');
    await expect(restriccion(reponer({ monto: '0' }))).resolves.toBe('reposiciones_monto_positivo');
  });

  it('la compensada al cerrar no lleva movimiento y las demás sí, único por reposición', async () => {
    await expect(reponer({ forma: 'compensada_al_cerrar' })).resolves.toMatchObject({ movimientoId: null });

    await expect(restriccion(crearReposicion(e, fondoId, { movimientoId: null, forma: 'cheque' }))).resolves.toBe(
      'reposiciones_movimiento_de_su_forma',
    );
    const movimientoId = await crearMovimiento(e);
    await expect(
      restriccion(crearReposicion(e, fondoId, { movimientoId, forma: 'compensada_al_cerrar' })),
    ).resolves.toBe('reposiciones_movimiento_de_su_forma');
    await crearReposicion(e, fondoId, { movimientoId });
    await expect(restriccion(crearReposicion(e, fondoId, { movimientoId }))).resolves.toBe(
      'reposiciones_movimiento_unico',
    );
    await expect(restriccion(crearReposicion(e, fondoId, { movimientoId: crypto.randomUUID() }))).resolves.toBe(
      'reposiciones_movimiento_id_movimientos_id_fk',
    );
  });

  it('el custodio va recortado y de 1 a 150 caracteres', async () => {
    for (const custodio of [' Juan ', '', 'x'.repeat(151)]) {
      await expect(restriccion(reponer({ custodio }))).resolves.toBe('reposiciones_custodio_valido');
    }
  });

  it('el fondo es de la misma empresa', async () => {
    const movimientoId = await crearMovimiento(e);
    const intento = enTransaccionSegura(contextoDe(e, e.empresaA2), (tx) =>
      tx.insert(reposiciones).values({
        empresaId: e.empresaA2,
        fondoId,
        numero: 99,
        fecha: '2026-03-20',
        forma: 'cheque',
        monto: '10',
        movimientoId,
        custodio: 'Juan',
      }),
    );

    await expect(restriccion(intento)).resolves.toBe('reposiciones_fondo_fk');
  });

  it('la anulación se escribe completa (estado anulada) y su fecha no es anterior a la de la reposición', async () => {
    const completa = { anuladoEn: new Date(), anuladoPor: e.usuarioId, motivoDeAnulacion: 'Error' };

    await expect(restriccion(reponer({ estado: 'anulada' }))).resolves.toBe('reposiciones_anulacion_completa');
    await expect(restriccion(reponer({ estado: 'anulado' as never }))).resolves.toBe('reposiciones_estado_valido');
    await expect(restriccion(reponer({ estado: 'anulada', ...completa }))).resolves.toBe(
      'reposiciones_fecha_de_anulacion_de_su_estado',
    );
    await expect(
      restriccion(reponer({ estado: 'anulada', ...completa, fechaDeAnulacion: '2026-03-19' })),
    ).resolves.toBe('reposiciones_fecha_de_anulacion_valida');
    await expect(reponer({ estado: 'anulada', ...completa, fechaDeAnulacion: '2026-03-21' })).resolves.toBeDefined();
  });
});

describe('comprobantes de una reposición', () => {
  const comprobanteEn = async (fondo: string) => (await crearComprobante(e, valeDeGastoValido(e, fondo))).id;
  const linea = (reposicionId: string, comprobanteId: string, cambios: { fondoId?: string; monto?: string } = {}) => ({
    reposicionId,
    comprobanteId,
    empresaId: e.empresaA1,
    fondoId,
    monto: '25',
    ...cambios,
  });

  it('une una reposición con comprobantes de su mismo fondo', async () => {
    const reposicion = await reponer();
    const comprobanteId = await comprobanteEn(fondoId);

    await expect(ligarComprobante(e, linea(reposicion.id, comprobanteId))).resolves.toBeUndefined();
  });

  it('no mezcla fondos: ni el comprobante ni la reposición pueden ser de otro fondo', async () => {
    const otroFondo = (await crearFondo(e)).id;
    const reposicion = await reponer();
    const deOtro = await comprobanteEn(otroFondo);

    await expect(restriccion(ligarComprobante(e, linea(reposicion.id, deOtro)))).resolves.toBe(
      'reposicion_comprobantes_comprobante_fk',
    );
    await expect(restriccion(ligarComprobante(e, linea(reposicion.id, deOtro, { fondoId: otroFondo })))).resolves.toBe(
      'reposicion_comprobantes_reposicion_fk',
    );
    const propio = await comprobanteEn(fondoId);
    const sinLlave = await restriccion(ligarComprobante(e, linea(reposicion.id, propio, { fondoId: otroFondo })));
    expect(sinLlave).toMatch(/^reposicion_comprobantes_(reposicion|comprobante)_fk$/);
  });

  it('un comprobante está en una sola reposición vigente; al anular la línea puede reponerse de nuevo', async () => {
    const primera = await reponer();
    const segunda = await reponer();
    const comprobanteId = await comprobanteEn(fondoId);
    await ligarComprobante(e, linea(primera.id, comprobanteId));

    await expect(restriccion(ligarComprobante(e, linea(segunda.id, comprobanteId)))).resolves.toBe(
      'reposicion_comprobantes_vigente_unico',
    );
    await comoPropietario('update caja_chica.reposicion_comprobantes set vigente = false where comprobante_id = $1', [
      comprobanteId,
    ]);
    await expect(ligarComprobante(e, linea(segunda.id, comprobanteId))).resolves.toBeUndefined();
  });

  it('el mismo comprobante no se repite en una reposición, y el monto firmado no es cero', async () => {
    const reposicion = await reponer();
    const comprobanteId = await comprobanteEn(fondoId);
    await ligarComprobante(e, linea(reposicion.id, comprobanteId));

    await expect(restriccion(ligarComprobante(e, linea(reposicion.id, comprobanteId)))).resolves.toBe(
      'reposicion_comprobantes_reposicion_id_comprobante_id_pk',
    );
    const otro = await comprobanteEn(fondoId);
    await expect(restriccion(ligarComprobante(e, linea(reposicion.id, otro, { monto: '0' })))).resolves.toBe(
      'reposicion_comprobantes_monto_no_cero',
    );
    await expect(ligarComprobante(e, linea(reposicion.id, otro, { monto: '-10' }))).resolves.toBeUndefined();
  });

  it('un fondo no asignado no deja ver sus reposiciones ni sus líneas', async () => {
    const vistas = await enTransaccionSegura(contextoSinAlcance(e, e.otroId), async (tx) => [
      ...(await tx.select().from(reposiciones)),
      ...(await tx.select().from(reposicionComprobantes)),
    ]);

    expect(vistas).toHaveLength(0);
    const otraEmpresa = await enTransaccionSegura(contextoDe(e, e.empresaA2), (tx) => tx.select().from(reposiciones));
    expect(otraEmpresa).toHaveLength(0);
  });
});
