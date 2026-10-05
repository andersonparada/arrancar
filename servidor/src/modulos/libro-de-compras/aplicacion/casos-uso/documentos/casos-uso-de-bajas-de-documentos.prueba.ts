import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { ReglaDeNegocioInfringida } from '../../../../core/compartido/dominio/errores.js';
import {
  DocumentoConNotas,
  DocumentoConNotasVigentes,
  DocumentoProcesadoEnElDestino,
  DocumentoYaAnulado,
  MotivoDeAnulacionInvalido,
} from '../../../dominio/errores-de-baja.js';
import { crearEscenario, operador, solicitud } from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import { AnularDocumento } from './anular-documento.js';
import { EliminarDocumento } from './eliminar-documento.js';
import { MarcarDocumentoProcesado } from './marcar-documento-procesado.js';
import { ObtenerDocumento } from './consultar-documentos.js';
import { RegistrarDocumento } from './registrar-documento.js';

class DestinoRechaza extends ReglaDeNegocioInfringida {
  readonly codigo = 'destino_rechaza';
}

let e = crearEscenario();
let documentoId = '';
const bajas = () => ({ ...e.dependencias, repositorio: e.guardados });
const anular = (motivo = 'Se registró dos veces', origen?: 'cuentas-por-pagar') =>
  new AnularDocumento(bajas()).ejecutar(operador, { documentoId, motivo, origen });
const eliminar = (origen?: 'cuentas-por-pagar') =>
  new EliminarDocumento(bajas()).ejecutar(operador, { documentoId, origen });

beforeEach(async () => {
  e = crearEscenario();
  await new RegistrarDocumento(e.dependencias).ejecutar(operador, {
    solicitud: solicitud(),
    puedeAjustarRetenciones: false,
  });
  const documento = e.repositorio.agregados[0]!;
  documentoId = documento.id;
  e.guardados.sembrar(documento);
  e.publicadorEventos.publicados.length = 0;
});

describe('anular un documento', () => {
  it('avisa al destino antes, lo deja anulado con su motivo y usuario, lo audita y publica el evento', async () => {
    const ficha = await anular('  Se registró dos veces ');

    expect(e.destinos.avisosDeAnular).toEqual([
      { documentoId, destino: 'cuentas-por-pagar', motivo: 'Se registró dos veces' },
    ]);
    expect(ficha).toMatchObject({
      estado: 'anulado',
      motivoDeAnulacion: 'Se registró dos veces',
      anuladoPor: operador.usuarioId,
      puedeAnular: false,
      puedeEliminar: false,
    });
    expect(ficha.anuladoEn).not.toBeNull();
    expect(e.control.consultados.at(-1)).toBe(ficha.periodo);
    expect(e.publicadorEventos.nombres()).toEqual(['libro-de-compras.documento_anulado']);
  });

  it('audita la anulación con la ficha tal como estaba y el motivo', async () => {
    await anular('Duplicada');

    expect(e.auditoria.entradas).toHaveLength(1);
    expect(e.auditoria.entradas[0]).toMatchObject({
      recurso: 'libro-de-compras.documentos',
      registroId: documentoId,
      accion: 'anular',
      motivo: 'Duplicada',
      anterior: { id: documentoId, estado: 'vigente', numero: '1', lineas: [expect.anything()] },
    });
  });

  it('sin motivo no se anula ni se avisa', async () => {
    await expect(anular('   ')).rejects.toBeInstanceOf(MotivoDeAnulacionInvalido);

    expect(e.destinos.avisosDeAnular).toHaveLength(0);
    expect(e.guardados.filas.get(documentoId)?.estado).toBe('vigente');
  });

  it('uno que no existe responde que no existe', async () => {
    documentoId = crypto.randomUUID();

    await expect(anular()).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });

  it('no se anula dos veces', async () => {
    await anular();

    await expect(anular()).rejects.toBeInstanceOf(DocumentoYaAnulado);
  });

  it('una factura con notas vigentes no se anula; con solo notas anuladas, sí', async () => {
    e.guardados.agregarNota(documentoId, 'vigente');
    await expect(anular()).rejects.toBeInstanceOf(DocumentoConNotasVigentes);
    expect(e.destinos.avisosDeAnular).toHaveLength(0);

    e.guardados.filas.get(documentoId)!.notas[0]!.estado = 'anulado';
    expect((await anular()).estado).toBe('anulado');
  });

  it('si el destino lo rechaza, no cambia nada, no audita y no publica', async () => {
    e.destinos.falloAlAnular = new DestinoRechaza('El destino ya pagó este documento.');

    await expect(anular()).rejects.toBeInstanceOf(DestinoRechaza);

    expect(e.guardados.filas.get(documentoId)?.estado).toBe('vigente');
    expect(e.auditoria.entradas).toHaveLength(0);
    expect(e.publicadorEventos.publicados).toHaveLength(0);
  });

  it('si lo pide el propio destino, no se le devuelve el aviso', async () => {
    await anular('Lo anuló el destino', 'cuentas-por-pagar');

    expect(e.destinos.avisosDeAnular).toHaveLength(0);
    expect(e.guardados.filas.get(documentoId)?.estado).toBe('anulado');
    expect(e.publicadorEventos.nombres()).toEqual(['libro-de-compras.documento_anulado']);
  });

  it('un procesado en el destino también se anula', async () => {
    e.guardados.filas.get(documentoId)!.procesadoEnDestinoEn = new Date();

    expect((await anular()).estado).toBe('anulado');
  });
});

