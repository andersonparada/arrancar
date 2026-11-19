import { describe, expect, it } from 'vitest';
import type { ConversionDeArticulo } from '../../servicios/articulos.api';
import type { Unidad } from '../../servicios/unidades.api';
import {
  agregarFila,
  datosDeConversiones,
  edicionDeConversiones,
  marcarParaCompras,
  quitarFila,
  unidadesDisponibles,
} from './edicion-de-conversiones';

const conversiones: ConversionDeArticulo[] = [
  { unidadId: 'caja', unidadNombre: 'Caja', factor: '24.00000000', paraCompras: true },
  { unidadId: 'saco', unidadNombre: 'Saco', factor: '50.50000000', paraCompras: false },
];

const unidad = (id: string, activo = true): Unidad => ({
  id,
  nombre: id,
  simbolo: id,
  magnitud: 'empaque',
  factorALaReferencia: null,
  activo,
});

describe('ventana de conversiones', () => {
  it('abre con lo que ya tiene el artículo, sin ceros que sobren', () => {
    const edicion = edicionDeConversiones(conversiones);

    expect(edicion.filas).toEqual([
      { unidadId: 'caja', factor: '24', paraCompras: true },
      { unidadId: 'saco', factor: '50.5', paraCompras: false },
    ]);
  });

  it('lo abierto se manda igual si no se cambia nada', () => {
    expect(datosDeConversiones(edicionDeConversiones(conversiones))).toEqual({
      conversiones: [
        { unidadId: 'caja', factor: '24', paraCompras: true },
        { unidadId: 'saco', factor: '50.5', paraCompras: false },
      ],
    });
  });

  it('agrega y quita filas; las filas sin unidad no se mandan', () => {
    const edicion = edicionDeConversiones(conversiones);
    agregarFila(edicion);
    expect(edicion.filas).toHaveLength(3);
    expect(datosDeConversiones(edicion).conversiones).toHaveLength(2);

    quitarFila(edicion, 0);
    expect(edicion.filas.map((fila) => fila.unidadId)).toEqual(['saco', null]);
  });

  it('solo una es la de compras: marcar una desmarca las demás y volver a marcarla la desmarca', () => {
    const edicion = edicionDeConversiones(conversiones);

    marcarParaCompras(edicion, 1);
    expect(edicion.filas.map((fila) => fila.paraCompras)).toEqual([false, true]);

    marcarParaCompras(edicion, 1);
    expect(edicion.filas.map((fila) => fila.paraCompras)).toEqual([false, false]);
  });

  it('cada fila ofrece las unidades activas que no están en otra fila, y la suya', () => {
    const edicion = edicionDeConversiones(conversiones);
    const todas = [unidad('caja'), unidad('saco'), unidad('fardo'), unidad('bolsa', false)];

    expect(unidadesDisponibles(todas, edicion, 0).map((u) => u.id)).toEqual(['caja', 'fardo']);
    expect(unidadesDisponibles(todas, edicion, 1).map((u) => u.id)).toEqual(['saco', 'fardo']);
  });
});
