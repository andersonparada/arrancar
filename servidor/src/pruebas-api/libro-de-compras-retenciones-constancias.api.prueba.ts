import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, HOY } from './soporte/escenario-de-documentos.js';
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
/** Las retenciones (id) de tres documentos: dos del IVA y una del ISR, más una en cero. */
let iva1: string;
let iva2: string;
let isr: string;
let enCero: string;

const auditadas = (accion: string, id: string) =>
  consultar<{ motivo: string | null; anterior: { constanciaNumero: string | null } }>(
    "select motivo, anterior from core.auditoria where recurso = 'libro-de-compras.retenciones' and accion = $1 and registro_id = $2",
    [accion, id],
  );
const constancia = (id: string, cambios: Record<string, unknown> = {}) =>
  e.propietario.put(`${RUTA_RETENCIONES}/${id}/constancia`, { numero: 'c-100', fecha: HOY, ...cambios });
const retencionDe = async (id: string) => {
  const reporte = await reporteDelMes(e.propietario, MES_DE_HOY);
  return [...reporte.retenciones, ...reporte.anuladas].find((fila: { id: string }) => fila.id === id);
};

beforeAll(async () => {
  e = await prepararRetenciones(entorno, 'retencionesconstancias');
  const primero = (await e.registrar(e.escenario.proveedorId)).id;
  const segundo = (await e.registrar(e.opcional)).id;
  const cero = (
    await e.registrar(e.escenario.proveedorId, {
      ajustesDeRetenciones: [{ regla: 'iva_contribuyente_especial', monto: '0', motivo: 'Exento' }],
    })
  ).id;
  const reporte = await reporteDelMes(e.propietario, MES_DE_HOY);
  const regla = (documentoId: string, nombre: string) =>
    filasDelDocumento(reporte, documentoId).find((fila: { regla: string }) => fila.regla === nombre).id as string;
  iva1 = regla(primero, 'iva_contribuyente_especial');
  iva2 = regla(segundo, 'iva_contribuyente_especial');
  isr = regla(segundo, 'isr_opcional_simplificado');
  enCero = regla(cero, 'iva_contribuyente_especial');
});

afterAll(() => vi.restoreAllMocks());

describe('anotar una constancia', () => {
  it('guarda el número en mayúsculas y la fecha; la primera vez no se audita', async () => {
    const respuesta = await constancia(iva1);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.retencion).toMatchObject({ id: iva1, constanciaNumero: 'C-100', constanciaFecha: HOY });
    expect(await auditadas('corregir', iva1)).toEqual([]);
  });

  it('cambiarla se audita como corrección con la retención como estaba', async () => {
    const respuesta = await constancia(iva1, { numero: 'C-101' });

    expect(respuesta.cuerpo.retencion.constanciaNumero).toBe('C-101');
    const [auditada] = await auditadas('corregir', iva1);
    expect(auditada?.anterior.constanciaNumero).toBe('C-100');
  });

  it('avisa, sin bloquear, si el número ya lo usa otro proveedor', async () => {
    const respuesta = await constancia(iva2, { numero: 'C-101' });

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('otro proveedor');
  });

  it('rechaza una fecha anterior a la retención, una retención en cero y una que no existe', async () => {
    const anterior = await constancia(isr, { fecha: '2020-01-01' });
    const cero = await constancia(enCero);
    const noExiste = await constancia(crypto.randomUUID());

    expect(anterior.estado).toBe(400);
    expect(anterior.cuerpo.error).toMatchObject({ codigo: 'constancia_anterior_a_la_retencion' });
    expect(cero.estado).toBe(422);
    expect(cero.cuerpo.error.codigo).toBe('retencion_en_cero');
    expect(noExiste.estado).toBe(404);
  });

  it('quitarla exige el motivo y se audita como «quitar»', async () => {
    const sinMotivo = await e.propietario.delete(`${RUTA_RETENCIONES}/${iva2}/constancia`, { motivo: ' ' });
    const quitada = await e.propietario.delete(`${RUTA_RETENCIONES}/${iva2}/constancia`, {
      motivo: 'Se anuló en Retenciones Web',
    });
    const otraVez = await e.propietario.delete(`${RUTA_RETENCIONES}/${iva2}/constancia`, { motivo: 'Otra vez' });

    expect(sinMotivo.estado).toBe(400);
    expect(quitada.cuerpo.retencion).toMatchObject({ constanciaNumero: null, constanciaFecha: null });
    expect(await auditadas('quitar', iva2)).toEqual([
      expect.objectContaining({ motivo: 'Se anuló en Retenciones Web' }),
    ]);
    expect(otraVez.cuerpo.error.codigo).toBe('retencion_sin_constancia');
  });
});

describe('anotar constancias en lote', () => {
  const lote = (constancias: unknown[]) => e.propietario.post(`${RUTA_RETENCIONES}/constancias`, { constancias });
  const fila = (retencionId: string, cambios: Record<string, unknown> = {}) => ({
    retencionId,
    numero: `L-${retencionId.slice(0, 4)}`,
    fecha: HOY,
    ...cambios,
  });

  it('es todo o nada: si una fila falla no se guarda ninguna y el error dice cuál', async () => {
    const respuesta = await lote([fila(iva2), fila(isr, { fecha: '2020-01-01' }), fila(enCero)]);

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('constancias_en_lote_invalidas');
    expect(respuesta.cuerpo.error.detalles.filas).toEqual([
      expect.objectContaining({ indice: 1, campo: 'fecha' }),
      expect.objectContaining({ indice: 2, campo: 'retencionId' }),
    ]);
    expect((await retencionDe(iva2)).constanciaNumero).toBeNull();
    expect((await retencionDe(isr)).constanciaNumero).toBeNull();
  });

  it('rechaza una retención repetida o inexistente en el lote', async () => {
    const respuesta = await lote([fila(iva2), fila(iva2), fila(crypto.randomUUID())]);

    expect(respuesta.cuerpo.error.detalles.filas.map((f: { indice: number }) => f.indice)).toEqual([1, 2]);
  });

  it('guarda todas las filas válidas juntas', async () => {
    const respuesta = await lote([fila(iva2), fila(isr)]);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.cantidad).toBe(2);
    expect((await retencionDe(iva2)).constanciaNumero).toBe(`L-${iva2.slice(0, 4)}`.toUpperCase());
    expect((await retencionDe(isr)).constanciaFecha).toBe(HOY);
  });

  it('un lote vacío o de más de 200 filas se rechaza', async () => {
    const demasiadas = Array.from({ length: 201 }, () => fila(iva1));

    expect((await lote([])).estado).toBe(400);
    expect((await lote(demasiadas)).estado).toBe(400);
  });

  it('el reporte filtra por constancia y cuenta lo que tiene y lo que no', async () => {
    const con = await reporteDelMes(e.propietario, MES_DE_HOY, 'constancia=con');
    const sin = await reporteDelMes(e.propietario, MES_DE_HOY, 'constancia=sin');

    expect(con.retenciones.map((f: { id: string }) => f.id).sort()).toEqual([iva1, iva2, isr].sort());
    expect(sin.retenciones.map((f: { id: string }) => f.id)).toEqual([enCero]);
    const iva = con.grupos.find((g: { grupo: string }) => g.grupo === 'iva_agentes');
    expect(iva.conConstancia.cantidad).toBe(2);
    expect(iva.sinConstancia.cantidad).toBe(0);
  });
});
