/**
 * Lo pagado, lo comprometido y el estado de pago en el DTO de un documento: las filas salen de las consultas en memoria con
 * líneas de pago sembradas (los casos de uso que pagan llegan en CP4-3).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ConsultasEnMemoria } from '../../pruebas/dobles-de-acciones.js';
import { documentoSembrado } from '../../pruebas/dobles-de-aplicaciones.js';
import { AplicacionesEnMemoria, DocumentosEnMemoria } from '../../pruebas/dobles-de-documentos.js';
import { lineaDePago } from '../../pruebas/lineas-de-pago.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import { dtoDeDocumentoPorPagar } from './dto-de-documento-por-pagar.js';

const HOY = '2026-06-01';
let documentos: DocumentosEnMemoria;
let consultas: ConsultasEnMemoria;

beforeEach(() => {
  const aplicaciones = new AplicacionesEnMemoria();
  documentos = new DocumentosEnMemoria(aplicaciones);
  consultas = new ConsultasEnMemoria(documentos, aplicaciones);
});

async function dtoDe(cambios: Partial<DocumentoPorPagar> = {}) {
  const documento = documentoSembrado({
    estado: 'autorizado',
    totalCentavos: 10000,
    retencionesCentavos: 0,
    ...cambios,
  });
  documentos.documentos.push(documento);
  return {
    documento,
    dto: async () => dtoDeDocumentoPorPagar((await consultas.buscar(documento.id))!, { usuarioId: 'u', hoy: HOY }),
  };
}

describe('pagado, comprometido y estado de pago de un cargo', () => {
  it('sin pagos queda pendiente, con todo el saldo', async () => {
    const { dto } = await dtoDe();

    expect(await dto()).toMatchObject({
      pagado: '0.00',
      comprometido: '0.00',
      estadoDePago: 'pendiente',
      saldo: '100.00',
    });
  });

  it('un pago vigente de hoy baja el saldo y lo deja pagado en parte', async () => {
    const { documento, dto } = await dtoDe();
    documentos.pagos.push(lineaDePago({ cargoId: documento.id, fecha: HOY, montoCentavos: 4000 }));

    expect(await dto()).toMatchObject({
      pagado: '40.00',
      comprometido: '0.00',
      estadoDePago: 'en_parte',
      saldo: '60.00',
    });
  });

  it('un cheque posfechado compromete el documento: el saldo ya lo resta y se paga en su fecha', async () => {
    const { documento, dto } = await dtoDe();
    documentos.pagos.push(lineaDePago({ cargoId: documento.id, fecha: '2026-06-10', montoCentavos: 10000 }));

    expect(await dto()).toMatchObject({
      pagado: '0.00',
      comprometido: '100.00',
      estadoDePago: 'comprometido',
      saldo: '0.00',
    });
    documentos.pagos[0]!.fecha = HOY;
    expect(await dto()).toMatchObject({ pagado: '100.00', comprometido: '0.00', estadoDePago: 'pagado' });
  });

  it('los pagos anulados no cuentan: ni en el saldo ni en el estado', async () => {
    const { documento, dto } = await dtoDe();
    documentos.pagos.push(lineaDePago({ cargoId: documento.id, estado: 'anulado', montoCentavos: 10000 }));

    expect(await dto()).toMatchObject({ pagado: '0.00', estadoDePago: 'pendiente', saldo: '100.00' });
  });

  it('el pago sin movimiento en Bancos (cuenta de apertura) cuenta igual', async () => {
    const { documento, dto } = await dtoDe();
    documentos.pagos.push(lineaDePago({ cargoId: documento.id, forma: 'cuenta_de_apertura', montoCentavos: 10000 }));

    expect(await dto()).toMatchObject({ estadoDePago: 'pagado', saldo: '0.00' });
  });

  it('la diferencia menor de un cargo (ajuste vigente) baja su saldo', async () => {
    const { documento, dto } = await dtoDe();
    documentos.pagos.push(lineaDePago({ cargoId: documento.id, montoCentavos: 9997 }));
    documentos.ajustes.push({
      id: 'a1',
      documentoId: documento.id,
      montoCentavos: 3,
      fecha: HOY,
      causa: 'diferencia_menor',
      motivo: 'Centavos',
      referencia: null,
      estado: 'vigente',
      motivoDeAnulacion: null,
    });

    expect(await dto()).toMatchObject({ ajustado: '0.03', saldo: '0.00', estadoDePago: 'pagado' });
  });

  it('con pagos vigentes no se desautoriza, anula ni elimina', async () => {
    const { documento, dto } = await dtoDe();
    documentos.pagos.push(lineaDePago({ cargoId: documento.id, montoCentavos: 1000 }));

    expect(await dto()).toMatchObject({ puedeDesautorizar: false, puedeAnular: false, puedeEliminar: false });
  });
});

describe('una nota de crédito con reintegros', () => {
  it('el reintegro vigente baja su saldo libre y no tiene estado de pago', async () => {
    const { documento, dto } = await dtoDe({ tipo: 'nota_de_credito', vencimiento: null, totalCentavos: 5000 });
    documentos.reintegros.push({
      reintegroId: 'r1',
      numero: 1,
      anioDeNumero: 0,
      forma: 'deposito',
      fecha: HOY,
      estado: 'vigente',
      notaId: documento.id,
      montoCentavos: 2000,
    });

    expect(await dto()).toMatchObject({
      reintegrado: '20.00',
      saldo: '30.00',
      estadoDePago: null,
      pagado: '0.00',
      puedeAnular: false,
      puedeReintegrar: true,
    });
  });

  it('un reintegro anulado no cuenta', async () => {
    const { documento, dto } = await dtoDe({ tipo: 'nota_de_credito', vencimiento: null, totalCentavos: 5000 });
    documentos.reintegros.push({
      reintegroId: 'r1',
      numero: 1,
      anioDeNumero: 0,
      forma: 'efectivo',
      fecha: HOY,
      estado: 'anulado',
      notaId: documento.id,
      montoCentavos: 2000,
    });

    expect(await dto()).toMatchObject({ reintegrado: '0.00', saldo: '50.00', puedeAnular: true });
  });
});

describe('un documento anulado', () => {
  it('no tiene estado de pago', async () => {
    const { dto } = await dtoDe({ estado: 'anulado' });

    expect((await dto()).estadoDePago).toBeNull();
  });
});
