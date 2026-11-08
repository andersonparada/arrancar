import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuditoriaEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ReglaDeNegocioInfringida } from '../../../../core/compartido/dominio/errores.js';
import type { DocumentoParaDestino } from '../../../../core/contratos/libro-de-compras.contratos.js';
import { ConsultasEnMemoria, LibroDeComprasEnMemoria } from '../../../pruebas/dobles-de-acciones.js';
import {
  AplicacionesEnMemoria,
  CondicionesEnMemoria,
  DocumentosEnMemoria,
  PlazoFijo,
} from '../../../pruebas/dobles-de-documentos.js';
import { RecibirDocumento } from '../recibir-documento.js';
import { AnularDocumento } from './anular-documento.js';
import { EliminarDocumento } from './eliminar-documento.js';

const operador = operadorDePrueba();

class LibroRechaza extends ReglaDeNegocioInfringida {
  readonly codigo = 'libro_rechaza';
}

let aplicaciones: AplicacionesEnMemoria;
let documentos: DocumentosEnMemoria;
let auditoria: AuditoriaEnMemoria;
let eventos: PublicadorEventosEnMemoria;
let libro: LibroDeComprasEnMemoria;
let recibir: RecibirDocumento;
let anular: AnularDocumento;
let eliminar: EliminarDocumento;

beforeEach(() => {
  aplicaciones = new AplicacionesEnMemoria();
  documentos = new DocumentosEnMemoria(aplicaciones);
  auditoria = new AuditoriaEnMemoria();
  eventos = new PublicadorEventosEnMemoria();
  libro = new LibroDeComprasEnMemoria(documentos.bitacora);
  const unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  const dependencias = {
    unidadDeTrabajo,
    documentos,
    aplicaciones,
    auditoria,
    consultas: new ConsultasEnMemoria(documentos),
    reloj: new RelojFijo(),
    publicadorEventos: eventos,
    libroDeCompras: libro,
    documentosDeCompra: libro,
  };
  recibir = new RecibirDocumento({
    unidadDeTrabajo,
    documentos,
    aplicaciones,
    cargos: documentos,
    condiciones: new CondicionesEnMemoria(),
    documentosDeCompra: libro,
    plazo: new PlazoFijo(1),
  });
  anular = new AnularDocumento(dependencias);
  eliminar = new EliminarDocumento(dependencias);
});