describe('eliminar un documento', () => {
  it('lo limpio se avisa al destino, se audita con su ficha, se borra y se publica', async () => {
    await eliminar();

    expect(e.destinos.avisosDeEliminar).toEqual([{ documentoId, destino: 'cuentas-por-pagar' }]);
    expect(e.guardados.eliminados).toEqual([documentoId]);
    expect(e.auditoria.entradas).toMatchObject([
      { recurso: 'libro-de-compras.documentos', registroId: documentoId, accion: 'eliminar' },
    ]);
    expect(e.auditoria.entradas[0]?.anterior).toMatchObject({ id: documentoId, estado: 'vigente' });
    expect(e.publicadorEventos.nombres()).toEqual(['libro-de-compras.documento_eliminado']);
  });

  it('uno procesado en el destino no se elimina', async () => {
    e.guardados.filas.get(documentoId)!.procesadoEnDestinoEn = new Date();

    await expect(eliminar()).rejects.toBeInstanceOf(DocumentoProcesadoEnElDestino);

    expect(e.guardados.eliminados).toHaveLength(0);
    expect(e.destinos.avisosDeEliminar).toHaveLength(0);
  });

  it('una factura con notas, aunque estén anuladas, no se elimina', async () => {
    e.guardados.agregarNota(documentoId, 'anulado');

    await expect(eliminar()).rejects.toBeInstanceOf(DocumentoConNotas);
  });

  it('uno anulado no se elimina: queda como rastro', async () => {
    await anular();

    await expect(eliminar()).rejects.toBeInstanceOf(DocumentoYaAnulado);
  });

  it('si el destino lo rechaza, no se borra, no se audita y no se publica', async () => {
    e.destinos.falloAlEliminar = new DestinoRechaza('El destino no lo suelta.');

    await expect(eliminar()).rejects.toBeInstanceOf(DestinoRechaza);

    expect(e.guardados.eliminados).toHaveLength(0);
    expect(e.auditoria.entradas).toHaveLength(0);
    expect(e.publicadorEventos.publicados).toHaveLength(0);
  });

  it('si lo pide el propio destino, no se le devuelve el aviso', async () => {
    await eliminar('cuentas-por-pagar');

    expect(e.destinos.avisosDeEliminar).toHaveLength(0);
    expect(e.guardados.eliminados).toEqual([documentoId]);
  });
});

describe('marcar un documento como procesado', () => {
  const marcar = (procesado: boolean) =>
    new MarcarDocumentoProcesado(bajas()).ejecutar(operador, { documentoId, procesado });

  it('lo fija y lo limpia', async () => {
    await marcar(true);
    expect(e.guardados.filas.get(documentoId)?.procesadoEnDestinoEn).toBeInstanceOf(Date);

    await marcar(false);
    expect(e.guardados.filas.get(documentoId)?.procesadoEnDestinoEn).toBeNull();
  });

  it('uno anulado no se marca como procesado, pero devolverlo a pendiente no hace nada', async () => {
    await anular();

    await expect(marcar(true)).rejects.toBeInstanceOf(DocumentoYaAnulado);
    await expect(marcar(false)).resolves.toBeUndefined();
  });

  it('uno que no existe responde que no existe', async () => {
    documentoId = crypto.randomUUID();

    await expect(marcar(true)).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });
});

describe('la ficha', () => {
  it('trae el documento, su estado y lo que se puede hacer con él', async () => {
    e.guardados.agregarNota(documentoId, 'vigente');

    const ficha = await new ObtenerDocumento(bajas()).ejecutar(operador, documentoId);

    expect(ficha).toMatchObject({ id: documentoId, estado: 'vigente', puedeAnular: false, puedeEliminar: false });
    expect(ficha.notas).toEqual([expect.objectContaining({ estado: 'vigente', total: '50.00' })]);
  });
});
