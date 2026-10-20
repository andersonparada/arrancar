/** Prueba de integración contra PostgreSQL: checks, llaves y seguridad por empresa de la bandeja `dte_recibidos`. */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { documentos } from './documentos.tablas.js';
import {
  contextoDe,
  documentoValido,
  errorDePostgres,
  insertarDocumento,
  prepararEscenario,
  type Escenario,
} from './documentos.soporte.js';
import { dteValido, insertarDte, insertarLote, type DteNuevo } from './dte-recibidos.soporte.js';
import { dteRecibidos } from './dte-recibidos.tablas.js';

let e: Escenario;
let loteA1: string;

const enA1 = () => contextoDe(e, e.empresaA1, e.cuentaA);
const enA2 = () => contextoDe(e, e.empresaA2, e.cuentaA);
const insertar = (cambios: Partial<DteNuevo>) =>
  enTransaccionSegura(enA1(), (tx) => tx.insert(dteRecibidos).values(dteValido(e.empresaA1, loteA1, cambios)));
const restriccionDe = async (cambios: Partial<DteNuevo>) => (await errorDePostgres(insertar(cambios)))?.constraint;

beforeAll(async () => {
  e = await prepararEscenario('dterecibidos');
  loteA1 = await insertarLote(enA1());
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('dte_recibidos: datos del DTE', () => {
  it('guarda una fila válida pendiente, con la cuenta de la transacción y sin borrador', async () => {
    const id = await insertarDte(enA1());

    const [fila] = await enTransaccionSegura(enA1(), (tx) =>
      tx.select().from(dteRecibidos).where(eq(dteRecibidos.id, id)),
    );

    expect(fila).toMatchObject({ estado: 'pendiente', cuentaId: e.cuentaA, idp: '0.00', noVinculado: false });
    expect(fila!.creadoPor).toBe(e.usuarioId);
  });

  const casos: [string, Partial<DteNuevo>, string][] = [
    ['tipo de DTE desconocido', { tipoDte: 'XXXX' as never }, 'dte_recibidos_tipo_dte_valido'],
    ['serie en minúsculas', { serie: 'a' }, 'dte_recibidos_serie_valida'],
    ['serie con espacios', { serie: 'A B' }, 'dte_recibidos_serie_valida'],
    ['número vacío', { numero: ' ' }, 'dte_recibidos_numero_valido'],
    ['NIT del emisor con guion', { nitEmisor: '123-4' }, 'dte_recibidos_nit_emisor_valido'],
    ['NIT del receptor con letras', { nitReceptor: 'ABC' }, 'dte_recibidos_nit_receptor_valido'],
    ['nombre vacío', { nombreEmisor: '' }, 'dte_recibidos_nombre_emisor_largo'],
    ['total cero', { total: '0', iva: '0' }, 'dte_recibidos_total_positivo'],
    ['IVA negativo', { iva: '-1' }, 'dte_recibidos_iva_no_negativo'],
    ['IDP negativo', { idp: '-1' }, 'dte_recibidos_idp_no_negativo'],
    ['otros impuestos negativos', { otrosImpuestos: '-1' }, 'dte_recibidos_otros_impuestos_no_negativo'],
    ['impuestos que pasan del total', { idp: '101' }, 'dte_recibidos_otros_impuestos_cuadran'],
    ['fila original de más de 16 KB', { filaOriginal: { a: 'x'.repeat(20000) } }, 'dte_recibidos_fila_original_chica'],
    ['estado en la SAT desconocido', { estadoSat: 'otro' as never }, 'dte_recibidos_estado_sat_valido'],
    ['anulado sin fecha', { estadoSat: 'anulado' }, 'dte_recibidos_anulado_con_fecha'],
    ['vigente con fecha de anulación', { anuladoEnLaSatEl: '2026-03-12' }, 'dte_recibidos_anulado_con_fecha'],
  ];

  it.each(casos)('rechaza: %s', async (_nombre, cambios, restriccion) => {
    expect(await restriccionDe(cambios)).toBe(restriccion);
  });

  it('acepta una anulada con su fecha, y el IDP y otros impuestos que no pasan del total', async () => {
    await expect(insertar({ estadoSat: 'anulado', anuladoEnLaSatEl: '2026-03-12' })).resolves.toBeTruthy();
    await expect(insertar({ total: '200', idp: '50', otrosImpuestos: '38' })).resolves.toBeTruthy();
  });
});

describe('dte_recibidos: estado y borrador', () => {
  const ahora = new Date('2026-03-11T10:00:00Z');
  const descartada: Partial<DteNuevo> = {
    estado: 'descartado',
    motivoDeDescarte: 'No es nuestra',
    descartadoEn: ahora,
    descartadoPor: null,
  };

  const casos: [string, Partial<DteNuevo>, string][] = [
    ['estado desconocido', { estado: 'otro' as never }, 'dte_recibidos_estado_valido'],
    ['registrada sin documento', { estado: 'registrado' }, 'dte_recibidos_registrado_con_documento'],
    ['descartada sin motivo ni fecha', { estado: 'descartado' }, 'dte_recibidos_descarte_completo'],
    ['descartada sin quién', { ...descartada }, 'dte_recibidos_descarte_completo'],
    [
      'motivo de descarte de más de 300',
      { ...descartada, motivoDeDescarte: 'x'.repeat(301), descartadoPor: crypto.randomUUID() },
      'dte_recibidos_motivo_de_descarte_largo',
    ],
    ['bloqueada sin motivo', { estado: 'bloqueado' }, 'dte_recibidos_bloqueo_con_motivo'],
    [
      'pendiente con motivo de bloqueo',
      { motivoDeBloqueo: 'registrado_en_otra_empresa' },
      'dte_recibidos_bloqueo_con_motivo',
    ],
    [
      'motivo de bloqueo desconocido',
      { estado: 'bloqueado', motivoDeBloqueo: 'recibo_a_la_empresa' as never },
      'dte_recibidos_motivo_de_bloqueo_valido',
    ],
    ['destino desconocido', { destino: 'otro' as never }, 'dte_recibidos_destino_valido'],
    ['recepción antes de la emisión', { fechaRecepcion: '2026-03-09' }, 'dte_recibidos_fechas_ordenadas'],
    ['período que no es primer día', { periodo: '2026-03-15' }, 'dte_recibidos_periodo_valido'],
    ['período anterior a la emisión', { periodo: '2026-02-01' }, 'dte_recibidos_periodo_valido'],
    ['factura afectada en una factura', { documentoAfectadoId: crypto.randomUUID() }, 'dte_recibidos_nota_con_factura'],
  ];

  it.each(casos)('rechaza: %s', async (_nombre, cambios, restriccion) => {
    const fallo = await errorDePostgres(insertar(cambios));

    expect(fallo?.constraint).toBe(restriccion);
  });

  it('acepta una bloqueada con su motivo y un borrador completo', async () => {
    await expect(
      insertar({ estado: 'bloqueado', motivoDeBloqueo: 'registrado_en_otra_empresa' }),
    ).resolves.toBeTruthy();
    await expect(
      insertar({
        proveedorId: e.proveedorA,
        conceptoId: e.conceptoA1,
        destino: 'caja-chica',
        fechaRecepcion: '2026-03-12',
        periodo: '2026-03-01',
        noVinculado: true,
      }),
    ).resolves.toBeTruthy();
  });

  it('acepta una descartada con quién y cuándo', async () => {
    const valores = { ...descartada, descartadoPor: e.usuarioId };

    await expect(insertar(valores as Partial<DteNuevo>)).resolves.toBeTruthy();
  });
});

describe('dte_recibidos: llaves', () => {
  it('la autorización es única por empresa, pero otra empresa puede tener la misma', async () => {
    const autorizacionFel = crypto.randomUUID();
    await insertarDte(enA1(), { autorizacionFel });

    expect((await errorDePostgres(insertar({ autorizacionFel })))?.constraint).toBe('dte_recibidos_autorizacion_unica');
    await expect(insertarDte(enA2(), { autorizacionFel })).resolves.toBeTruthy();
  });

  it('un lote de otra empresa no sirve de lote de la fila', async () => {
    const loteDeA2 = await insertarLote(enA2());

    const fallo = await errorDePostgres(
      enTransaccionSegura(enA1(), (tx) => tx.insert(dteRecibidos).values(dteValido(e.empresaA1, loteDeA2))),
    );

    expect(fallo?.constraint).toBe('dte_recibidos_lote_fk');
  });

  it('el proveedor de otra cuenta no sirve; el de otra empresa de la misma cuenta sí (es de la cuenta)', async () => {
    expect((await errorDePostgres(insertar({ proveedorId: e.proveedorB })))?.constraint).toBe(
      'dte_recibidos_proveedor_fk',
    );
    await expect(insertar({ proveedorId: e.proveedorA2 })).resolves.toBeTruthy();
  });

  it('el concepto de otra empresa no sirve', async () => {
    expect((await errorDePostgres(insertar({ conceptoId: e.conceptoA2 })))?.constraint).toBe(
      'dte_recibidos_concepto_fk',
    );
  });
});

describe('dte_recibidos: enlace con documentos', () => {
  const documentoEn = (contexto: ReturnType<typeof enA1>) =>
    insertarDocumento(documentoValido(e, { empresaId: contexto.empresaId }), contexto);

  it('un documento enlaza una sola fila y no se elimina mientras siga enlazado', async () => {
    const documentoId = await documentoEn(enA1());
    const dteId = await insertarDte(enA1(), { estado: 'registrado', documentoId });

    expect((await errorDePostgres(insertar({ estado: 'registrado', documentoId })))?.constraint).toBe(
      'dte_recibidos_documento_unico',
    );
    const borrado = errorDePostgres(
      enTransaccionSegura(enA1(), (tx) => tx.delete(documentos).where(eq(documentos.id, documentoId))),
    );
    expect((await borrado)?.constraint).toBe('dte_recibidos_documento_fk');

    await enTransaccionSegura(enA1(), async (tx) => {
      await tx.update(dteRecibidos).set({ estado: 'pendiente', documentoId: null }).where(eq(dteRecibidos.id, dteId));
      await tx.delete(documentos).where(eq(documentos.id, documentoId));
    });
  });

  it('el documento de otra empresa no se puede enlazar', async () => {
    const documentoDeA2 = await documentoEn(enA2());

    const fallo = await errorDePostgres(insertar({ estado: 'registrado', documentoId: documentoDeA2 }));

    expect(fallo?.constraint).toBe('dte_recibidos_documento_fk');
  });
});

describe('dte_recibidos: seguridad por empresa', () => {
  it('otra empresa, de la misma cuenta o no, no ve las filas', async () => {
    const id = await insertarDte(enA1());
    const vistoPor = (contexto: ReturnType<typeof enA1>) =>
      enTransaccionSegura(contexto, (tx) => tx.select({ id: dteRecibidos.id }).from(dteRecibidos));

    expect((await vistoPor(enA1())).map((fila) => fila.id)).toContain(id);
    expect((await vistoPor(enA2())).map((fila) => fila.id)).not.toContain(id);
    expect(await vistoPor(contextoDe(e, e.empresaB, e.cuentaB))).toEqual([]);
  });

  it('no se puede escribir, cambiar ni borrar una fila de otra empresa', async () => {
    const id = await insertarDte(enA1());
    const loteDeA2 = await insertarLote(enA2());

    const intruso = await errorDePostgres(
      enTransaccionSegura(enA2(), (tx) => tx.insert(dteRecibidos).values(dteValido(e.empresaA1, loteDeA2))),
    );
    const cambiadas = await enTransaccionSegura(enA2(), (tx) =>
      tx.update(dteRecibidos).set({ noVinculado: true }).where(eq(dteRecibidos.id, id)).returning(),
    );
    const borradas = await enTransaccionSegura(enA2(), (tx) =>
      tx.delete(dteRecibidos).where(eq(dteRecibidos.id, id)).returning(),
    );

    expect(intruso?.code).toBe('42501');
    expect([cambiadas, borradas]).toEqual([[], []]);
  });
});
