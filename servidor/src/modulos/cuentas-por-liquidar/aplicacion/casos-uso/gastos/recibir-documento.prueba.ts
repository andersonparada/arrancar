import { beforeEach, describe, expect, it } from 'vitest';
import { documentoDelLibro } from '../../../pruebas/dobles-de-gastos.js';
import { operador, prepararEscenarioDeGastos } from '../../../pruebas/escenario-de-gastos.js';

let e: Awaited<ReturnType<typeof prepararEscenarioDeGastos>>;

beforeEach(async () => {
  e = await prepararEscenarioDeGastos();
});

const guardado = (documentoId: string) => e.gastos.delDocumento(documentoId);

describe('recibir un documento del libro', () => {
  it('sin referencia queda en la bandeja, con el neto y sin avisos', async () => {
    const documento = documentoDelLibro({ retencionesCentavos: 0 });

    const respuesta = await e.recibir.ejecutar(operador, documento);

    expect(respuesta.avisos).toEqual([]);
    expect(await guardado(documento.documentoId)).toMatchObject({
      anticipoId: null,
      clase: 'documento',
      montoCentavos: 56_000,
      montoRetenidoCentavos: 0,
      conRetencion: false,
      fecha: '2026-11-12',
    });
    expect(e.publicadorEventos.publicados).toEqual([]);
  });

  it('con la referencia de un anticipo abierto lo asigna y publica el evento', async () => {
    const documento = documentoDelLibro({ referenciaDeDestino: e.anticipoId });

    const respuesta = await e.recibir.ejecutar(operador, documento);

    expect(respuesta.avisos).toEqual([]);
    expect(await guardado(documento.documentoId)).toMatchObject({
      anticipoId: e.anticipoId,
      asignadoPor: operador.usuarioId,
      fecha: '2026-11-12',
    });
    expect(e.publicadorEventos.nombres()).toEqual(['cuentas-por-liquidar.gasto_asignado']);
    expect(e.auditoria.entradas).toEqual([]);
  });

  it('una factura con retención no se rechaza: queda en la bandeja con el aviso, aunque traiga referencia', async () => {
    const documento = documentoDelLibro({
      retencionesCentavos: 9_000,
      referenciaDeDestino: e.anticipoId,
    });

    const respuesta = await e.recibir.ejecutar(operador, documento);

    expect(respuesta.avisos).toHaveLength(1);
    expect(respuesta.avisos[0]).toContain('Quedó en la bandeja de Cuentas por liquidar: lleva retención de Q90.00');
    expect(await guardado(documento.documentoId)).toMatchObject({
      anticipoId: null,
      montoCentavos: 47_000,
      montoRetenidoCentavos: 9_000,
      conRetencion: true,
      motivoConRetencion: null,
    });
    expect(e.publicadorEventos.publicados).toEqual([]);
    expect(e.auditoria.entradas).toEqual([]);
  });

  it.each([
    ['una referencia que no es un anticipo', 'no-es-uuid', 'la referencia no es un anticipo'],
    ['un anticipo que no existe', crypto.randomUUID(), 'El anticipo no existe'],
  ])('con %s queda en la bandeja y lo explica', async (_nombre, referenciaDeDestino, motivo) => {
    const documento = documentoDelLibro({ referenciaDeDestino });

    const respuesta = await e.recibir.ejecutar(operador, documento);

    expect(respuesta.avisos[0]).toContain(`Quedó en la bandeja de Cuentas por liquidar: ${motivo}`);
    expect((await guardado(documento.documentoId))?.anticipoId).toBeNull();
  });

  it('con un anticipo liquidado o una fecha fuera del anticipo queda en la bandeja con el porqué', async () => {
    const anterior = documentoDelLibro({ referenciaDeDestino: e.anticipoId, fechaEmision: '2026-11-01' });
    const respuestaDeFecha = await e.recibir.ejecutar(operador, anterior);
    e.cambiarElAnticipo({ estado: 'liquidado' });
    const posterior = documentoDelLibro({ referenciaDeDestino: e.anticipoId });

    const respuestaDeEstado = await e.recibir.ejecutar(operador, posterior);

    expect(respuestaDeFecha.avisos[0]).toContain('anterior a la entrega del anticipo');
    expect(respuestaDeEstado.avisos[0]).toContain('está liquidado');
    expect((await guardado(anterior.documentoId))?.anticipoId).toBeNull();
    expect((await guardado(posterior.documentoId))?.anticipoId).toBeNull();
  });

  it('al asignar por referencia suma los avisos de bancarización y de fuera del libro', async () => {
    e.bancarizacion.respuesta = {
      resultado: 'avisar',
      mensaje: 'Bancarización: el pago llega a Q30,500.00.',
      efecto: null,
      pagadoEnElMesCentavos: 0,
    };
    const documento = documentoDelLibro({ referenciaDeDestino: e.anticipoId });
    e.documentos.porDocumento.set(documento.documentoId, { motivoFueraDelLibro: 'sin_fel' });

    const respuesta = await e.recibir.ejecutar(operador, documento);

    expect(respuesta.avisos).toEqual([
      'Bancarización: el pago llega a Q30,500.00.',
      'No da crédito fiscal ni es deducible: no tiene factura electrónica (FEL).',
    ]);
  });

  it('el mismo documento dos veces se rechaza', async () => {
    const documento = documentoDelLibro();
    await e.recibir.ejecutar(operador, documento);

    await expect(e.recibir.ejecutar(operador, documento)).rejects.toMatchObject({
      codigo: 'documento_ya_recibido_en_anticipos',
    });
  });

  it('una nota de crédito resta, y sin su factura aquí se rechaza', async () => {
    const factura = documentoDelLibro();
    await e.recibir.ejecutar(operador, factura);

    const nota = documentoDelLibro({ tipo: 'nota_de_credito', documentoAfectadoId: factura.documentoId });
    await e.recibir.ejecutar(operador, nota);
    const huerfana = documentoDelLibro({ tipo: 'nota_de_credito', documentoAfectadoId: crypto.randomUUID() });

    expect((await guardado(nota.documentoId))?.resta).toBe(true);
    await expect(e.recibir.ejecutar(operador, huerfana)).rejects.toMatchObject({
      codigo: 'factura_de_la_nota_no_recibida_en_anticipos',
    });
  });
});
