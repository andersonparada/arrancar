import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Documento } from '../../servicios/documentos.api';
import { detallesDeLaFicha, detallesDeLaTarjeta, motivoDelDocumento, tituloDeDocumento } from './detalles-de-documento';

const documento = (datos: Partial<Documento>): Documento => ({
  id: 'd1',
  clase: 'entrada_manual',
  numero: 12,
  fecha: '2026-11-20',
  bodegaId: 'b1',
  bodegaNombre: 'Principal',
  documentoDeCompraId: null,
  documentoRelacionadoId: null,
  causa: 'aporte',
  destino: null,
  conceptoDeGastoId: null,
  conceptoDeGastoNombre: null,
  localidadId: null,
  departamentoId: null,
  entregadoA: null,
  soporte: 'Acta 4',
  observaciones: null,
  requiereFactura: false,
  estado: 'vigente',
  motivoDeAnulacion: null,
  avisos: [],
  costoTotal: '150.00',
  renglones: [],
  ...datos,
});

beforeEach(() => setActivePinia(createPinia()));

describe('detalles de un documento', () => {
  it('el título lleva la clase y el número', () => {
    expect(tituloDeDocumento(documento({}))).toBe('Entrada n.º 12');
    expect(tituloDeDocumento(documento({ clase: 'rebaja_de_costo', numero: 3 }))).toBe('Rebaja de costo n.º 3');
  });

  it('el motivo es la causa de la entrada o el destino de la salida', () => {
    expect(motivoDelDocumento(documento({}))).toBe('Aporte');
    expect(motivoDelDocumento(documento({ causa: null, destino: 'gasto' }))).toBe('Gasto (consumo)');
    expect(motivoDelDocumento(documento({ causa: null }))).toBe('');
  });

  it('sin permiso de costos no hay costo total en la tarjeta ni en la ficha', () => {
    const sinCostos = documento({ costoTotal: null });
    expect(detallesDeLaTarjeta(sinCostos).some((d) => d.etiqueta === 'Costo total')).toBe(false);
    expect(detallesDeLaFicha(sinCostos).some((d) => d.etiqueta === 'Costo total')).toBe(false);
    expect(detallesDeLaTarjeta(documento({})).some((d) => d.etiqueta === 'Costo total')).toBe(true);
  });

  it('la ficha de un documento anulado muestra el motivo de la anulación', () => {
    const anulado = documento({ estado: 'anulado', motivoDeAnulacion: 'Se registró dos veces' });
    const detalles = detallesDeLaFicha(anulado);
    expect(detalles).toContainEqual({ etiqueta: 'Estado', valor: 'Anulado' });
    expect(detalles).toContainEqual({ etiqueta: 'Motivo de la anulación', valor: 'Se registró dos veces' });
  });
});
