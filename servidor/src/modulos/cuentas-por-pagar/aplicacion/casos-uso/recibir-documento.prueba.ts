import { beforeEach, describe, expect, it } from 'vitest';
import { UnidadDeTrabajoEnMemoria, operadorDePrueba } from '../../../core/compartido/pruebas/dobles-compartidos.js';
import type { DocumentoParaDestino } from '../../../core/contratos/libro-de-compras.contratos.js';
import {
  AplicacionesEnMemoria,
  CondicionesEnMemoria,
  DocumentosEnMemoria,
  PlazoFijo,
} from '../../pruebas/dobles-de-documentos.js';
import { RecibirDocumento } from './recibir-documento.js';

const PROVEEDOR = crypto.randomUUID();

let aplicaciones: AplicacionesEnMemoria;
let documentos: DocumentosEnMemoria;
let condiciones: CondicionesEnMemoria;
let unidadDeTrabajo: UnidadDeTrabajoEnMemoria;
let recibir: RecibirDocumento;
const operador = operadorDePrueba();

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

beforeEach(() => {
  aplicaciones = new AplicacionesEnMemoria();
  documentos = new DocumentosEnMemoria(aplicaciones);
  condiciones = new CondicionesEnMemoria();
  unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  recibir = new RecibirDocumento({
    unidadDeTrabajo,
    documentos,
    aplicaciones,
    cargos: documentos,
    condiciones,
    plazo: new PlazoFijo(1),
  });
});

const guardadoDe = (documentoId: string) => documentos.documentos.find((d) => d.documentoId === documentoId)!;

describe('recibir un documento', () => {
  it('guarda una factura como pendiente, con la copia del contrato, dentro de la unidad de trabajo del operador', async () => {
    const factura = llega({ retencionesCentavos: 1200, tieneActivoFijo: true });

    await recibir.ejecutar(operador, factura);

    expect(guardadoDe(factura.documentoId)).toMatchObject({
      estado: 'pendiente',
      tipo: 'factura',
      proveedorId: PROVEEDOR,
      totalCentavos: 11200,
      retencionesCentavos: 1200,
      tieneActivoFijo: true,
    });
    expect(unidadDeTrabajo.contextos).toEqual([operador]);
  });

  it('propone el vencimiento con los días de crédito del proveedor', async () => {
    condiciones.dias.set(PROVEEDOR, 15);
    const factura = llega();

    await recibir.ejecutar(operador, factura);

    expect(guardadoDe(factura.documentoId).vencimiento).toBe('2026-03-25');
  });

  it('sin días de crédito propone un mes calendario desde la emisión', async () => {
    const factura = llega({ fechaEmision: '2026-01-31' });

    await recibir.ejecutar(operador, factura);

    expect(guardadoDe(factura.documentoId).vencimiento).toBe('2026-02-28');
  });

  it('un proveedor con 0 días es de contado: vence el día de la emisión', async () => {
    condiciones.dias.set(PROVEEDOR, 0);
    const factura = llega();

    await recibir.ejecutar(operador, factura);

    expect(guardadoDe(factura.documentoId).vencimiento).toBe('2026-03-10');
  });

  it('todo tipo de documento entra: los cargos con vencimiento y la nota de crédito sin él', async () => {
    const tipos = ['factura_especial', 'recibo', 'factura_pequeno_contribuyente', 'factura_primario_pecuario'] as const;
    for (const tipo of tipos) await recibir.ejecutar(operador, llega({ tipo }));

    expect(documentos.documentos.map((d) => d.tipo)).toEqual(tipos);
    expect(documentos.documentos.every((d) => d.vencimiento === '2026-04-10')).toBe(true);
  });

  it('una nota de débito es un cargo más: vence contado desde su propia emisión, sin tocar a su factura', async () => {
    const factura = llega();
    await recibir.ejecutar(operador, factura);
    const nota = llega({
      tipo: 'nota_de_debito',
      documentoAfectadoId: factura.documentoId,
      fechaEmision: '2026-05-02',
      totalCentavos: 500,
    });

    await recibir.ejecutar(operador, nota);

    expect(guardadoDe(nota.documentoId)).toMatchObject({ estado: 'pendiente', vencimiento: '2026-06-02' });
    expect(guardadoDe(factura.documentoId).vencimiento).toBe('2026-04-10');
    expect(aplicaciones.lista).toEqual([]);
  });

  it('el mismo documento dos veces es un error y no deja nada a medias', async () => {
    const factura = llega();
    await recibir.ejecutar(operador, factura);

    await expect(recibir.ejecutar(operador, factura)).rejects.toMatchObject({ codigo: 'documento_ya_recibido' });
    expect(documentos.documentos).toHaveLength(1);
  });
});

