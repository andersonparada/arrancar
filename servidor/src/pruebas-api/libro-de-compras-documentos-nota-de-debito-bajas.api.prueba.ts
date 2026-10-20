import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  documentoDePrueba,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type DestinoFalso,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let destino: DestinoFalso;

const propietario = () => escenario.cuenta.propietario;
const registrar = async (cambios: Record<string, unknown>) => {
  const respuesta = await propietario().post(RUTA_DOCUMENTOS, documentoDePrueba(escenario, cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento.id as string;
};
const registrarFactura = () => registrar({});
const registrarNota = (tipoDte: 'NCRE' | 'NDEB', facturaId: string, total: string) =>
  registrar({
    tipoDte,
    documentoAfectadoId: facturaId,
    serie: tipoDte === 'NDEB' ? 'D' : 'N',
    lineas: [{ conceptoId: escenario.conceptoId, total }],
  });
const anular = (id: string) =>
  propietario().post(`${RUTA_DOCUMENTOS}/${id}/anular`, { causa: 'error_de_captura', motivo: 'Se registró por error' });
const eliminar = (id: string) => propietario().delete(`${RUTA_DOCUMENTOS}/${id}`);
const estadoEnLaBase = async (id: string) =>
  (await consultar<{ estado: string }>('select estado from libro_de_compras.documentos where id = $1', [id]))[0]
    ?.estado ?? null;
const auditados = (id: string) =>
  consultar<{ accion: string; anterior: { tipo: string; tipoDte: string } }>(
    "select accion, anterior from core.auditoria where recurso = 'libro-de-compras.documentos' and registro_id = $1",
    [id],
  );

beforeAll(async () => {
  destino = instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'bajasnotasdedebito');
});

afterAll(() => vi.restoreAllMocks());

describe('bajas de la factura con nota de débito', () => {
  it('con una nota de débito vigente no se anula ni se elimina', async () => {
    const factura = await registrarFactura();
    await registrarNota('NDEB', factura, '560.00');

    const anulada = await anular(factura);
    const eliminada = await eliminar(factura);

    expect(anulada.estado).toBe(422);
    expect(anulada.cuerpo.error.codigo).toBe('documento_con_notas_vigentes');
    expect(eliminada.cuerpo.error.codigo).toBe('documento_con_notas');
    expect(await estadoEnLaBase(factura)).toBe('vigente');
  });

  it('con la nota de débito anulada se anula, pero no se elimina', async () => {
    const factura = await registrarFactura();
    const ndeb = await registrarNota('NDEB', factura, '560.00');
    await anular(ndeb);

    const eliminada = await eliminar(factura);
    const anulada = await anular(factura);

    expect(eliminada.cuerpo.error.codigo).toBe('documento_con_notas');
    expect(anulada.estado).toBe(200);
  });
});

describe('bajas de la nota de débito', () => {
  it('sin notas de crédito se anula y queda auditada con su ficha', async () => {
    const factura = await registrarFactura();
    const ndeb = await registrarNota('NDEB', factura, '560.00');

    const respuesta = await anular(ndeb);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.documento).toMatchObject({ estado: 'anulado', tipo: 'nota_de_debito' });
    expect(destino.avisosDeBaja.at(-1)).toMatchObject({ aviso: 'anular', documentoId: ndeb });
    expect(await auditados(ndeb)).toEqual([
      expect.objectContaining({ accion: 'anular', anterior: expect.objectContaining({ tipoDte: 'NDEB' }) }),
    ]);
  });

  it('sin notas de crédito se elimina: avisa al destino y queda auditada', async () => {
    const factura = await registrarFactura();
    const ndeb = await registrarNota('NDEB', factura, '560.00');

    const respuesta = await eliminar(ndeb);

    expect(respuesta.estado).toBe(200);
    expect(await estadoEnLaBase(ndeb)).toBeNull();
    expect(destino.avisosDeBaja.at(-1)).toMatchObject({ aviso: 'eliminar', documentoId: ndeb });
    expect(await auditados(ndeb)).toEqual([expect.objectContaining({ accion: 'eliminar' })]);
    expect((await propietario().get(`${RUTA_DOCUMENTOS}/${factura}`)).cuerpo.puedeEliminar).toBe(true);
  });

  it('si sostiene notas de crédito no se anula ni se elimina (y no queda rastro); sin ellas, sí', async () => {
    const factura = await registrarFactura();
    const ndeb = await registrarNota('NDEB', factura, '560.00');
    const credito = await registrarNota('NCRE', factura, '1680.00');

    const anulada = await anular(ndeb);
    const eliminada = await eliminar(ndeb);

    for (const respuesta of [anulada, eliminada]) {
      expect(respuesta.estado).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('nota_de_debito_sostiene_notas_de_credito');
    }
    expect(await estadoEnLaBase(ndeb)).toBe('vigente');
    expect(await auditados(ndeb)).toHaveLength(0);

    await anular(credito);

    expect((await anular(ndeb)).estado).toBe(200);
  });

  it('el tope cuenta las otras notas de débito vigentes', async () => {
    const factura = await registrarFactura();
    const primera = await registrarNota('NDEB', factura, '560.00');
    await registrarNota('NDEB', factura, '560.00');
    await registrarNota('NCRE', factura, '1680.00');

    const sobra = await anular(primera);

    expect(sobra.estado).toBe(200);
    expect((await propietario().get(`${RUTA_DOCUMENTOS}/${factura}`)).cuerpo.totalAjustado).toBe('0.00');
  });

  it('con notas de crédito que no caben sin ella se rechaza aunque haya otras notas de débito', async () => {
    const factura = await registrarFactura();
    const primera = await registrarNota('NDEB', factura, '560.00');
    await registrarNota('NDEB', factura, '560.00');
    await registrarNota('NCRE', factura, '1700.00');

    const rechazada = await anular(primera);

    expect(rechazada.cuerpo.error.codigo).toBe('nota_de_debito_sostiene_notas_de_credito');
  });
});
