import { describe, expect, it } from 'vitest';
import { filaDte, propuesta } from './bandeja.soporte';
import {
  cantidadDeFiltrosDeLaBandeja,
  consultaDeLaBandeja,
  enGrupos,
  faltantesDeLaFila,
  filtrosDeLaBandejaVacios,
  opcionesDeTipoDeDte,
  proveedoresNuevos,
  resumenDeLaSeleccion,
  tieneProveedorNuevo,
  tituloDeLaFila,
  valoresDeLaFila,
} from './datos-de-la-bandeja';

describe('filtros y consulta de la bandeja', () => {
  it('sin filtros no filtra nada y pide la página con su tamaño', () => {
    expect(consultaDeLaBandeja('pendiente', filtrosDeLaBandejaVacios(), 2)).toEqual({
      estado: 'pendiente',
      busqueda: undefined,
      tipoDte: undefined,
      desde: undefined,
      hasta: undefined,
      conProveedor: undefined,
      pagina: 2,
      limite: 50,
    });
  });

  it('convierte «proveedor nuevo» en conProveedor falso y «con proveedor» en verdadero', () => {
    const nuevo = consultaDeLaBandeja('pendiente', { ...filtrosDeLaBandejaVacios(), proveedor: 'nuevo' }, 1);
    const existente = consultaDeLaBandeja('pendiente', { ...filtrosDeLaBandejaVacios(), proveedor: 'existente' }, 1);
    expect(nuevo.conProveedor).toBe(false);
    expect(existente.conProveedor).toBe(true);
  });

  it('recorta la búsqueda y cuenta solo los filtros puestos', () => {
    const filtros = { ...filtrosDeLaBandejaVacios(), busqueda: '  paz  ', desde: '2026-10-01', hasta: '   ' };
    expect(consultaDeLaBandeja('registrado', filtros, 1).busqueda).toBe('paz');
    expect(cantidadDeFiltrosDeLaBandeja(filtros)).toBe(2);
    expect(cantidadDeFiltrosDeLaBandeja(filtrosDeLaBandejaVacios())).toBe(0);
  });

  it('el selector de tipos empieza en «Todos» y no ofrece el recibo sin FEL', () => {
    const opciones = opcionesDeTipoDeDte();
    expect(opciones[0]).toEqual({ valor: '', texto: 'Todos los tipos' });
    expect(opciones.some(({ valor }) => valor === 'RECIBO')).toBe(false);
    expect(opciones.some(({ valor }) => valor === 'FACT')).toBe(true);
  });
});

describe('lo que vale para una fila', () => {
  it('sin completar usa lo propuesto', () => {
    expect(valoresDeLaFila(filaDte())).toEqual({
      proveedorId: 'p1',
      conceptoId: 'c1',
      destino: 'cuentas-por-pagar',
      fechaRecepcion: '2026-10-12',
      periodo: '2026-10-01',
    });
  });

  it('lo completado por el usuario gana a lo propuesto', () => {
    const fila = filaDte({ borrador: { ...filaDte().borrador, conceptoId: 'c9', destino: 'caja-chica' } });
    expect(valoresDeLaFila(fila)).toMatchObject({ conceptoId: 'c9', destino: 'caja-chica' });
  });

  it('en un agente de retención la recepción no se supone', () => {
    const fila = filaDte({ propuesta: propuesta({ recepcionObligatoria: true }) });
    expect(valoresDeLaFila(fila).fechaRecepcion).toBeNull();
    expect(faltantesDeLaFila(fila)).toEqual(['la fecha de recepción']);
  });

  it('una fila sin propuesta ni borrador lo pide todo', () => {
    expect(faltantesDeLaFila(filaDte({ propuesta: null }))).toEqual([
      'el concepto de gasto',
      'el destino',
      'la fecha de recepción',
    ]);
  });

  it('una nota pide la factura que corrige hasta que se elige', () => {
    expect(faltantesDeLaFila(filaDte({ tipoDte: 'NCRE' }))).toEqual(['la factura que corrige']);
    const elegida = filaDte({ tipoDte: 'NCRE', borrador: { ...filaDte().borrador, documentoAfectadoId: 'd1' } });
    expect(faltantesDeLaFila(elegida)).toEqual([]);
  });

  it('lo que no está pendiente no tiene faltantes', () => {
    expect(faltantesDeLaFila(filaDte({ estado: 'registrado', propuesta: null }))).toEqual([]);
  });
});

describe('proveedores nuevos y resumen de lo marcado', () => {
  const nueva = (id: string, nit: string, nombre: string) =>
    filaDte({ id, nitEmisor: nit, nombreEmisor: nombre, propuesta: propuesta({ proveedorId: null }) });

  it('una fila sin proveedor es de proveedor nuevo; una registrada, no', () => {
    expect(tieneProveedorNuevo(nueva('a', '1', 'A'))).toBe(true);
    expect(tieneProveedorNuevo(filaDte())).toBe(false);
    expect(tieneProveedorNuevo(filaDte({ estado: 'registrado', propuesta: null }))).toBe(false);
  });

  it('agrupa por NIT, cuenta las filas y ordena por nombre', () => {
    const filas = [nueva('a', '2', 'Zeta'), nueva('b', '1', 'Alfa'), nueva('c', '2', 'Zeta'), filaDte({ id: 'd' })];
    expect(proveedoresNuevos(filas)).toEqual([
      { nit: '1', nombre: 'Alfa', filas: 1 },
      { nit: '2', nombre: 'Zeta', filas: 2 },
    ]);
  });

  it('resume cantidad, total, nuevos, faltantes y anuladas', () => {
    const filas = [
      filaDte({ id: 'a', total: '100.50' }),
      filaDte({ id: 'b', total: '49.50', estadoSat: 'anulado' }),
      filaDte({ id: 'c', total: '10.00', propuesta: null }),
    ];
    const resumen = resumenDeLaSeleccion(filas);
    expect(resumen).toMatchObject({ cantidad: 3, total: '160.00', conFaltantes: 1, anuladasEnLaSat: 1 });
    expect(resumen.proveedoresNuevos).toHaveLength(1);
  });
});

describe('utilidades de la lista', () => {
  it('parte una lista en grupos del tamaño pedido', () => {
    expect(enGrupos([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(enGrupos([], 3)).toEqual([]);
  });

  it('el título lleva el tipo, la serie y el número', () => {
    expect(tituloDeLaFila(filaDte())).toBe('FACT A-123');
    expect(tituloDeLaFila(filaDte({ serie: '' }))).toBe('FACT 123');
  });
});
