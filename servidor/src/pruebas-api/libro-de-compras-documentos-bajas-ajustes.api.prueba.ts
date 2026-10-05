import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  documentoDePrueba,
  haceDias,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
const AVISO_DE_PERIODO = 'Ese período puede estar declarado: si ya lo presentó, tendrá que rectificar.';

const propietario = () => escenario.cuenta.propietario;
const registrar = async (cambios: Record<string, unknown> = {}) => {
  const respuesta = await propietario().post(RUTA_DOCUMENTOS, documentoDePrueba(escenario, cambios));
  expect(respuesta.estado).toBe(201);
  return respuesta.cuerpo.documento.id as string;
};
/** Un documento de un mes anterior: su período puede estar declarado. */
const registrarAntiguo = () => registrar({ fechaEmision: haceDias(70), fechaRecepcion: haceDias(65) });
const anular = (id: string, cuerpo: Record<string, unknown>) =>
  propietario().post(`${RUTA_DOCUMENTOS}/${id}/anular`, cuerpo);

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'bajasajustes');
});

afterAll(() => vi.restoreAllMocks());

describe('causa de anulación', () => {
  it('es obligatoria y de una lista; con cada una se guarda, se ve en la ficha y queda en la auditoría', async () => {
    const id = await registrar();

    const sinCausa = await anular(id, { motivo: 'Algo' });
    const inventada = await anular(id, { causa: 'porque_si', motivo: 'Algo' });
    const anulada = await anular(id, { causa: 'fel_anulada_por_el_emisor', motivo: 'La anuló el emisor' });

    expect([sinCausa.estado, inventada.estado]).toEqual([400, 400]);
    expect(anulada.estado).toBe(200);
    expect(anulada.cuerpo.documento.causaDeAnulacion).toBe('fel_anulada_por_el_emisor');
    expect((await propietario().get(`${RUTA_DOCUMENTOS}/${id}`)).cuerpo.causaDeAnulacion).toBe(
      'fel_anulada_por_el_emisor',
    );
    const auditadas = await consultar<{ motivo: string }>(
      "select motivo from core.auditoria where recurso = 'libro-de-compras.documentos' and accion = 'anular' and registro_id = $1",
      [id],
    );
    expect(auditadas).toEqual([{ motivo: 'fel_anulada_por_el_emisor: La anuló el emisor' }]);
  });

  it('la base no deja un documento anulado sin causa ni una causa fuera de la lista', async () => {
    const id = await registrar();
    const anularSinCausa = () =>
      consultar(
        `update libro_de_compras.documentos set estado = 'anulado', anulado_en = now(),
           anulado_por = creado_por, motivo_de_anulacion = 'x' where id = $1`,
        [id],
      );
    const causaInventada = () =>
      consultar("update libro_de_compras.documentos set causa_de_anulacion = 'otra' where id = $1", [id]);

    await expect(anularSinCausa()).rejects.toThrow(/documentos_anulacion_completa/);
    await expect(causaInventada()).rejects.toThrow(/documentos_causa_de_anulacion_valida/);
  });
});

describe('aviso de período anterior al mes actual', () => {
  it('al anular un documento de un mes anterior avisa que puede estar declarado; del mes actual, no', async () => {
    const antiguo = await registrarAntiguo();
    const actual = await registrar();

    const deAntes = await anular(antiguo, { causa: 'error_de_captura', motivo: 'Error' });
    const deAhora = await anular(actual, { causa: 'error_de_captura', motivo: 'Error' });

    expect(deAntes.cuerpo.avisos).toEqual([AVISO_DE_PERIODO]);
    expect(deAhora.cuerpo.avisos).toEqual([]);
    expect(deAntes.cuerpo.documento.estado).toBe('anulado');
  });

  it('al eliminar responde 200 con { avisos }: con el aviso si el período es anterior', async () => {
    const antiguo = await registrarAntiguo();
    const actual = await registrar();

    const deAntes = await propietario().delete(`${RUTA_DOCUMENTOS}/${antiguo}`);
    const deAhora = await propietario().delete(`${RUTA_DOCUMENTOS}/${actual}`);

    expect(deAntes.estado).toBe(200);
    expect(deAntes.cuerpo).toEqual({ avisos: [AVISO_DE_PERIODO] });
    expect(deAhora.cuerpo).toEqual({ avisos: [] });
  });
});

describe('lista de documentos por estado', () => {
  it('oculta los anulados por omisión; se piden con estado=anulado o todos', async () => {
    const vigente = await registrar();
    const anulado = await registrar();
    await anular(anulado, { causa: 'no_corresponde_a_la_empresa', motivo: 'No es nuestra' });
    const ids = (respuesta: { cuerpo: { elementos: Array<{ id: string }> } }) =>
      respuesta.cuerpo.elementos.map((fila) => fila.id);

    const porOmision = await propietario().get(RUTA_DOCUMENTOS);
    const vigentes = await propietario().get(`${RUTA_DOCUMENTOS}?estado=vigente`);
    const anulados = await propietario().get(`${RUTA_DOCUMENTOS}?estado=anulado`);
    const todos = await propietario().get(`${RUTA_DOCUMENTOS}?estado=todos`);

    expect(ids(porOmision)).toContain(vigente);
    expect(ids(porOmision)).not.toContain(anulado);
    expect(ids(vigentes)).toEqual(ids(porOmision));
    expect(ids(anulados)).toContain(anulado);
    expect(ids(anulados)).not.toContain(vigente);
    expect(ids(todos)).toEqual(expect.arrayContaining([vigente, anulado]));
  });
});
