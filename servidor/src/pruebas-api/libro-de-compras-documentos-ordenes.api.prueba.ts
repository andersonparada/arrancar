import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import '../modulos/core/contratos/libro-de-compras.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import type { ClienteApi } from './soporte/cliente-api.js';
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
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let destino: DestinoFalso;
let operador: Operador;
let soloVer: ClienteApi;
let anulador: ClienteApi;
let eliminador: ClienteApi;

const propietario = () => escenario.cuenta.propietario;
const registrar = async (cambios: Record<string, unknown> = {}) => {
  const respuesta = await propietario().post(RUTA_DOCUMENTOS, documentoDePrueba(escenario, cambios));
  expect(respuesta.estado).toBe(201);
  return respuesta.cuerpo.documento.id as string;
};
const ficha = async (id: string) => (await propietario().get(`${RUTA_DOCUMENTOS}/${id}`)).cuerpo;

beforeAll(async () => {
  destino = instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'ordenesdocumentos');
  const [usuario] = await consultar<{ id: string }>('select id from core.usuarios where usuario = $1', [
    escenario.cuenta.usuario,
  ]);
  const { cuentaId, empresaId } = escenario.cuenta;
  operador = { usuarioId: usuario!.id, cuentaId, empresaId, esSuperacceso: false };
  const con = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, escenario.cuenta, { nombres, apellidos: 'Bajas', permisos });
  soloVer = await con('Solo ver', ['libro-de-compras.documentos.ver']);
  anulador = await con('Anulador', ['libro-de-compras.documentos.anular']);
  eliminador = await con('Eliminador', ['libro-de-compras.documentos.eliminar']);
});

afterAll(() => vi.restoreAllMocks());

describe('permisos de anular y eliminar', () => {
  it('quien solo puede ver no anula ni elimina', async () => {
    const id = await registrar();

    const anulacion = await soloVer.post(`${RUTA_DOCUMENTOS}/${id}/anular`, { motivo: 'Prueba' });
    const eliminacion = await soloVer.delete(`${RUTA_DOCUMENTOS}/${id}`);

    expect([anulacion.estado, eliminacion.estado]).toEqual([403, 403]);
    expect(anulacion.cuerpo.error.codigo).toBe('sin_permiso');
    expect((await ficha(id)).estado).toBe('vigente');
  });

  it('documentos.anular solo anula, y documentos.eliminar solo elimina', async () => {
    const paraAnular = await registrar();
    const paraEliminar = await registrar();

    const anulaElAnulador = await anulador.post(`${RUTA_DOCUMENTOS}/${paraAnular}/anular`, { motivo: 'Prueba' });
    const eliminaElAnulador = await anulador.delete(`${RUTA_DOCUMENTOS}/${paraEliminar}`);
    const eliminaElEliminador = await eliminador.delete(`${RUTA_DOCUMENTOS}/${paraEliminar}`);
    const anulaElEliminador = await eliminador.post(`${RUTA_DOCUMENTOS}/${paraAnular}/anular`, { motivo: 'Prueba' });

    expect(anulaElAnulador.estado).toBe(200);
    expect(eliminaElAnulador.estado).toBe(403);
    expect(eliminaElEliminador.estado).toBe(204);
    expect(anulaElEliminador.estado).toBe(403);
  });

  it('sin sesión responde 401', async () => {
    const sinSesion = entorno.nuevoCliente();

    expect((await sinSesion.delete(`${RUTA_DOCUMENTOS}/${crypto.randomUUID()}`)).estado).toBe(401);
  });
});

