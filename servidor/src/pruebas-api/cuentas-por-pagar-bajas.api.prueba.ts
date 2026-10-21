import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import { ReglaDeNegocioInfringida } from '../modulos/core/compartido/dominio/errores.js';
import '../modulos/core/contratos/cuentas-por-pagar.contratos.js';
import '../modulos/core/contratos/libro-de-compras.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  haceDias,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
const EMISION = haceDias(3);
let escenario: EscenarioDeDocumentos;
let documentos: DocumentosPorPagarDePrueba;
let operador: Operador;
const publicados: Array<{ documentoId: string; estabaAutorizado: boolean }> = [];
let rechazarDespues = false;

class RechazoPosterior extends ReglaDeNegocioInfringida {
  readonly codigo = 'rechazo_posterior';
}

const propietario = () => escenario.cuenta.propietario;
const anular = (id: string, motivo = 'Se registró por error') =>
  propietario().post(`${RUTA_DOCUMENTOS}/${id}/anular`, { causa: 'error_de_captura', motivo });
const eliminar = (id: string) => propietario().delete(`${RUTA_DOCUMENTOS}/${id}`);
const estadoEnLibro = async (id: string) =>
  (await consultar<{ estado: string }>('select estado from libro_de_compras.documentos where id = $1', [id]))[0]
    ?.estado;
const existeEnLibro = async (id: string) =>
  (await consultar('select 1 from libro_de_compras.documentos where id = $1', [id])).length === 1;
const auditoriaDe = (recurso: string, accion: string) =>
  consultar<{ registro_id: string; motivo: string | null; anterior: Record<string, unknown> }>(
    'select registro_id, motivo, anterior from core.auditoria where recurso = $1 and accion = $2 and cuenta_id = $3',
    [recurso, accion, escenario.cuenta.cuentaId],
  );

/** Deja el documento como si ya lo hubieran completado y autorizado dos personas distintas. */
const autorizar = (documentoId: string, procesadoEnElLibro = false) =>
  consultar(
    `update cuentas_por_pagar.documentos set estado = 'autorizado', registrado_en = now(), registrado_por = $2,
            autorizado_en = now(), autorizado_por = $3 where documento_id = $1`,
    [documentoId, crypto.randomUUID(), crypto.randomUUID()],
  ).then(() =>
    procesadoEnElLibro
      ? consultar('update libro_de_compras.documentos set procesado_en_destino_en = now() where id = $1', [documentoId])
      : undefined,
  );

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpbajas', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, EMISION);
  const [usuario] = await consultar<{ id: string }>('select id from core.usuarios where usuario = $1', [
    escenario.cuenta.usuario,
  ]);
  const { cuentaId, empresaId } = escenario.cuenta;
  operador = { usuarioId: usuario!.id, cuentaId, empresaId, esSuperacceso: false };
  busEventos.suscribir('cuentas-por-pagar.documento_anulado', async (datos) => {
    publicados.push({ documentoId: datos.documentoDeCompraId, estabaAutorizado: datos.estabaAutorizado });
  });
  mediador.escuchar('cuentas-por-pagar', 'libro-de-compras.documento_por_anular', async () => {
    if (rechazarDespues) throw new RechazoPosterior('Otro escucha rechazó la anulación.');
  });
});

afterAll(() => {
  rechazarDespues = false;
});

