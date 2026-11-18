/**
 * Prueba de integración contra PostgreSQL: marcas del tope y de la bancarización de los comprobantes, faltantes y
 * sobrantes de un arqueo, vale provisional del que salieron, anulación y seguridad (bandeja visible sin fondo, fondo
 * asignado, otra empresa).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { comprobantes } from './comprobantes.tablas.js';
import {
  crearArqueo,
  crearComprobante,
  crearFondo,
  crearVale,
  valeDeGastoValido,
  valorDeDocumento,
} from './datos-de-caja-chica.soporte.js';
import {
  comoPropietario,
  contextoDe,
  contextoSinAlcance,
  prepararEscenario,
  restriccion,
  type Escenario,
} from './escenario.soporte.js';

let e: Escenario;
let fondoId: string;

beforeAll(async () => {
  e = await prepararEscenario();
  fondoId = (await crearFondo(e)).id;
});

afterAll(async () => {
  await grupoConexiones.end();
});

type Valores = Partial<typeof comprobantes.$inferInsert>;
const documento = async (cambios: Valores = {}) => crearComprobante(e, await valorDeDocumento(e, fondoId, cambios));
const vale = (cambios: Valores = {}) => crearComprobante(e, valeDeGastoValido(e, fondoId, cambios));
const hacerQue = async (valores: Promise<typeof comprobantes.$inferInsert> | typeof comprobantes.$inferInsert) =>
  restriccion(crearComprobante(e, await valores));

describe('comprobantes: marcas del tope y de la bancarización', () => {
  it('pasarse del tope lleva su motivo y solo entonces', async () => {
    await expect(vale({ sobreElTope: true, motivoSobreElTope: 'Compra urgente' })).resolves.toBeDefined();

    expect(await hacerQue(valeDeGastoValido(e, fondoId, { sobreElTope: true }))).toBe('comprobantes_tope_con_motivo');
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { motivoSobreElTope: 'Sin marca' }))).toBe(
      'comprobantes_tope_con_motivo',
    );
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { sobreElTope: true, motivoSobreElTope: '' }))).toBe(
      'comprobantes_motivo_sobre_el_tope_rango',
    );
  });

  it('la marca de no bancarizar no exige motivo (CC-h = A)', async () => {
    await expect(documento({ sinBancarizar: true })).resolves.toMatchObject({ sinBancarizar: true });
  });
});

describe('comprobantes: faltantes y sobrantes de un arqueo', () => {
  const deArqueo = (arqueoId: string | null, cambios: Valores = {}) =>
    valeDeGastoValido(e, fondoId, {
      clase: 'faltante',
      arqueoId,
      destinoDelFaltante: 'perdida',
      numero: null,
      pagadoA: null,
      conceptoDeGastoId: null,
      motivoSinDocumento: null,
      descripcion: 'Faltante de arqueo',
      ...cambios,
    });

  it('un faltante lleva su arqueo y su destino; un sobrante, su arqueo y resta', async () => {
    const arqueo = await crearArqueo(e, fondoId);

    await expect(crearComprobante(e, deArqueo(arqueo.id))).resolves.toBeDefined();
    await expect(
      crearComprobante(e, deArqueo(arqueo.id, { clase: 'sobrante', resta: true, destinoDelFaltante: null })),
    ).resolves.toBeDefined();
    expect(await hacerQue(deArqueo(null))).toBe('comprobantes_arqueo_de_su_clase');
    expect(await hacerQue(deArqueo(arqueo.id, { destinoDelFaltante: null }))).toBe('comprobantes_destino_del_faltante');
    expect(await hacerQue(deArqueo(arqueo.id, { destinoDelFaltante: 'regalo' as never }))).toBe(
      'comprobantes_destino_del_faltante',
    );
    expect(await hacerQue(deArqueo(arqueo.id, { clase: 'sobrante', resta: true }))).toBe(
      'comprobantes_destino_del_faltante',
    );
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { arqueoId: arqueo.id }))).toBe(
      'comprobantes_arqueo_de_su_clase',
    );
  });

  it('el arqueo es del mismo fondo (llave compuesta)', async () => {
    const arqueoDeOtro = await crearArqueo(e, (await crearFondo(e)).id);

    expect(await hacerQue(deArqueo(arqueoDeOtro.id))).toBe('comprobantes_arqueo_fk');
  });
});

describe('comprobantes: vale provisional del que salieron', () => {
  it('el vale provisional es del mismo fondo y solo lo llevan documentos y vales de gasto', async () => {
    const provisional = await crearVale(e, fondoId);
    await expect(vale({ valeProvisionalId: provisional.id })).resolves.toBeDefined();
    await expect(documento({ valeProvisionalId: provisional.id })).resolves.toBeDefined();

    const deOtroFondo = await crearVale(e, (await crearFondo(e)).id);
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { valeProvisionalId: deOtroFondo.id }))).toBe(
      'comprobantes_vale_provisional_fk',
    );
    expect(await hacerQue(valorDeDocumento(e, null, { valeProvisionalId: provisional.id }))).toBe(
      'comprobantes_vale_provisional_valido',
    );
  });
});

describe('comprobantes: estado y anulación', () => {
  const completa = () => ({ anuladoEn: new Date(), anuladoPor: e.usuarioId, motivoDeAnulacion: 'Error' });

  it('el estado es vigente o anulado y la anulación se escribe completa', async () => {
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { estado: 'repuesto' as never }))).toBe(
      'comprobantes_estado_valido',
    );
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { estado: 'anulado' }))).toBe(
      'comprobantes_anulacion_completa',
    );
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { anuladoEn: new Date() }))).toBe(
      'comprobantes_anulacion_completa',
    );
    const sinMotivo = {
      estado: 'anulado' as const,
      ...completa(),
      motivoDeAnulacion: '',
      fechaDeAnulacion: '2026-03-15',
    };
    expect(await hacerQue(valeDeGastoValido(e, fondoId, sinMotivo))).toBe('comprobantes_motivo_de_anulacion_rango');
  });

  it('la fecha contable de la anulación va si y solo si está anulado y no es anterior a la del gasto', async () => {
    const anulado = (fechaDeAnulacion?: string) =>
      valeDeGastoValido(e, fondoId, { estado: 'anulado', ...completa(), fechaDeAnulacion });

    expect(await hacerQue(anulado())).toBe('comprobantes_fecha_de_anulacion_de_su_estado');
    expect(await hacerQue(valeDeGastoValido(e, fondoId, { fechaDeAnulacion: '2026-03-15' }))).toBe(
      'comprobantes_fecha_de_anulacion_de_su_estado',
    );
    expect(await hacerQue(anulado('2026-03-09'))).toBe('comprobantes_fecha_de_anulacion_valida');
    await expect(crearComprobante(e, anulado('2026-03-10'))).resolves.toBeDefined();
  });
});

describe('comprobantes: seguridad', () => {
  const nombres = async (usuarioId: string, todos: boolean, empresaId = e.empresaA1) =>
    (
      await enTransaccionSegura(
        todos ? contextoDe(e, empresaId, usuarioId) : contextoSinAlcance(e, usuarioId, empresaId),
        (tx) => tx.select({ descripcion: comprobantes.descripcion, fondoId: comprobantes.fondoId }).from(comprobantes),
      )
    ).filter((fila) => fila.descripcion === 'Visible en la prueba');

  it('la bandeja (sin fondo) la ve quien no tiene el fondo asignado; lo que está en un fondo, no', async () => {
    const propio = (await crearFondo(e)).id;
    await crearComprobante(e, valeDeGastoValido(e, propio, { descripcion: 'Visible en la prueba' }));
    await crearComprobante(e, await valorDeDocumento(e, null, { descripcion: 'Visible en la prueba' }));

    const sinAcceso = await nombres(e.otroId, false);

    expect(sinAcceso).toEqual([{ descripcion: 'Visible en la prueba', fondoId: null }]);
    expect(await nombres(e.otroId, true)).toHaveLength(2);
  });

  it('otra empresa no ve nada, ni con alcance total', async () => {
    expect(await nombres(e.usuarioId, true, e.empresaA2)).toEqual([]);
    expect(await nombres(e.usuarioId, true, e.empresaB)).toEqual([]);
  });

  it('el fondo asignado deja ver sus comprobantes', async () => {
    const propio = (await crearFondo(e)).id;
    await comoPropietario(
      'insert into caja_chica.accesos_a_fondos (empresa_id, usuario_id, fondo_id) values ($1, $2, $3)',
      [e.empresaA1, e.otroId, propio],
    );
    await crearComprobante(e, valeDeGastoValido(e, propio, { descripcion: 'Visible en la prueba' }));

    expect(await nombres(e.otroId, false)).toHaveLength(2);
  });
});
