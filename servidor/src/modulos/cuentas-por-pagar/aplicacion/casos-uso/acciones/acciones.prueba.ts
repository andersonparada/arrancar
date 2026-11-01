import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuditoriaEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { DocumentoParaDestino } from '../../../../core/contratos/libro-de-compras.contratos.js';
import { ConsultasEnMemoria, LibroDeComprasEnMemoria } from '../../../pruebas/dobles-de-acciones.js';
import {
  AplicacionesEnMemoria,
  CondicionesEnMemoria,
  DocumentosDeCompraEnMemoria,
  DocumentosEnMemoria,
  PlazoFijo,
} from '../../../pruebas/dobles-de-documentos.js';
import { RecibirDocumento } from '../recibir-documento.js';
import { AutorizarDocumentos } from './autorizar-documentos.js';
import { CambiarVencimiento } from './cambiar-vencimiento.js';
import { CompletarDocumentos } from './completar-documentos.js';
import { DesautorizarDocumento } from './desautorizar-documento.js';

const ana = operadorDePrueba();
const beto = operadorDePrueba({ cuentaId: ana.cuentaId, empresaId: ana.empresaId });

let documentos: DocumentosEnMemoria;
let auditoria: AuditoriaEnMemoria;
let eventos: PublicadorEventosEnMemoria;
let libro: LibroDeComprasEnMemoria;
let recibir: RecibirDocumento;
let completar: CompletarDocumentos;
let autorizar: AutorizarDocumentos;
let desautorizar: DesautorizarDocumento;
let cambiarVencimiento: CambiarVencimiento;

beforeEach(() => {
  const aplicaciones = new AplicacionesEnMemoria();
  documentos = new DocumentosEnMemoria(aplicaciones);
  auditoria = new AuditoriaEnMemoria();
  eventos = new PublicadorEventosEnMemoria();
  libro = new LibroDeComprasEnMemoria(documentos.bitacora);
  const unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  const base = { unidadDeTrabajo, documentos, consultas: new ConsultasEnMemoria(documentos), reloj: new RelojFijo() };
  const conAutorizacion = { ...base, auditoria, publicadorEventos: eventos, libroDeCompras: libro };
  recibir = new RecibirDocumento({
    unidadDeTrabajo,
    documentos,
    aplicaciones,
    cargos: documentos,
    condiciones: new CondicionesEnMemoria(),
    documentosDeCompra: new DocumentosDeCompraEnMemoria(),
    plazo: new PlazoFijo(1),
  });
  completar = new CompletarDocumentos(base);
  cambiarVencimiento = new CambiarVencimiento(base);
  autorizar = new AutorizarDocumentos(conAutorizacion);
  desautorizar = new DesautorizarDocumento(conAutorizacion);
});

const recibida = async (cambios: Partial<DocumentoParaDestino> = {}): Promise<string> => {
  const documentoId = crypto.randomUUID();
  await recibir.ejecutar(ana, {
    documentoId,
    tipo: 'factura',
    proveedorId: crypto.randomUUID(),
    documentoAfectadoId: null,
    fechaEmision: '2026-03-10',
    totalCentavos: 11200,
    retencionesCentavos: 0,
    tieneActivoFijo: false,
    ...cambios,
  });
  return documentos.documentos.find((documento) => documento.documentoId === documentoId)!.id;
};
const guardado = (id: string) => documentos.documentos.find((documento) => documento.id === id)!;
const completada = async (cambios: Partial<DocumentoParaDestino> = {}): Promise<string> => {
  const id = await recibida(cambios);
  await completar.ejecutar(ana, [{ id }]);
  return id;
};

describe('completar', () => {
  it('pasa lo pendiente a completado con quién lo completó y deja el vencimiento propuesto', async () => {
    const id = await recibida();

    const [dto] = await completar.ejecutar(beto, [{ id }]);

    expect(guardado(id)).toMatchObject({
      estado: 'registrado',
      registradoPor: beto.usuarioId,
      vencimiento: '2026-04-10',
    });
    expect(dto).toMatchObject({ estado: 'registrado', puedeAutorizar: true, puedeRegistrar: false });
  });

  it('acepta el vencimiento que el usuario confirmó', async () => {
    const id = await recibida();

    await completar.ejecutar(ana, [{ id, vencimiento: '2026-05-01' }]);

    expect(guardado(id).vencimiento).toBe('2026-05-01');
  });

  it('una nota de crédito no vence: rechaza un vencimiento y queda sin él', async () => {
    const factura = await recibida();
    const nota = await recibida({
      tipo: 'nota_de_credito',
      documentoAfectadoId: guardado(factura).documentoId,
      totalCentavos: 1000,
    });

    await expect(completar.ejecutar(ana, [{ id: nota, vencimiento: '2026-05-01' }])).rejects.toMatchObject({
      codigo: 'vencimiento_invalido',
    });
    await completar.ejecutar(ana, [{ id: nota }]);

    expect(guardado(nota)).toMatchObject({ estado: 'registrado', vencimiento: null });
  });

  it('no deja vencer un cargo antes de emitirse ni completar dos veces', async () => {
    const id = await recibida();

    await expect(completar.ejecutar(ana, [{ id, vencimiento: '2026-03-01' }])).rejects.toMatchObject({
      codigo: 'vencimiento_invalido',
    });
    await completar.ejecutar(ana, [{ id }]);
    await expect(completar.ejecutar(ana, [{ id }])).rejects.toMatchObject({ codigo: 'documento_no_pendiente' });
  });

  it('un documento que no existe responde no encontrado', async () => {
    await expect(completar.ejecutar(ana, [{ id: crypto.randomUUID() }])).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
  });
});

