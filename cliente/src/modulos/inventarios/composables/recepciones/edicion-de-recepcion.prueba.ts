import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { LineaPorRecibir } from '../../servicios/recepciones.api';
import {
  cambiarDeArticulo,
  datosDeRecepcion,
  dividirRenglon,
  erroresDeRecepcion,
  recepcionNueva,
  resumenDeRecepcion,
} from './edicion-de-recepcion';

const linea = (datos: Partial<LineaPorRecibir> = {}): LineaPorRecibir => ({
  lineaId: 'l1',
  documentoId: 'd1',
  numeroDeLinea: 2,
  tipoDeDocumento: 'factura',
  documentoAfectadoId: null,
  documento: 'FAC-1',
  fechaEmision: '2026-11-10',
  proveedorNombre: 'Agro Insumos',
  conceptoId: 'c1',
  conceptoNombre: 'Concentrado',
  descripcion: null,
  costo: '500.00',
  recibido: '0.00',
  pendiente: '500.00',
  articuloSugeridoId: 'a1',
  articuloSugeridoCodigo: 'CON-1',
  articuloSugeridoNombre: 'Concentrado',
  anteriorALaFechaDeInicio: false,
  ...datos,
});

const completa = () => {
  const edicion = recepcionNueva([linea()], '2026-11-23');
  edicion.bodegaId = 'b1';
  edicion.renglones[0]!.cantidad = '20';
  return edicion;
};

beforeEach(() => setActivePinia(createPinia()));

describe('recepción desde el libro', () => {
  it('abre con un renglón por línea, el artículo sugerido y todo el pendiente como monto', () => {
    const edicion = recepcionNueva([linea(), linea({ lineaId: 'l2', articuloSugeridoId: null })], '2026-11-23');
    expect(edicion.renglones).toHaveLength(2);
    expect(edicion.renglones[0]).toMatchObject({
      articuloId: 'a1',
      monto: '500.00',
      titulo: 'FAC-1 · línea 2 · Concentrado',
    });
    expect(edicion.renglones[1]?.articuloId).toBeNull();
  });

  it('una recepción completa no tiene errores', () => {
    expect(erroresDeRecepcion(completa())).toEqual({});
  });

  it('pide bodega, artículo y cantidad con el mensaje de qué hacer', () => {
    const edicion = recepcionNueva([linea({ articuloSugeridoId: null })], '2026-11-23');
    const errores = erroresDeRecepcion(edicion);
    expect(errores.bodegaId).toMatch(/bodega/);
    expect(errores['renglones.0.articuloId']).toMatch(/Elija el artículo/);
    expect(errores['renglones.0.cantidad']).toMatch(/mayor que cero/);
  });

  it('lo recibido de una línea, sumando sus renglones, no pasa de lo pendiente', () => {
    const edicion = completa();
    edicion.renglones = dividirRenglon(edicion.renglones, 0);
    edicion.renglones[1]!.articuloId = 'a2';
    edicion.renglones[1]!.cantidad = '5';
    edicion.renglones[1]!.monto = '0.01';
    const errores = erroresDeRecepcion(edicion);
    expect(errores['renglones.0.monto']).toMatch(/pasa de lo pendiente/);
    expect(errores['renglones.1.monto']).toMatch(/pasa de lo pendiente/);
  });

  it('repartir una línea en dos artículos cuadra con su pendiente', () => {
    const edicion = completa();
    edicion.renglones = dividirRenglon(edicion.renglones, 0);
    edicion.renglones[0]!.monto = '300.00';
    Object.assign(edicion.renglones[1]!, { articuloId: 'a2', cantidad: '5', monto: '200.00' });
    expect(erroresDeRecepcion(edicion)).toEqual({});
    expect(edicion.renglones[1]?.lineaId).toBe('l1');
  });

  it('repartir una línea con lote nuevo no copia el lote: el renglón nuevo no exige un lote que no se ve', () => {
    const edicion = completa();
    Object.assign(edicion.renglones[0]!, { conLoteNuevo: true, loteCodigo: 'L-1' });
    edicion.renglones = dividirRenglon(edicion.renglones, 0);
    edicion.renglones[0]!.monto = '300.00';
    Object.assign(edicion.renglones[1]!, { articuloId: 'a2', cantidad: '5', monto: '200.00' });
    expect(edicion.renglones[1]?.conLoteNuevo).toBe(false);
    expect(erroresDeRecepcion(edicion)).toEqual({});
    expect(datosDeRecepcion(edicion).renglones[1]?.loteNuevo).toBeNull();
  });

  it('cambiar de artículo descarta unidad, lote y lote nuevo del anterior', () => {
    const edicion = completa();
    const renglon = edicion.renglones[0]!;
    Object.assign(renglon, { conLoteNuevo: true, loteCodigo: 'L-1', loteVencimiento: '2027-01-01', unidadId: 'u1' });
    cambiarDeArticulo(renglon, 'a2');
    expect(renglon).toMatchObject({ articuloId: 'a2', conLoteNuevo: false, loteCodigo: '', loteVencimiento: '' });
    expect(renglon).toMatchObject({ loteId: null, unidadId: null });
    expect(erroresDeRecepcion(edicion)).toEqual({});
    expect(datosDeRecepcion(edicion).renglones[0]?.loteNuevo).toBeNull();
  });

  it('un monto en cero o mal escrito dice cuánto queda pendiente', () => {
    const edicion = completa();
    edicion.renglones[0]!.monto = '0';
    expect(erroresDeRecepcion(edicion)['renglones.0.monto']).toMatch(/500\.00/);
  });

  it('un lote nuevo exige su código y se manda en lugar del lote elegido', () => {
    const edicion = completa();
    Object.assign(edicion.renglones[0]!, { conLoteNuevo: true, loteId: 'viejo', loteVencimiento: '2027-05-01' });
    expect(erroresDeRecepcion(edicion)['renglones.0.loteNuevo']).toMatch(/código del lote/);
    edicion.renglones[0]!.loteCodigo = ' L-77 ';
    const [renglon] = datosDeRecepcion(edicion).renglones;
    expect(renglon).toMatchObject({
      loteId: null,
      loteNuevo: { codigo: 'L-77', fechaDeVencimiento: '2027-05-01', fechaDeFabricacion: null },
    });
  });

  it('el resumen avisa que lo que falta queda en la bandeja', () => {
    const edicion = completa();
    edicion.renglones[0]!.monto = '200.00';
    expect(resumenDeRecepcion(edicion, 'Principal')).toMatch(/«Principal».*1 línea.*200\.00.*queda en la bandeja/);
    edicion.renglones[0]!.monto = '500.00';
    expect(resumenDeRecepcion(edicion, 'Principal')).not.toMatch(/bandeja/);
  });
});
