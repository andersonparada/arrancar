import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, HOY, RUTA_DOCUMENTOS } from './soporte/escenario-de-documentos.js';
import {
  filasDelDocumento,
  MES_DE_HOY,
  prepararRetenciones,
  reporteDelMes,
  RUTA_RETENCIONES,
  type EscenarioDeRetenciones,
} from './soporte/escenario-de-retenciones.js';

const entorno = usarEntornoApi();
let e: EscenarioDeRetenciones;

const eliminar = (documentoId: string) => e.propietario.delete(`${RUTA_DOCUMENTOS}/${documentoId}`);
const anular = (documentoId: string) =>
  e.propietario.post(`${RUTA_DOCUMENTOS}/${documentoId}/anular`, { causa: 'error_de_captura', motivo: 'Error' });
const resolver = (id: string, cuerpo: Record<string, unknown>) =>
  e.propietario.put(`${RUTA_RETENCIONES}/${id}/resolucion`, cuerpo);
const porResolver = async (estado = 'pendiente') =>
  (await e.propietario.get(`${RUTA_RETENCIONES}/por-resolver?estado=${estado}`)).cuerpo as any[];

/** Registra una factura, anota la constancia de su retención del IVA si se pide y devuelve ambos ids. */
async function registrarRetenida(proveedorId: string, conConstancia: boolean) {
  const { id } = await e.registrar(proveedorId);
  const reporte = await reporteDelMes(e.propietario, MES_DE_HOY);
  const retencionId = filasDelDocumento(reporte, id)[0].id as string;
  if (conConstancia) {
    const anotada = await e.propietario.put(`${RUTA_RETENCIONES}/${retencionId}/constancia`, {
      numero: `K-${id.slice(0, 6)}`,
      fecha: HOY,
    });
    expect(anotada.estado).toBe(200);
  }
  return { documentoId: id, retencionId };
}

beforeAll(async () => {
  e = await prepararRetenciones(entorno, 'retencionesporresolver');
});

afterAll(() => vi.restoreAllMocks());

describe('eliminar un documento con retenciones', () => {
  it('con una retención con constancia queda bloqueado: solo se puede anular', async () => {
    const { documentoId } = await registrarRetenida(e.escenario.proveedorId, true);

    const respuesta = await eliminar(documentoId);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('documento_con_constancia');
    expect((await e.propietario.get(`${RUTA_DOCUMENTOS}/${documentoId}`)).cuerpo.estado).toBe('vigente');
    expect(await anular(documentoId)).toMatchObject({ estado: 200 });
  });

  it('sin constancia ni entero se elimina como siempre', async () => {
    const { documentoId } = await registrarRetenida(e.escenario.proveedorId, false);

    expect((await eliminar(documentoId)).estado).toBe(200);
  });
});

describe('anular un documento con retenciones', () => {
  it('deja «pendiente» sus retenciones con monto y avisa cuántas quedan', async () => {
    const { documentoId, retencionId } = await registrarRetenida(e.escenario.proveedorId, false);

    const respuesta = await anular(documentoId);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('Queda 1 retención por resolver');
    const [guardada] = await consultar<{ resolucion: string | null }>(
      'select resolucion from libro_de_compras.retenciones where id = $1',
      [retencionId],
    );
    expect(guardada?.resolucion).toBe('pendiente');
  });

  it('una retención en cero no queda por resolver', async () => {
    const { id } = await e.registrar(e.escenario.proveedorId, {
      ajustesDeRetenciones: [{ regla: 'iva_contribuyente_especial', monto: '0', motivo: 'Exento' }],
    });

    const respuesta = await anular(id);

    expect(respuesta.cuerpo.avisos.join(' ')).not.toContain('por resolver');
    const filas = await consultar<{ resolucion: string | null }>(
      'select resolucion from libro_de_compras.retenciones where documento_id = $1',
      [id],
    );
    expect(filas).toEqual([{ resolucion: null }]);
  });
});

describe('reporte de lo por resolver y su resolución', () => {
  it('sugiere anular la constancia si la hay y confirmar si no; al resolver pasa a «resueltas»', async () => {
    const conConstancia = await registrarRetenida(e.opcional, true);
    const sinConstancia = await registrarRetenida(e.opcional, false);
    await anular(conConstancia.documentoId);
    await anular(sinConstancia.documentoId);

    const pendientes = await porResolver();
    const con = pendientes.find((fila) => fila.id === conConstancia.retencionId);
    const sin = pendientes.find((fila) => fila.id === sinConstancia.retencionId);
    expect(con).toMatchObject({ accionSugerida: 'anular_constancia', resolucion: 'pendiente', enterada: false });
    expect(sin).toMatchObject({ accionSugerida: 'confirmar', documento: { estado: 'anulado' } });

    const resuelta = await resolver(con.id, { resolucion: 'constancia_anulada', nota: 'Anulada en Retenciones Web' });
    expect(resuelta.estado, JSON.stringify(resuelta.cuerpo)).toBe(200);
    expect(resuelta.cuerpo).toMatchObject({ resolucion: 'constancia_anulada', nota: 'Anulada en Retenciones Web' });
    expect(resuelta.cuerpo.resueltaEn).not.toBeNull();
    expect((await porResolver()).some((fila) => fila.id === con.id)).toBe(false);
    expect((await porResolver('resueltas')).map((fila) => fila.id)).toContain(con.id);
  });

  it('resolver exige una nota, solo vale para documentos anulados y se audita', async () => {
    const vigente = await registrarRetenida(e.escenario.proveedorId, false);
    const anulado = await registrarRetenida(e.escenario.proveedorId, false);
    await anular(anulado.documentoId);

    const sinNota = await resolver(anulado.retencionId, { resolucion: 'no_requiere' });
    const deVigente = await resolver(vigente.retencionId, { resolucion: 'no_requiere', nota: 'No aplica' });
    const resuelta = await resolver(anulado.retencionId, { resolucion: 'no_requiere', nota: 'No aplica' });
    const invalida = await resolver(anulado.retencionId, { resolucion: 'olvidada', nota: 'x' });

    expect(sinNota.cuerpo.error.codigo).toBe('nota_de_resolucion_invalida');
    expect(deVigente.estado).toBe(422);
    expect(deVigente.cuerpo.error.codigo).toBe('resolucion_solo_de_documento_anulado');
    expect(resuelta.estado).toBe(200);
    expect(invalida.cuerpo.error.codigo).toBe('resolucion_invalida');
    const auditadas = await consultar<{ motivo: string; anterior: { resolucion: string } }>(
      "select motivo, anterior from core.auditoria where recurso = 'libro-de-compras.retenciones' and accion = 'corregir' and registro_id = $1",
      [anulado.retencionId],
    );
    expect(auditadas).toEqual([expect.objectContaining({ motivo: 'No aplica' })]);
  });

  it('se puede volver a «pendiente» y la nota y el autor se borran', async () => {
    const { documentoId, retencionId } = await registrarRetenida(e.escenario.proveedorId, false);
    await anular(documentoId);
    await resolver(retencionId, { resolucion: 'rectificada', nota: 'Rectificado' });

    const vuelta = await resolver(retencionId, { resolucion: 'pendiente' });

    expect(vuelta.cuerpo).toMatchObject({ resolucion: 'pendiente', nota: null, resueltaEn: null, resueltaPor: null });
  });
});