describe('cambiar el vencimiento', () => {
  it('lo cambia en un cargo completado y no en uno pendiente', async () => {
    const id = await recibida();
    await expect(cambiarVencimiento.ejecutar(ana, { id, vencimiento: '2026-05-01' })).rejects.toMatchObject({
      codigo: 'vencimiento_no_editable',
    });
    await completar.ejecutar(ana, [{ id }]);

    const dto = await cambiarVencimiento.ejecutar(ana, { id, vencimiento: '2026-05-01' });

    expect(dto.vencimiento).toBe('2026-05-01');
    expect(auditoria.entradas).toEqual([]);
  });
});

describe('autorizar', () => {
  it('otra persona autoriza: manda marcar_procesado a Libro de compras antes de bloquear la fila y publica el evento', async () => {
    const id = await completada();
    documentos.bitacora.length = 0;

    const [dto] = await autorizar.ejecutar(beto, { ids: [id], puedeAutorizarPropios: false });

    expect(documentos.bitacora).toEqual(['libro:procesado=true', 'bloquea-aqui']);
    expect(libro.procesados.get(guardado(id).documentoId)).toBe(true);
    expect(guardado(id)).toMatchObject({
      estado: 'autorizado',
      autorizadoPor: beto.usuarioId,
      autorizacionPropia: false,
    });
    expect(dto).toMatchObject({ estado: 'autorizado', puedeDesautorizar: true });
    expect(auditoria.entradas).toEqual([]);
    expect(eventos.publicados[0]).toMatchObject({
      nombre: 'cuentas-por-pagar.documento_autorizado',
      datos: { empresaId: ana.empresaId, documentoId: id, totalCentavos: 11200, autorizacionPropia: false },
    });
  });

  it('quien lo completó no lo autoriza sin el permiso de lo propio, y no cambia nada', async () => {
    const id = await completada();

    await expect(autorizar.ejecutar(ana, { ids: [id], puedeAutorizarPropios: false })).rejects.toMatchObject({
      codigo: 'autorizacion_de_lo_propio',
      message: expect.stringContaining('A-1'),
    });

    expect(guardado(id).estado).toBe('registrado');
    expect(eventos.publicados).toEqual([]);
  });

  it('con el permiso de lo propio sí: queda marcado y auditado con la ficha anterior', async () => {
    const id = await completada();

    await autorizar.ejecutar(ana, { ids: [id], puedeAutorizarPropios: true });

    expect(guardado(id)).toMatchObject({ estado: 'autorizado', autorizacionPropia: true });
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'cuentas-por-pagar.documentos',
        registroId: id,
        accion: 'autorizar',
        anterior: expect.objectContaining({ estado: 'registrado' }),
      }),
    ]);
    expect(eventos.publicados[0]?.datos).toMatchObject({ autorizacionPropia: true });
  });

  it('solo autoriza lo completado y no repite un id', async () => {
    const pendiente = await recibida();
    const lista = await completada();

    await expect(autorizar.ejecutar(beto, { ids: [pendiente], puedeAutorizarPropios: false })).rejects.toMatchObject({
      codigo: 'documento_no_registrado',
    });
    const dtos = await autorizar.ejecutar(beto, { ids: [lista, lista], puedeAutorizarPropios: false });

    expect(dtos).toHaveLength(1);
    expect(eventos.publicados).toHaveLength(1);
  });
});

describe('desautorizar', () => {
  const autorizada = async () => {
    const id = await completada();
    await autorizar.ejecutar(beto, { ids: [id], puedeAutorizarPropios: false });
    eventos.publicados.length = 0;
    return id;
  };

  it('vuelve a completado, devuelve el documento a pendiente en Libro de compras, lo audita y publica', async () => {
    const id = await autorizada();

    const dto = await desautorizar.ejecutar(beto, { id, motivo: '  Faltaba el cheque  ' });

    expect(dto.estado).toBe('registrado');
    expect(guardado(id)).toMatchObject({ estado: 'registrado', autorizadoPor: null, autorizacionPropia: false });
    expect(libro.procesados.get(guardado(id).documentoId)).toBe(false);
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        accion: 'devolver',
        registroId: id,
        motivo: 'Faltaba el cheque',
        anterior: expect.objectContaining({ estado: 'autorizado' }),
      }),
    ]);
    expect(eventos.publicados[0]).toMatchObject({ nombre: 'cuentas-por-pagar.documento_desautorizado' });
  });

  it('exige el motivo y que el documento esté autorizado', async () => {
    const id = await autorizada();
    const sinAutorizar = await completada();

    await expect(desautorizar.ejecutar(beto, { id, motivo: '   ' })).rejects.toMatchObject({
      codigo: 'motivo_invalido',
    });
    await expect(desautorizar.ejecutar(beto, { id: sinAutorizar, motivo: 'x' })).rejects.toMatchObject({
      codigo: 'documento_no_autorizado',
    });
    expect(guardado(id).estado).toBe('autorizado');
  });
});
