import { beforeEach, describe, expect, it } from 'vitest';
import { NotaDeDebitoSostieneNotasDeCredito } from '../../../dominio/errores-de-baja.js';
import { crearEscenario, operador, solicitud } from '../../../pruebas/escenario-de-documentos-en-memoria.soporte.js';
import type { FacturaParaNota } from '../../puertos/puertos-de-documentos.js';
import { AnularDocumento } from './anular-documento.js';
import { EliminarDocumento } from './eliminar-documento.js';
import { dtoDeFicha } from './dto-de-ficha.js';
import { RegistrarDocumento } from './registrar-documento.js';

let e = crearEscenario();
let notaId = '';
const facturaId = crypto.randomUUID();
const bajas = () => ({ ...e.dependencias, repositorio: e.guardados });
const anular = () =>
  new AnularDocumento(bajas()).ejecutar(operador, { documentoId: notaId, causa: 'error_de_captura', motivo: 'Error' });
const eliminar = () => new EliminarDocumento(bajas()).ejecutar(operador, { documentoId: notaId });

const ponerFactura = (cambios: Partial<FacturaParaNota>) =>
  e.consultas.facturas.set(facturaId, {
    id: facturaId,
    tipo: 'factura',
    estado: 'vigente',
    proveedorId: solicitud().proveedorId,
    destino: 'cuentas-por-pagar',
    motivoSinCredito: null,
    regimenIvaDeLaEmpresa: 'general',
    fechaEmision: '2026-09-10',
    muestraEnReportesSat: true,
    total: 112000,
    iva: 12000,
    totalDeNotasDeCredito: 0,
    ivaDeNotasDeCredito: 0,
    totalDeNotasDeDebito: 56000,
    ivaDeNotasDeDebito: 6000,
    ...cambios,
  });

beforeEach(async () => {
  e = crearEscenario();
  ponerFactura({});
  await new RegistrarDocumento(e.dependencias).ejecutar(operador, {
    solicitud: solicitud({
      tipo: 'nota_de_debito',
      documentoAfectadoId: facturaId,
      numero: '77',
      lineas: [{ ...solicitud().lineas[0]!, total: '560.00' }],
    }),
    puedeAjustarRetenciones: false,
  });
  const documento = e.repositorio.agregados[0]!;
  notaId = documento.id;
  e.guardados.sembrar(documento);
});

describe('anular y eliminar una nota de débito', () => {
  it('sin notas de crédito se anula y se elimina, bloqueando la factura', async () => {
    await expect(anular()).resolves.toBeTruthy();
    e.guardados.sembrar(e.repositorio.agregados[0]!);
    await expect(eliminar()).resolves.toBeTruthy();
    expect(e.guardados.eliminados).toEqual([notaId]);
  });

  it('con notas de crédito que ya no caben sin ella, no se anula ni se elimina y no deja rastro', async () => {
    ponerFactura({ totalDeNotasDeCredito: 150000, ivaDeNotasDeCredito: 16000 });

    await expect(anular()).rejects.toBeInstanceOf(NotaDeDebitoSostieneNotasDeCredito);
    await expect(eliminar()).rejects.toBeInstanceOf(NotaDeDebitoSostieneNotasDeCredito);
    expect(e.auditoria.entradas.filter((entrada) => ['anular', 'eliminar'].includes(entrada.accion))).toEqual([]);
    expect(e.guardados.eliminados).toEqual([]);
  });

  it('el IVA también cuenta: las notas de crédito no pueden pasar del IVA que queda', async () => {
    ponerFactura({ totalDeNotasDeCredito: 100000, ivaDeNotasDeCredito: 13000 });

    await expect(anular()).rejects.toBeInstanceOf(NotaDeDebitoSostieneNotasDeCredito);
  });
});

describe('la ficha de una factura', () => {
  it('lista sus notas de crédito y de débito y suma el total ajustado con las vigentes', async () => {
    const factura = e.guardados.sembrar(
      { ...e.repositorio.agregados[0]!, tipo: 'factura', documentoAfectadoId: null, id: facturaId },
      { notas: [] },
    );
    e.guardados.agregarNota(facturaId, 'vigente', 'nota_de_debito');
    e.guardados.agregarNota(facturaId, 'vigente', 'nota_de_credito');
    e.guardados.agregarNota(facturaId, 'anulado', 'nota_de_debito');

    const ficha = dtoDeFicha(factura);

    expect(ficha.notas.map((nota) => nota.tipo)).toEqual(['nota_de_debito', 'nota_de_credito', 'nota_de_debito']);
    expect(ficha.totalAjustado).toBe('560.00');
    expect(dtoDeFicha(e.guardados.filas.get(notaId)!).totalAjustado).toBeNull();
  });
});
