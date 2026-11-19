import { beforeEach, describe, expect, it } from 'vitest';
import { LineaDescartada, LineaNoRecibible, LineaSobrerrecibida } from '../../../dominio/errores-de-recepcion.js';
import { ARTICULO, BODEGA, EscenarioDeRecepciones } from '../../../pruebas/escenario-de-recepciones.js';

let e: EscenarioDeRecepciones;

beforeEach(() => {
  e = new EscenarioDeRecepciones();
});

/** Recibe 100 lb a Q200.00 de la factura `lf` (Q200.00) y devuelve la entrada que quedó en el kardex. */
async function recibirCien(lineaId = 'lf', costoCentavos = 20_000n) {
  e.factura(lineaId, costoCentavos);
  const [documento] = await e.recibir([e.renglon(lineaId, '100', '200.00')]);
  return { documento: documento!, entradaId: documento!.renglones[0]!.movimientoId };
}

describe('RecibirLineas', () => {
  it('guarda la recepción numerada con el costo del monto, mueve las existencias y publica la entrada', async () => {
    e.factura('l1', 20_000n);

    const [documento, ...otros] = await e.recibir([e.renglon('l1', '100', '200.00')]);

    expect(otros).toEqual([]);
    expect(documento).toMatchObject({
      clase: 'recepcion_de_compra',
      numero: 1,
      documentoDeCompraId: 'doc-l1',
      bodegaId: BODEGA,
      costoTotal: '200.00',
    });
    expect(documento!.renglones[0]).toMatchObject({ cantidad: '100.0000', costoUnitario: '2.000000' });
    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(100_0000n);
    const [evento] = e.base.publicador.publicados;
    expect(evento).toMatchObject({
      nombre: 'inventarios.entrada_registrada',
      datos: {
        clase: 'recepcion_de_compra',
        causa: 'compra',
        documentoDeCompraId: 'doc-l1',
        valorRazonableCentavos: null,
      },
    });
    expect(evento!.datos).toMatchObject({ renglones: [{ lineaDeCompraId: 'l1', costoCentavos: 20_000 }] });
  });

  it('toma el candado de las líneas antes que el de los artículos', async () => {
    e.factura('l1', 20_000n);

    await e.recibir([e.renglon('l1', '100', '200.00')]);

    expect(e.libro.bloqueos).toEqual([['l1']]);
    expect(e.kardex.orden.indexOf('bloquear_lineas')).toBeLessThan(e.kardex.orden.indexOf('bloquear'));
  });

  it('recibe en partes: lo recibido baja el pendiente y una parte de más se rechaza sin dejar nada', async () => {
    e.factura('l1', 20_000n);
    await e.recibir([e.renglon('l1', '40', '80.00')]);
    await e.recibir([e.renglon('l1', '60', '120.00')]);

    const siguiente = e.recibir([e.renglon('l1', '1', '0.01')]);

    await expect(siguiente).rejects.toBeInstanceOf(LineaSobrerrecibida);
    expect(e.kardex.existenciaDe(BODEGA, ARTICULO)).toBe(100_0000n);
    expect(e.kardex.documentosGuardados.size).toBe(2);
  });

  it('crea una recepción por documento del libro', async () => {
    e.factura('l1', 20_000n);
    e.factura('l2', 5_000n);

    const documentos = await e.recibir([e.renglon('l1', '100', '200.00'), e.renglon('l2', '20', '50.00')]);

    expect(documentos.map((d) => [d.numero, d.documentoDeCompraId, d.costoTotal])).toEqual([
      [1, 'doc-l1', '200.00'],
      [2, 'doc-l2', '50.00'],
    ]);
  });

  it('rechaza una línea que no existe, un documento anulado, sin marca o descartada', async () => {
    e.factura('anulada', 100n, { documentoVigente: false });
    e.factura('sinmarca', 100n, { esInventario: false });
    e.factura('descartada', 100n);
    await e.descartar('descartada');

    await expect(e.recibir([e.renglon('fantasma', '1', '1.00')])).rejects.toBeInstanceOf(LineaNoRecibible);
    await expect(e.recibir([e.renglon('anulada', '1', '1.00')])).rejects.toBeInstanceOf(LineaNoRecibible);
    await expect(e.recibir([e.renglon('sinmarca', '1', '1.00')])).rejects.toBeInstanceOf(LineaNoRecibible);
    await expect(e.recibir([e.renglon('descartada', '1', '1.00')])).rejects.toBeInstanceOf(LineaDescartada);
  });
});

