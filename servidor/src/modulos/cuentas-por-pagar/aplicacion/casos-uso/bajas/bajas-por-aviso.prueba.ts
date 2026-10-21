import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuditoriaEnMemoria,
  PublicadorEventosEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { DocumentoParaDestino } from '../../../../core/contratos/libro-de-compras.contratos.js';
import { ReglaDeNegocioInfringida } from '../../../../core/compartido/dominio/errores.js';
import { REGLAS_PARA_ANULAR, REGLAS_PARA_ELIMINAR, type ReglaDeBaja } from '../../../dominio/reglas-de-baja.js';
import {
  AplicacionesEnMemoria,
  CondicionesEnMemoria,
  DocumentosEnMemoria,
  PlazoFijo,
} from '../../../pruebas/dobles-de-documentos.js';
import { RecibirDocumento } from '../recibir-documento.js';
import { AnularPorAviso } from './anular-por-aviso.js';
import { EliminarPorAviso } from './eliminar-por-aviso.js';

const PROVEEDOR = crypto.randomUUID();
const operador = operadorDePrueba();

let aplicaciones: AplicacionesEnMemoria;
let documentos: DocumentosEnMemoria;
let auditoria: AuditoriaEnMemoria;
let eventos: PublicadorEventosEnMemoria;
let unidadDeTrabajo: UnidadDeTrabajoEnMemoria;
let recibir: RecibirDocumento;

const crear = (reglas: { anular?: readonly ReglaDeBaja[]; eliminar?: readonly ReglaDeBaja[] } = {}) => {
  const base = { unidadDeTrabajo, documentos, aplicaciones, auditoria };
  return {
    anular: new AnularPorAviso({ ...base, publicadorEventos: eventos, reglas: reglas.anular ?? REGLAS_PARA_ANULAR }),
    eliminar: new EliminarPorAviso({ ...base, reglas: reglas.eliminar ?? REGLAS_PARA_ELIMINAR }),
  };
};

const llega = (cambios: Partial<DocumentoParaDestino> = {}): DocumentoParaDestino => ({
  documentoId: crypto.randomUUID(),
  tipo: 'factura',
  proveedorId: PROVEEDOR,
  documentoAfectadoId: null,
  fechaEmision: '2026-03-10',
  totalCentavos: 11200,
  retencionesCentavos: 0,
  tieneActivoFijo: false,
  ...cambios,
});
const recibida = async (cambios: Partial<DocumentoParaDestino> = {}) => {
  const documento = llega(cambios);
  await recibir.ejecutar(operador, documento);
  return documento;
};
const guardadoDe = (documentoId: string) => documentos.documentos.find((d) => d.documentoId === documentoId);
const aviso = (documentoId: string, motivo = 'Error de captura') => ({
  documentoId,
  destino: 'cuentas-por-pagar',
  motivo,
});

beforeEach(() => {
  aplicaciones = new AplicacionesEnMemoria();
  documentos = new DocumentosEnMemoria(aplicaciones);
  auditoria = new AuditoriaEnMemoria();
  eventos = new PublicadorEventosEnMemoria();
  unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  recibir = new RecibirDocumento({
    unidadDeTrabajo,
    documentos,
    aplicaciones,
    cargos: documentos,
    condiciones: new CondicionesEnMemoria(),
    plazo: new PlazoFijo(1),
  });
});

