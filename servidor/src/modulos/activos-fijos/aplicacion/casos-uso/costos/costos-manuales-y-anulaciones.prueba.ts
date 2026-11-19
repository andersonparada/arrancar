import { beforeEach, describe, expect, it } from 'vitest';
import {
  CostoDeActivoNegativo,
  CostoInvalido,
  CostoNoAnulable,
  DocumentoConCostosCapitalizados,
} from '../../../dominio/errores-de-costo.js';
import {
  activoNuevo,
  armarCostos,
  asignacion,
  lineaDePrueba,
  operador,
  type EscenarioDeCostos,
} from '../../../pruebas/escenario-de-costos.soporte.js';
import type { SolicitudDeCostoManual } from '../../dto/costo.dto.js';

let e: EscenarioDeCostos;
let activoId: string;

const manual = (cambios: Partial<SolicitudDeCostoManual> = {}): SolicitudDeCostoManual => ({
  claseDeCosto: 'importacion',
  fecha: '2026-11-05',
  montoCentavos: 250_000,
  documentoDeSoporte: 'DUCA 26-0000123',
  descripcion: null,
  aplicaAlLibroFiscal: true,
  motivoFueraDelLibroFiscal: null,
  noEsEdificacion: false,
  ...cambios,
});

beforeEach(async () => {
  e = await armarCostos();
  const linea = lineaDePrueba();
  e.lineas.sembrar(linea);
  const creado = await e.capitalizar.ejecutar(operador, {
    asignaciones: [asignacion(linea.lineaId, 100_000, { activoNuevo: activoNuevo(e.claseId) })],
  });
  activoId = creado.activos[0]!.id;
  e.publicador.publicados.length = 0;
});

describe('costo manual', () => {
  it('suma un costo con su soporte, sin línea del libro, y publica el evento', async () => {
    const costo = await e.registrarManual.ejecutar(operador, { activoId, solicitud: manual() });

    expect(costo).toMatchObject({
      origen: 'manual',
      claseDeCosto: 'importacion',
      monto: '2500.00',
      documentoDeSoporte: 'DUCA 26-0000123',
      lineaDeDocumentoId: null,
      estado: 'vigente',
    });
    expect(e.publicador.nombres()).toEqual(['activos-fijos.activo_capitalizado']);
  });

  it('fuera del libro fiscal con su motivo (V-8); sin motivo se rechaza', async () => {
    const fuera = await e.registrarManual.ejecutar(operador, {
      activoId,
      solicitud: manual({ aplicaAlLibroFiscal: false, motivoFueraDelLibroFiscal: 'Costo de desmantelamiento' }),
    });

    expect(fuera).toMatchObject({ aplicaAlLibroFiscal: false, motivoFueraDelLibroFiscal: 'Costo de desmantelamiento' });
    await expect(
      e.registrarManual.ejecutar(operador, { activoId, solicitud: manual({ aplicaAlLibroFiscal: false }) }),
    ).rejects.toBeInstanceOf(CostoInvalido);
  });

  it('sin soporte, con fecha futura o «no es edificación» en un activo que no es edificio se rechaza', async () => {
    const pedir = (solicitud: SolicitudDeCostoManual) => e.registrarManual.ejecutar(operador, { activoId, solicitud });

    await expect(pedir(manual({ documentoDeSoporte: ' ' }))).rejects.toBeInstanceOf(CostoInvalido);
    await expect(pedir(manual({ fecha: '2026-11-19' }))).rejects.toBeInstanceOf(CostoInvalido);
    await expect(pedir(manual({ noEsEdificacion: true }))).rejects.toBeInstanceOf(CostoInvalido);
  });

  it('el activo debe existir', async () => {
    await expect(
      e.registrarManual.ejecutar(operador, { activoId: crypto.randomUUID(), solicitud: manual() }),
    ).rejects.toMatchObject({ codigo: 'no_encontrado' });
  });
});

