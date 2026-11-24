import { describe, expect, it } from 'vitest';
import type { LineaPorRecibir } from '../../servicios/recepciones.api';
import { agruparPorDocumento, esNotaDeCredito, filtrarLineas, lineasElegidas } from './agrupar-lineas';

const linea = (datos: Partial<LineaPorRecibir>): LineaPorRecibir => ({
  lineaId: 'l1',
  documentoId: 'd1',
  numeroDeLinea: 1,
  tipoDeDocumento: 'factura',
  documentoAfectadoId: null,
  documento: 'FAC-1',
  fechaEmision: '2026-11-10',
  proveedorNombre: 'Agro Insumos',
  conceptoId: 'c1',
  conceptoNombre: 'Concentrado',
  descripcion: null,
  costo: '100.00',
  recibido: '0.00',
  pendiente: '100.00',
  articuloSugeridoId: null,
  articuloSugeridoCodigo: null,
  articuloSugeridoNombre: null,
  esInventario: true,
  anteriorALaFechaDeInicio: false,
  ...datos,
});

describe('bandeja por recibir', () => {
  it('agrupa por documento, con las líneas en orden y el pendiente sumado', () => {
    const grupos = agruparPorDocumento([
      linea({ lineaId: 'b', numeroDeLinea: 2, pendiente: '0.10' }),
      linea({ lineaId: 'a', numeroDeLinea: 1, pendiente: '0.20' }),
      linea({ lineaId: 'c', documentoId: 'd2', documento: 'FAC-0', fechaEmision: '2026-11-01' }),
    ]);
    expect(grupos.map((g) => g.documento)).toEqual(['FAC-0', 'FAC-1']);
    expect(grupos[1]?.lineas.map((l) => l.lineaId)).toEqual(['a', 'b']);
    expect(grupos[1]?.pendiente).toBe('0.30');
  });

  it('busca por documento, proveedor, concepto o descripción sin tildes', () => {
    const lineas = [linea({ lineaId: 'a' }), linea({ lineaId: 'b', proveedorNombre: 'Ferretería Pérez' })];
    expect(filtrarLineas(lineas, 'perez').map((l) => l.lineaId)).toEqual(['b']);
    expect(filtrarLineas(lineas, 'fac-1')).toHaveLength(2);
    expect(filtrarLineas(lineas, '  ')).toHaveLength(2);
  });

  it('reconoce las notas de crédito, que no se reciben', () => {
    expect(esNotaDeCredito(linea({ tipoDeDocumento: 'nota_de_credito' }))).toBe(true);
    expect(esNotaDeCredito(linea({}))).toBe(false);
  });

  it('las líneas elegidas respetan el orden de la lista y olvidan las que ya no están', () => {
    const lineas = [linea({ lineaId: 'a' }), linea({ lineaId: 'b' })];
    expect(lineasElegidas(lineas, ['b', 'a', 'z']).map((l) => l.lineaId)).toEqual(['a', 'b']);
  });
});