describe('anular por aviso de Libro de compras', () => {
  it('deja el documento anulado con quién y por qué, lo audita como estaba y publica el evento', async () => {
    const factura = await recibida();
    const { id } = guardadoDe(factura.documentoId)!;

    await crear().anular.ejecutar(operador, aviso(factura.documentoId, 'Duplicada'));

    expect(guardadoDe(factura.documentoId)?.estado).toBe('anulado');
    expect(documentos.anulaciones).toEqual([
      { id, anuladoPor: operador.usuarioId, motivo: 'Duplicada', estabaAutorizado: false },
    ]);
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'cuentas-por-pagar.documentos',
        registroId: id,
        accion: 'anular',
        motivo: 'Duplicada',
        anterior: expect.objectContaining({ id, estado: 'pendiente', total: '112.00', aplicacionesRecibidas: [] }),
      }),
    ]);
    expect(eventos.publicados[0]).toMatchObject({
      nombre: 'cuentas-por-pagar.documento_anulado',
      datos: { empresaId: operador.empresaId, documentoId: id, documentoDeCompraId: factura.documentoId },
    });
  });

  it('un documento autorizado se anula y el evento dice que estaba autorizado', async () => {
    const factura = await recibida();
    guardadoDe(factura.documentoId)!.estado = 'autorizado';

    await crear().anular.ejecutar(operador, aviso(factura.documentoId));

    expect(documentos.anulaciones[0]?.estabaAutorizado).toBe(true);
    expect(eventos.publicados[0]?.datos).toMatchObject({ estabaAutorizado: true });
  });

  it('anular una nota de crédito borra sus aplicaciones: lo aplicado vuelve al saldo de la factura', async () => {
    const factura = await recibida();
    const nota = await recibida({
      tipo: 'nota_de_credito',
      documentoAfectadoId: factura.documentoId,
      totalCentavos: 3000,
    });
    const notaGuardada = guardadoDe(nota.documentoId)!;
    expect(documentos.saldoDe(guardadoDe(factura.documentoId)!)).toBe(8200);

    await crear().anular.ejecutar(operador, aviso(nota.documentoId));

    expect(documentos.saldoDe(guardadoDe(factura.documentoId)!)).toBe(11200);
    expect(auditoria.entradas[0]?.anterior).toMatchObject({
      aplicacionesHechas: [{ notaId: notaGuardada.id, monto: '30.00' }],
    });
  });

  it('anular una nota de débito con notas aplicadas devuelve lo aplicado al saldo libre de esas notas', async () => {
    const factura = await recibida({ totalCentavos: 10000 });
    const debito = await recibida({
      tipo: 'nota_de_debito',
      documentoAfectadoId: factura.documentoId,
      totalCentavos: 500,
    });
    const nota = await recibida({
      tipo: 'nota_de_credito',
      documentoAfectadoId: factura.documentoId,
      totalCentavos: 10300,
    });
    const notaGuardada = guardadoDe(nota.documentoId)!;
    expect(aplicaciones.saldoLibreDe(notaGuardada)).toBe(0);

    await crear().anular.ejecutar(operador, aviso(debito.documentoId));

    expect(aplicaciones.saldoLibreDe(notaGuardada)).toBe(300);
  });

  it('es idempotente: sin documento aquí o ya anulado, no hace nada más', async () => {
    const factura = await recibida();
    const { anular } = crear();

    await anular.ejecutar(operador, aviso(crypto.randomUUID()));
    await anular.ejecutar(operador, aviso(factura.documentoId));
    await anular.ejecutar(operador, aviso(factura.documentoId));

    expect(documentos.anulaciones).toHaveLength(1);
    expect(auditoria.entradas).toHaveLength(1);
    expect(eventos.publicados).toHaveLength(1);
  });

  it('ignora los avisos de documentos que van a otro destino', async () => {
    const factura = await recibida();

    await crear().anular.ejecutar(operador, { ...aviso(factura.documentoId), destino: 'caja-chica' });

    expect(guardadoDe(factura.documentoId)?.estado).toBe('pendiente');
    expect(auditoria.entradas).toEqual([]);
  });

  it('si una regla de baja lo rechaza, no cambia nada y no publica', async () => {
    const factura = await recibida();
    await recibida({ tipo: 'nota_de_credito', documentoAfectadoId: factura.documentoId, totalCentavos: 3000 });

    const rechazo = crear().anular.ejecutar(operador, aviso(factura.documentoId));

    await expect(rechazo).rejects.toMatchObject({ codigo: 'cargo_con_notas_aplicadas' });
    expect(guardadoDe(factura.documentoId)?.estado).toBe('pendiente');
    expect(auditoria.entradas).toEqual([]);
    expect(eventos.publicados).toEqual([]);
  });

  it('las reglas se amplían desde la composición: una regla nueva también rechaza', async () => {
    class DocumentoEnContrasena extends ReglaDeNegocioInfringida {
      readonly codigo = 'documento_en_contrasena';
    }
    const factura = await recibida();
    const enContrasena: ReglaDeBaja = () => {
      throw new DocumentoEnContrasena('Está en una contraseña.');
    };

    const rechazo = crear({ anular: [...REGLAS_PARA_ANULAR, enContrasena] }).anular.ejecutar(
      operador,
      aviso(factura.documentoId),
    );

    await expect(rechazo).rejects.toMatchObject({ codigo: 'documento_en_contrasena' });
  });
});

describe('eliminar por aviso de Libro de compras', () => {
  it('borra el documento pendiente y lo audita como estaba', async () => {
    const factura = await recibida();
    const { id } = guardadoDe(factura.documentoId)!;

    await crear().eliminar.ejecutar(operador, { documentoId: factura.documentoId, destino: 'cuentas-por-pagar' });

    expect(guardadoDe(factura.documentoId)).toBeUndefined();
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'cuentas-por-pagar.documentos',
        registroId: id,
        accion: 'eliminar',
        anterior: expect.objectContaining({ id, estado: 'pendiente' }),
      }),
    ]);
    expect(eventos.publicados).toEqual([]);
  });

  it('un documento autorizado no se elimina: lo rechaza y deja todo como estaba', async () => {
    const factura = await recibida();
    guardadoDe(factura.documentoId)!.estado = 'autorizado';

    const rechazo = crear().eliminar.ejecutar(operador, {
      documentoId: factura.documentoId,
      destino: 'cuentas-por-pagar',
    });

    await expect(rechazo).rejects.toMatchObject({ codigo: 'documento_autorizado' });
    expect(guardadoDe(factura.documentoId)).toBeDefined();
    expect(auditoria.entradas).toEqual([]);
  });

  it('eliminar una nota de crédito se lleva sus aplicaciones', async () => {
    const factura = await recibida();
    const nota = await recibida({
      tipo: 'nota_de_credito',
      documentoAfectadoId: factura.documentoId,
      totalCentavos: 3000,
    });

    await crear().eliminar.ejecutar(operador, { documentoId: nota.documentoId, destino: 'cuentas-por-pagar' });

    expect(aplicaciones.lista).toEqual([]);
    expect(documentos.saldoDe(guardadoDe(factura.documentoId)!)).toBe(11200);
  });

  it('es idempotente y ignora otros destinos', async () => {
    const factura = await recibida();
    const { eliminar } = crear();

    await eliminar.ejecutar(operador, { documentoId: factura.documentoId, destino: 'caja-chica' });
    expect(guardadoDe(factura.documentoId)).toBeDefined();
    await eliminar.ejecutar(operador, { documentoId: factura.documentoId, destino: 'cuentas-por-pagar' });
    await eliminar.ejecutar(operador, { documentoId: factura.documentoId, destino: 'cuentas-por-pagar' });

    expect(auditoria.entradas).toHaveLength(1);
  });
});