const recibida = async (cambios: Partial<DocumentoParaDestino> = {}) => {
  const documentoId = crypto.randomUUID();
  await recibir.ejecutar(operador, {
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
  return documentos.documentos.find((documento) => documento.documentoId === documentoId)!;
};
const pedido = (id: string, motivo = ' Duplicada ') => ({ id, causa: 'error_de_captura' as const, motivo });

describe('anular desde Cuentas por pagar', () => {
  it('devuelve en la respuesta los avisos que da Libro de compras', async () => {
    const factura = await recibida();
    libro.avisosAlAnular = ['Queda 1 retención por resolver.'];

    const dto = await anular.ejecutar(operador, pedido(factura.id));

    expect(dto.avisos).toEqual(['Queda 1 retención por resolver.']);
  });

  it('manda la orden a Libro de compras antes de bloquear, anula, audita como estaba y publica', async () => {
    const factura = await recibida();
    documentos.bitacora.length = 0;

    const dto = await anular.ejecutar(operador, pedido(factura.id));

    expect(documentos.bitacora).toEqual(['libro:anular', 'bloquea-aqui']);
    expect(libro.anulaciones).toEqual([
      { documentoId: factura.documentoId, causa: 'error_de_captura', motivo: 'Duplicada' },
    ]);
    expect(dto.estado).toBe('anulado');
    expect(auditoria.entradas[0]).toMatchObject({ accion: 'anular', registroId: factura.id, motivo: 'Duplicada' });
    expect(eventos.publicados[0]).toMatchObject({
      nombre: 'cuentas-por-pagar.documento_anulado',
      datos: { documentoId: factura.id, estabaAutorizado: false },
    });
  });

  it('un documento autorizado se anula y el evento dice que estaba autorizado', async () => {
    const factura = await recibida();
    factura.estado = 'autorizado';

    await anular.ejecutar(operador, pedido(factura.id));

    expect(eventos.publicados[0]?.datos).toMatchObject({ estabaAutorizado: true });
  });

  it('anular una nota de crédito borra sus aplicaciones', async () => {
    const factura = await recibida();
    const nota = await recibida({
      tipo: 'nota_de_credito',
      documentoAfectadoId: factura.documentoId,
      totalCentavos: 3000,
    });
    expect(documentos.saldoDe(factura)).toBe(8200);

    await anular.ejecutar(operador, pedido(nota.id));

    expect(documentos.saldoDe(factura)).toBe(11200);
  });

  it('no anula lo ya anulado, ni una factura con notas vigentes, ni sin motivo', async () => {
    const factura = await recibida();
    await recibida({ tipo: 'nota_de_credito', documentoAfectadoId: factura.documentoId, totalCentavos: 1000 });
    const otra = await recibida();
    await anular.ejecutar(operador, pedido(otra.id));

    await expect(anular.ejecutar(operador, pedido(otra.id))).rejects.toMatchObject({ codigo: 'documento_ya_anulado' });
    await expect(anular.ejecutar(operador, pedido(factura.id))).rejects.toMatchObject({
      codigo: 'documento_con_notas_vigentes',
    });
    await expect(anular.ejecutar(operador, pedido(factura.id, '  '))).rejects.toMatchObject({
      codigo: 'motivo_invalido',
    });
    expect(libro.anulaciones).toHaveLength(1);
  });

  it('si Libro de compras rechaza, no cambia nada aquí ni publica', async () => {
    const factura = await recibida();
    libro.rechazo = new LibroRechaza('El período está declarado.');

    await expect(anular.ejecutar(operador, pedido(factura.id))).rejects.toMatchObject({ codigo: 'libro_rechaza' });

    expect(factura.estado).toBe('pendiente');
    expect(auditoria.entradas).toEqual([]);
    expect(eventos.publicados).toEqual([]);
  });
});

describe('eliminar desde Cuentas por pagar', () => {
  it('lee primero Libro de compras, borra aquí, audita como estaba y después ordena eliminar allá', async () => {
    const factura = await recibida();
    documentos.bitacora.length = 0;

    await eliminar.ejecutar(operador, factura.id);

    expect(documentos.bitacora).toEqual(['libro:bloquea', 'bloquea-aqui', 'libro:eliminar']);
    expect(documentos.documentos).toEqual([]);
    expect(libro.eliminados).toEqual([factura.documentoId]);
    expect(auditoria.entradas[0]).toMatchObject({ accion: 'eliminar', registroId: factura.id });
    expect(eventos.publicados).toEqual([]);
  });

  it('eliminar una nota de crédito pendiente borra sus aplicaciones y devuelve el saldo a la factura', async () => {
    const factura = await recibida();
    const nota = await recibida({
      tipo: 'nota_de_credito',
      documentoAfectadoId: factura.documentoId,
      totalCentavos: 3000,
    });

    await eliminar.ejecutar(operador, nota.id);

    expect(documentos.saldoDe(factura)).toBe(11200);
  });

  it('no elimina lo autorizado, lo anulado ni una factura con notas', async () => {
    const autorizada = await recibida();
    autorizada.estado = 'autorizado';
    const anulada = await recibida();
    await anular.ejecutar(operador, pedido(anulada.id));
    const factura = await recibida();
    await recibida({ tipo: 'nota_de_credito', documentoAfectadoId: factura.documentoId, totalCentavos: 1000 });

    await expect(eliminar.ejecutar(operador, autorizada.id)).rejects.toMatchObject({ codigo: 'documento_autorizado' });
    await expect(eliminar.ejecutar(operador, anulada.id)).rejects.toMatchObject({ codigo: 'documento_no_eliminable' });
    await expect(eliminar.ejecutar(operador, factura.id)).rejects.toMatchObject({ codigo: 'documento_con_notas' });
    expect(libro.eliminados).toEqual([]);
  });

  it('un documento que no existe responde no encontrado', async () => {
    await expect(eliminar.ejecutar(operador, crypto.randomUUID())).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});