describe('anular un costo', () => {
  it('queda anulado con su motivo, en la auditoría con cómo estaba, y publica el evento', async () => {
    const costo = await e.registrarManual.ejecutar(operador, { activoId, solicitud: manual() });
    e.publicador.publicados.length = 0;

    const anulado = await e.anular.ejecutar(operador, { costoId: costo.id, motivo: 'Se capturó dos veces' });

    expect(anulado).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Se capturó dos veces' });
    expect(e.auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'activos-fijos.costos',
        accion: 'anular',
        registroId: costo.id,
        motivo: 'Se capturó dos veces',
        anterior: expect.objectContaining({ monto: '2500.00', estado: 'vigente' }),
      }),
    ]);
    expect(e.publicador.nombres()).toEqual(['activos-fijos.costo_anulado']);
    expect((await e.costos.deActivo(activoId)).total).toBe('1000.00');
  });

  it('un costo de línea toma el candado de su línea', async () => {
    const delLibro = [...e.costos.registros.values()].find((c) => c.instantanea().lineaDeDocumentoId)!.instantanea();
    e.costos.lineasBloqueadas.length = 0;

    await e.anular.ejecutar(operador, { costoId: delLibro.id.valor, motivo: 'Error' });

    expect(e.costos.lineasBloqueadas).toEqual([delLibro.lineaDeDocumentoId]);
  });

  it('no se anula dos veces ni sin motivo, y uno que no existe es un recurso no encontrado', async () => {
    const costo = await e.registrarManual.ejecutar(operador, { activoId, solicitud: manual() });
    await e.anular.ejecutar(operador, { costoId: costo.id, motivo: 'Error' });

    await expect(e.anular.ejecutar(operador, { costoId: costo.id, motivo: 'Otra vez' })).rejects.toBeInstanceOf(
      CostoNoAnulable,
    );
    const otro = await e.registrarManual.ejecutar(operador, { activoId, solicitud: manual() });
    await expect(e.anular.ejecutar(operador, { costoId: otro.id, motivo: ' ' })).rejects.toBeInstanceOf(CostoInvalido);
    await expect(e.anular.ejecutar(operador, { costoId: crypto.randomUUID(), motivo: 'x' })).rejects.toMatchObject({
      codigo: 'no_encontrado',
    });
  });

  it('no deja el costo del activo negativo: anular la compra con una nota de crédito vigente', async () => {
    const nota = lineaDePrueba({ tipoDeDocumento: 'nota_de_credito', costoCentavos: 60_000 });
    e.lineas.sembrar(nota);
    await e.capitalizar.ejecutar(operador, { asignaciones: [asignacion(nota.lineaId, -60_000, { activoId })] });
    const compra = [...e.costos.registros.values()].find((c) => c.instantanea().montoCentavos === 100_000)!;

    await expect(
      e.anular.ejecutar(operador, { costoId: compra.id.valor, motivo: 'Error de captura' }),
    ).rejects.toBeInstanceOf(CostoDeActivoNegativo);
  });
});

describe('avisos del libro (R-1)', () => {
  it('un documento con costos vigentes no se anula ni se elimina: el error lista los activos', async () => {
    const delLibro = [...e.costos.registros.values()][0]!.instantanea();

    const error = await e.rechazar
      .ejecutar(operador, { documentoId: delLibro.documentoDeCompraId! })
      .catch((f: unknown) => f);

    expect(error).toBeInstanceOf(DocumentoConCostosCapitalizados);
    expect((error as DocumentoConCostosCapitalizados).detalles).toEqual({ activos: ['AF-0001'] });
  });

  it('con los costos anulados, o sin costos, el documento pasa', async () => {
    const delLibro = [...e.costos.registros.values()][0]!;
    await e.anular.ejecutar(operador, { costoId: delLibro.id.valor, motivo: 'Error' });

    await expect(
      e.rechazar.ejecutar(operador, { documentoId: delLibro.instantanea().documentoDeCompraId! }),
    ).resolves.toBeUndefined();
    await expect(e.rechazar.ejecutar(operador, { documentoId: crypto.randomUUID() })).resolves.toBeUndefined();
  });
});