describe('anular desde Libro de compras', () => {
  it('deja el documento anulado en Cuentas por pagar, lo audita como estaba y publica el evento al confirmar', async () => {
    const id = await documentos.registrar();
    const antes = (await documentos.fila(id))!;

    const respuesta = await anular(id, 'Duplicada');

    expect(respuesta.estado).toBe(200);
    expect(await documentos.fila(id)).toMatchObject({
      estado: 'anulado',
      motivo_de_anulacion: 'Duplicada',
      estaba_autorizado: false,
    });
    const [auditado] = (await auditoriaDe('cuentas-por-pagar.documentos', 'anular')).filter(
      (fila) => fila.registro_id === antes.id,
    );
    expect(auditado).toMatchObject({
      motivo: 'Duplicada',
      anterior: { id: antes.id, estado: 'pendiente', total: '1120.00', aplicacionesRecibidas: [] },
    });
    expect(publicados).toContainEqual({ documentoId: id, estabaAutorizado: false });
  });

  it('un documento autorizado se anula y el evento dice que estaba autorizado', async () => {
    const id = await documentos.registrar();
    await autorizar(id, true);

    const respuesta = await anular(id);

    expect(respuesta.estado).toBe(200);
    expect(await documentos.fila(id)).toMatchObject({ estado: 'anulado', estaba_autorizado: true });
    expect(publicados).toContainEqual({ documentoId: id, estabaAutorizado: true });
  });

  it('anular una nota de crédito borra sus aplicaciones: lo aplicado vuelve al saldo de la factura', async () => {
    const facturaId = await documentos.registrar();
    const notaId = await documentos.registrarNota('NCRE', facturaId, { total: '336.00' });
    expect(await documentos.aplicacionesDe(notaId)).toHaveLength(1);

    const respuesta = await anular(notaId);

    expect(respuesta.estado).toBe(200);
    expect(await documentos.aplicacionesDe(notaId)).toEqual([]);
    const [auditada] = await consultar<{ anterior: { aplicacionesHechas: Array<{ monto: string }> } }>(
      `select anterior from core.auditoria where recurso = 'cuentas-por-pagar.documentos' and accion = 'anular'
          and registro_id = (select id::text from cuentas_por_pagar.documentos where documento_id = $1)`,
      [notaId],
    );
    expect(auditada?.anterior.aplicacionesHechas.map((a) => a.monto)).toEqual(['336.00']);
  });

  it('si Libro de compras rechaza la anulación (la factura tiene notas), Cuentas por pagar no cambia', async () => {
    const facturaId = await documentos.registrar();
    await documentos.registrarNota('NCRE', facturaId, { total: '336.00' });

    const respuesta = await anular(facturaId);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('documento_con_notas_vigentes');
    expect((await documentos.fila(facturaId))?.estado).toBe('pendiente');
  });

  it('el aviso es idempotente: repetirlo no vuelve a anular, ni a auditar, ni a publicar', async () => {
    const id = await documentos.registrar();
    await anular(id);
    const eventosAntes = publicados.length;
    const aviso = { documentoId: id, destino: 'cuentas-por-pagar' as const, motivo: 'Otra vez' };

    await mediador.avisar(operador, 'libro-de-compras.documento_por_anular', aviso);
    await mediador.avisar(operador, 'libro-de-compras.documento_por_anular', aviso);

    const auditados = await auditoriaDe('cuentas-por-pagar.documentos', 'anular');
    const fila = (await documentos.fila(id))!;
    expect(auditados.filter((a) => a.registro_id === fila.id)).toHaveLength(1);
    expect(fila.motivo_de_anulacion).toBe('Se registró por error');
    expect(publicados).toHaveLength(eventosAntes);
  });

  it('si otro escucha rechaza después, se deshace todo y el evento nunca se publica', async () => {
    const id = await documentos.registrar();
    const eventosAntes = publicados.length;
    rechazarDespues = true;

    const respuesta = await anular(id);
    rechazarDespues = false;

    expect(respuesta.estado).toBe(422);
    expect(await documentos.fila(id)).toMatchObject({ estado: 'pendiente', motivo_de_anulacion: null });
    expect(await estadoEnLibro(id)).toBe('vigente');
    expect(publicados).toHaveLength(eventosAntes);
  });
});

describe('eliminar desde Libro de compras', () => {
  it('un documento pendiente se va de las dos tablas y las dos bajas quedan en la auditoría', async () => {
    const id = await documentos.registrar();
    const { id: propio } = (await documentos.fila(id))!;

    const respuesta = await eliminar(id);

    expect(respuesta.estado).toBe(200);
    expect(await documentos.fila(id)).toBeUndefined();
    expect(await existeEnLibro(id)).toBe(false);
    const deCuentas = await auditoriaDe('cuentas-por-pagar.documentos', 'eliminar');
    const deLibro = await auditoriaDe('libro-de-compras.documentos', 'eliminar');
    expect(deCuentas.find((a) => a.registro_id === propio)?.anterior).toMatchObject({ id: propio, total: '1120.00' });
    expect(deLibro.map((a) => a.registro_id)).toContain(id);
  });

  it('eliminar una nota de crédito se lleva sus aplicaciones', async () => {
    const facturaId = await documentos.registrar();
    const notaId = await documentos.registrarNota('NCRE', facturaId, { total: '336.00' });

    const respuesta = await eliminar(notaId);

    expect(respuesta.estado).toBe(200);
    expect(await documentos.fila(notaId)).toBeUndefined();
    expect(await documentos.aplicacionesDe(notaId)).toEqual([]);
  });

  it('Libro de compras no elimina un documento que Cuentas por pagar ya procesó', async () => {
    const id = await documentos.registrar();
    await autorizar(id, true);

    const respuesta = await eliminar(id);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('documento_procesado_en_el_destino');
    expect(await documentos.fila(id)).toMatchObject({ estado: 'autorizado' });
  });

  it('Cuentas por pagar también lo rechaza si está autorizado, y no cambia nada', async () => {
    const id = await documentos.registrar();
    await autorizar(id);

    const respuesta = await eliminar(id);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('documento_autorizado');
    expect(await documentos.fila(id)).toMatchObject({ estado: 'autorizado' });
    expect(await existeEnLibro(id)).toBe(true);
  });
});

describe('con Cuentas por pagar desactivado', () => {
  it('Libro de compras no deja anular ni eliminar y pide activar el módulo', async () => {
    const id = await documentos.registrar();
    const url = `/api/plataforma/cuentas/${escenario.cuenta.cuentaId}/modulos/cuentas-por-pagar`;
    await entorno.soporte.delete(url);
    try {
      const anulacion = await anular(id);
      const eliminacion = await eliminar(id);

      expect([anulacion.estado, eliminacion.estado]).toEqual([422, 422]);
      expect(anulacion.cuerpo.error).toMatchObject({
        codigo: 'destino_inactivo',
        mensaje: 'Active Cuentas por pagar para dar de baja este documento.',
      });
      expect(eliminacion.cuerpo.error.codigo).toBe('destino_inactivo');
      expect(await estadoEnLibro(id)).toBe('vigente');
    } finally {
      await entorno.soporte.put(url);
    }
  });
});