describe('descartar y devolver a la bandeja', () => {
  it('quita la marca en el libro con su motivo, guarda el descarte y audita `descartar`', async () => {
    e.factura('l1', 20_000n);

    const resultado = await e.descartar('l1', '  Era gasto  ');

    expect(e.libro.cambiosDeMarca).toEqual([
      { lineaId: 'l1', documentoId: 'doc-l1', esInventario: false, motivo: 'Era gasto' },
    ]);
    expect(e.libro.descartes).toMatchObject([{ lineaId: 'l1', quitoLaMarca: true, vigente: true }]);
    expect(resultado.avisos[0]).toContain('dejará de ser inventario');
    expect(e.base.auditoria.entradas).toEqual([
      {
        recurso: 'inventarios.recepciones',
        registroId: 'l1',
        accion: 'descartar',
        anterior: { lineaId: 'l1', documento: 'A-l1', numeroDeLinea: 1, costo: '200.00' },
        motivo: 'Era gasto',
      },
    ]);
  });

  it('si el libro rechaza quitar la marca no queda ningún descarte', async () => {
    e.factura('l1', 20_000n);
    e.libro.falloDeLaMarca = new Error('El libro dijo que no');

    await expect(e.descartar('l1')).rejects.toThrow('El libro dijo que no');

    expect(e.libro.descartes).toEqual([]);
    expect(e.base.auditoria.entradas).toEqual([]);
  });

  it('una nota de crédito sin marca se descarta sin tocar el libro', async () => {
    await recibirCien();
    e.nota('ln', 'lf', 3_000n);

    const resultado = await e.descartar('ln');

    expect(e.libro.cambiosDeMarca).toEqual([]);
    expect(e.libro.descartes).toMatchObject([{ lineaId: 'ln', quitoLaMarca: false }]);
    expect(resultado.avisos).toEqual([]);
  });

  it('no descarta una línea con recepciones vigentes, ni dos veces, ni sin motivo', async () => {
    await recibirCien();
    e.factura('l2', 100n);
    await e.descartar('l2');

    await expect(e.descartar('lf')).rejects.toThrow('anúlelas antes');
    await expect(e.descartar('l2')).rejects.toBeInstanceOf(LineaDescartada);
    await expect(e.descartar('lf', '  ')).rejects.toThrow('motivo');
  });

  it('devolver a la bandeja vuelve a poner la marca y deja el descarte como historia, con su auditoría', async () => {
    e.factura('l1', 20_000n);
    await e.descartar('l1');

    await e.devolverALaBandeja('l1');

    expect(e.libro.cambiosDeMarca.at(-1)).toMatchObject({ lineaId: 'l1', esInventario: true });
    expect(e.libro.descartes).toMatchObject([{ vigente: false }]);
    expect(e.base.auditoria.acciones()).toEqual([
      'inventarios.recepciones:descartar',
      'inventarios.recepciones:devolver',
    ]);
    await expect(e.devolverALaBandeja('l1')).rejects.toThrow('no está descartada');
  });

  it('devolver a la bandeja una nota descartada no le pone marca de inventario', async () => {
    await recibirCien();
    e.nota('ln', 'lf', 3_000n);
    await e.descartar('ln');

    await e.devolverALaBandeja('ln');

    expect(e.libro.cambiosDeMarca).toEqual([]);
  });
});