describe('recibir una nota de crédito', () => {
  const conFactura = async (retencionesCentavos = 0) => {
    const factura = llega({ retencionesCentavos });
    await recibir.ejecutar(operador, factura);
    return factura;
  };
  const notaDe = (factura: DocumentoParaDestino, totalCentavos: number) =>
    llega({ tipo: 'nota_de_credito', documentoAfectadoId: factura.documentoId, totalCentavos });

  it('se aplica sola a su factura, sin vencimiento, y rebaja su saldo desde que se recibe', async () => {
    const factura = await conFactura();
    const nota = notaDe(factura, 3000);

    await recibir.ejecutar(operador, nota);

    expect(guardadoDe(nota.documentoId)).toMatchObject({ estado: 'pendiente', vencimiento: null });
    expect(documentos.saldoDe(guardadoDe(factura.documentoId))).toBe(8200);
    expect(documentos.bloqueadas).toEqual([factura.documentoId]);
  });

  it('una devolución total de una factura con retenciones deja libre lo retenido', async () => {
    const factura = await conFactura(1200);
    const nota = notaDe(factura, 11200);

    await recibir.ejecutar(operador, nota);

    expect(documentos.saldoDe(guardadoDe(factura.documentoId))).toBe(0);
    expect(aplicaciones.saldoLibreDe(guardadoDe(nota.documentoId))).toBe(1200);
  });

  it('lo que sobra de la factura se aplica a sus notas de débito, de la más antigua a la más nueva', async () => {
    const factura = await conFactura(1200);
    const debito = (dia: string, totalCentavos: number) =>
      llega({ tipo: 'nota_de_debito', documentoAfectadoId: factura.documentoId, fechaEmision: dia, totalCentavos });
    const primera = debito('2026-04-01', 500);
    const segunda = debito('2026-04-05', 800);
    await recibir.ejecutar(operador, primera);
    await recibir.ejecutar(operador, segunda);
    const nota = notaDe(factura, 11000);

    await recibir.ejecutar(operador, nota);

    expect(documentos.saldoDe(guardadoDe(factura.documentoId))).toBe(0);
    expect(documentos.saldoDe(guardadoDe(primera.documentoId))).toBe(0);
    expect(documentos.saldoDe(guardadoDe(segunda.documentoId))).toBe(300);
  });

  it('si la factura no está en Cuentas por pagar la nota queda con todo su saldo libre', async () => {
    const nota = llega({ tipo: 'nota_de_credito', documentoAfectadoId: crypto.randomUUID(), totalCentavos: 700 });

    await recibir.ejecutar(operador, nota);

    expect(aplicaciones.lista).toEqual([]);
    expect(aplicaciones.saldoLibreDe(guardadoDe(nota.documentoId))).toBe(700);
  });

  it('dos notas seguidas no pasan del saldo de la factura', async () => {
    const factura = await conFactura();
    const primera = notaDe(factura, 8000);
    const segunda = notaDe(factura, 8000);

    await recibir.ejecutar(operador, primera);
    await recibir.ejecutar(operador, segunda);

    expect(documentos.saldoDe(guardadoDe(factura.documentoId))).toBe(0);
    expect(aplicaciones.saldoLibreDe(guardadoDe(segunda.documentoId))).toBe(4800);
  });
});