describe('orden libro-de-compras.marcar_procesado', () => {
  it('fija la fecha en que el destino procesó el documento, y ya no se elimina; al limpiarla vuelve a pendiente', async () => {
    const id = await registrar();

    await mediador.enviar(operador, 'libro-de-compras.marcar_procesado', { documentoId: id, procesado: true });
    const procesado = await ficha(id);
    await mediador.enviar(operador, 'libro-de-compras.marcar_procesado', { documentoId: id, procesado: false });
    const pendiente = await ficha(id);

    expect(procesado.procesadoEnDestinoEn).toEqual(expect.any(String));
    expect(procesado).toMatchObject({ puedeAnular: true, puedeEliminar: false });
    expect(pendiente).toMatchObject({ procesadoEnDestinoEn: null, puedeEliminar: true });
  });

  it('un documento que no existe o es anulado no se marca como procesado', async () => {
    const id = await registrar();
    await mediador.enviar(operador, 'libro-de-compras.anular_documento', { documentoId: id, motivo: 'Prueba' });

    const marcar = (documentoId: string) =>
      mediador.enviar(operador, 'libro-de-compras.marcar_procesado', { documentoId, procesado: true });

    await expect(marcar(id)).rejects.toMatchObject({ codigo: 'documento_ya_anulado' });
    await expect(marcar(crypto.randomUUID())).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});

describe('órdenes de anular y eliminar que manda el destino', () => {
  it('anular a pedido de otro módulo avisa al destino y deja el mismo rastro que la pantalla', async () => {
    const id = await registrar();

    await mediador.enviar(operador, 'libro-de-compras.anular_documento', {
      documentoId: id,
      motivo: 'Lo pidió Compras',
    });

    expect(await ficha(id)).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Lo pidió Compras' });
    expect(destino.avisosDeBaja.at(-1)).toEqual({ aviso: 'anular', documentoId: id, motivo: 'Lo pidió Compras' });
  });

  it('si la pide el propio destino, no se le devuelve el aviso: no hay ciclo', async () => {
    const id = await registrar();
    const avisosAntes = destino.avisosDeBaja.length;
    destino.rechazarBajas = true;

    await mediador.enviar(operador, 'libro-de-compras.anular_documento', {
      documentoId: id,
      motivo: 'Lo anuló el destino',
      origen: 'cuentas-por-pagar',
    });
    destino.rechazarBajas = false;

    expect(destino.avisosDeBaja).toHaveLength(avisosAntes);
    expect((await ficha(id)).estado).toBe('anulado');
  });

  it('las reglas son las mismas: una factura con notas vigentes se rechaza y no cambia nada', async () => {
    const factura = await registrar();
    await registrar({ tipo: 'nota_de_credito', documentoAfectadoId: factura, serie: 'N' });

    await expect(
      mediador.enviar(operador, 'libro-de-compras.anular_documento', {
        documentoId: factura,
        motivo: 'Prueba',
        origen: 'cuentas-por-pagar',
      }),
    ).rejects.toMatchObject({ codigo: 'documento_con_notas_vigentes' });
    expect((await ficha(factura)).estado).toBe('vigente');
  });

  it('eliminar a pedido del destino borra lo limpio; lo procesado se rechaza', async () => {
    const limpio = await registrar();
    const procesado = await registrar();
    await mediador.enviar(operador, 'libro-de-compras.marcar_procesado', { documentoId: procesado, procesado: true });

    await mediador.enviar(operador, 'libro-de-compras.eliminar_documento', {
      documentoId: limpio,
      origen: 'cuentas-por-pagar',
    });

    await expect(
      mediador.enviar(operador, 'libro-de-compras.eliminar_documento', { documentoId: procesado }),
    ).rejects.toMatchObject({ codigo: 'documento_procesado_en_el_destino' });
    expect((await propietario().get(`${RUTA_DOCUMENTOS}/${limpio}`)).estado).toBe(404);
    expect((await ficha(procesado)).estado).toBe('vigente');
  });

  it('un documento de otra empresa no se toca', async () => {
    const id = await registrar();
    const deOtraEmpresa = { ...operador, empresaId: crypto.randomUUID() };

    await expect(
      mediador.enviar(deOtraEmpresa, 'libro-de-compras.eliminar_documento', { documentoId: id }),
    ).rejects.toMatchObject({ codigo: 'no_encontrado' });
    expect((await ficha(id)).estado).toBe('vigente');
  });
});
