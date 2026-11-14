import { beforeEach, describe, expect, it } from 'vitest';
import { NotaDeDebitoSostieneNotasDeCredito } from '../../../dominio/errores-de-baja.js';
import {
  crearEscenario,
  operador,
  proveedorId,
  solicitud,
} from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import type { FacturaAnteriorConNotas } from '../../puertos/puertos-de-facturas-anteriores.js';
import { AnularDocumento } from './anular-documento.js';
import { EliminarDocumento } from './eliminar-documento.js';
import { RegistrarDocumento } from './registrar-documento.js';

let e = crearEscenario();
let notaId = '';

const bajas = () => ({ ...e.dependencias, repositorio: e.guardados });
const anular = () =>
  new AnularDocumento(bajas()).ejecutar(operador, { documentoId: notaId, causa: 'error_de_captura', motivo: 'Error' });
const eliminar = () => new EliminarDocumento(bajas()).ejecutar(operador, { documentoId: notaId });

const facturaAnterior = (notas: Partial<FacturaAnteriorConNotas['notas']> = {}): FacturaAnteriorConNotas => ({
  id: crypto.randomUUID(),
  proveedorId,
  tipo: 'factura',
  serie: 'B',
  numero: '900',
  autorizacionFel: null,
  fechaEmision: '2026-06-15',
  total: 112000,
  iva: 12000,
  notasDeDebitoAnterioresTotal: 56000,
  notasDeDebitoAnterioresIva: 6000,
  motivoSinCredito: null,
  detalleDelMotivo: null,
  notas: {
    vigentes: 1,
    totalDeNotasDeCredito: 0,
    ivaDeNotasDeCredito: 0,
    totalDeNotasDeDebito: 56000,
    ivaDeNotasDeDebito: 6000,
    ...notas,
  },
});

/** Registra una nota de débito de Q560 sobre una factura anterior y la deja sembrada para darla de baja. */
async function sembrarNotaDeDebito(factura: FacturaAnteriorConNotas): Promise<void> {
  e.facturasAnteriores.filas.push(factura);
  await new RegistrarDocumento(e.dependencias).ejecutar(operador, {
    solicitud: solicitud({
      tipo: 'nota_de_debito',
      numero: '77',
      facturaAnterior: {
        tipo: 'factura',
        serie: 'B',
        numero: '900',
        fechaEmision: '2026-06-15',
        autorizacionFel: null,
        total: '1120.00',
        iva: '120.00',
        notasDeDebitoAnterioresTotal: '560.00',
        notasDeDebitoAnterioresIva: '60.00',
        motivoSinCredito: null,
        detalleDelMotivo: null,
      },
      lineas: [{ ...solicitud().lineas[0]!, total: '560.00' }],
    }),
    puedeAjustarRetenciones: false,
  });
  const documento = e.repositorio.agregados[0]!;
  notaId = documento.id;
  e.guardados.sembrar(documento);
}

beforeEach(() => {
  e = crearEscenario();
  e.empresa.fechaDeInicioDeLaEmpresa = '2026-09-01';
});

describe('bajas de una nota de débito con factura anterior', () => {
  it('sin notas de crédito se anula y se elimina, bloqueando la factura anterior', async () => {
    const factura = facturaAnterior();
    await sembrarNotaDeDebito(factura);
    e.facturasAnteriores.bloqueadas.length = 0;

    await expect(anular()).resolves.toBeTruthy();
    e.guardados.sembrar(e.repositorio.agregados[0]!);
    await expect(eliminar()).resolves.toBeTruthy();

    expect(e.facturasAnteriores.bloqueadas).toEqual([factura.id, factura.id]);
  });

  it('con notas de crédito que ya no caben sin ella (contando las de débito anteriores) no se da de baja y no deja rastro', async () => {
    // Sin la nota quedan 1,120 + 560 de las anteriores = 1,680: 2,000 de crédito ya no caben.
    await sembrarNotaDeDebito(facturaAnterior({ totalDeNotasDeCredito: 200000, ivaDeNotasDeCredito: 20000 }));

    await expect(anular()).rejects.toBeInstanceOf(NotaDeDebitoSostieneNotasDeCredito);
    await expect(eliminar()).rejects.toBeInstanceOf(NotaDeDebitoSostieneNotasDeCredito);
    expect(e.auditoria.entradas.filter((entrada) => ['anular', 'eliminar'].includes(entrada.accion))).toEqual([]);
    expect(e.facturasAnteriores.huerfanasBorradas).toEqual([]);
  });

  it('con notas de crédito que siguen cabiendo sin ella, sí', async () => {
    await sembrarNotaDeDebito(facturaAnterior({ totalDeNotasDeCredito: 150000, ivaDeNotasDeCredito: 16000 }));

    await expect(eliminar()).resolves.toBeTruthy();
  });
});

describe('eliminar una nota con factura anterior', () => {
  it('pide borrar la factura anterior si se queda sin notas y audita la nota con los datos de la factura', async () => {
    const factura = facturaAnterior();
    await sembrarNotaDeDebito(factura);

    await eliminar();

    expect(e.facturasAnteriores.huerfanasBorradas).toEqual([factura.id]);
    const entrada = e.auditoria.entradas.find((auditada) => auditada.accion === 'eliminar');
    expect(entrada?.anterior).toMatchObject({ facturaAnterior: { numero: '900' } });
  });

  it('anular no toca la factura anterior', async () => {
    await sembrarNotaDeDebito(facturaAnterior());

    await anular();

    expect(e.facturasAnteriores.huerfanasBorradas).toEqual([]);
  });
});
