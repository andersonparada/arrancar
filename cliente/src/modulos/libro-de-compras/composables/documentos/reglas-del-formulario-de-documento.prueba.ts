import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { DocumentoEnLista } from '../../servicios/documentos.api';
import { edicionVacia } from './edicion-de-documento';
import {
  alCambiarElMotivo,
  alCambiarElTipo,
  alElegirProveedor,
  alMarcarLaCasilla,
  opcionesDeDestinos,
  opcionesDeFacturas,
  opcionesDePeriodoDelDocumento,
  opcionesDeProveedores,
} from './reglas-del-formulario-de-documento';

// Los textos de las facturas dan formato con `formatearFecha` y `formatearMonto`, que leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const HOY = new Date(2026, 9, 18);

const documento = (cambios: Partial<DocumentoEnLista>): DocumentoEnLista => ({
  id: 'd-1',
  tipo: 'factura',
  proveedorId: 'p-1',
  nombreEmisor: 'Agro S.A.',
  serie: 'A',
  numero: '100',
  fechaEmision: '2026-10-01',
  fechaRecepcion: '2026-10-02',
  periodo: '2026-10-01',
  destino: 'cuentas-por-pagar',
  estado: 'vigente',
  muestraEnReportesSat: true,
  documentoAfectadoId: null,
  total: '112.00',
  retenido: '0.00',
  netoAPagar: '112.00',
  procesado: false,
  puedeAnular: true,
  puedeEliminar: true,
  ...cambios,
});

describe('opciones de los selectores', () => {
  it('los proveedores y los destinos van por nombre', () => {
    const proveedores = [
      { id: '1', nombre: 'Zacapa', nit: null },
      { id: '2', nombre: 'Álvarez', nit: null },
      { id: '3', nombre: 'Bodega', nit: null },
    ];
    expect(opcionesDeProveedores(proveedores).map((o) => o.texto)).toEqual(['Álvarez', 'Bodega', 'Zacapa']);
    expect(opcionesDeDestinos(['cuentas-por-pagar', 'caja-chica']).map((o) => o.texto)).toEqual([
      'Caja chica',
      'Cuentas por pagar',
    ]);
  });

  it('una nota ofrece solo facturas (no otras notas ni recibos), la más reciente primero', () => {
    const opciones = opcionesDeFacturas([
      documento({ id: 'a', numero: '1', fechaEmision: '2026-09-01' }),
      documento({ id: 'b', numero: '2', fechaEmision: '2026-10-05', tipo: 'factura_pequeno_contribuyente' }),
      documento({ id: 'c', numero: '3', tipo: 'nota_de_credito' }),
      documento({ id: 'd', numero: '4', tipo: 'recibo' }),
    ]);
    expect(opciones.map((o) => o.valor)).toEqual(['b', 'a']);
    expect(opciones[0]?.destino).toBe('cuentas-por-pagar');
  });

  it('el período ofrece el propuesto, y conserva uno antiguo que ya estaba elegido', () => {
    const opciones = opcionesDePeriodoDelDocumento(HOY, '2020-01', '2026-10');
    expect(opciones[0]).toEqual({ valor: '', texto: 'Propuesto: octubre de 2026' });
    expect(opciones[1]).toEqual({ valor: '2026-10', texto: 'Octubre de 2026' });
    expect(opciones.at(-1)?.valor).toBe('2020-01');
    expect(opcionesDePeriodoDelDocumento(HOY, '', null)[0]?.texto).toBe('El propuesto por el sistema');
  });
});

describe('reglas del formulario', () => {
  it('un recibo nunca va en el libro; al dejar de serlo vuelve a él', () => {
    const edicion = edicionVacia(HOY);
    edicion.tipo = 'recibo';
    alCambiarElTipo(edicion, 'factura');
    expect(edicion).toMatchObject({ muestraEnReportesSat: false, motivoFueraDelLibro: 'sin_fel' });
    edicion.tipo = 'factura';
    alCambiarElTipo(edicion, 'recibo');
    expect(edicion).toMatchObject({ muestraEnReportesSat: true, motivoFueraDelLibro: null });
  });

  it('cambiar el tipo quita la factura afectada si ya no es una nota y olvida la confirmación del régimen', () => {
    const edicion = { ...edicionVacia(HOY), documentoAfectadoId: 'f-1', confirmarCambioDeRegimen: true };
    edicion.tipo = 'factura';
    alCambiarElTipo(edicion, 'nota_de_credito');
    expect(edicion).toMatchObject({ documentoAfectadoId: null, confirmarCambioDeRegimen: false });
  });

  it('desmarcar la casilla propone «sin FEL» y marcarla borra el receptor', () => {
    const edicion = { ...edicionVacia(HOY), autorizacionFel: 'UUID', nitReceptor: '123' };
    alMarcarLaCasilla(edicion, false);
    expect(edicion).toMatchObject({ muestraEnReportesSat: false, motivoFueraDelLibro: 'sin_fel', autorizacionFel: '' });
    alMarcarLaCasilla(edicion, true);
    expect(edicion).toMatchObject({ muestraEnReportesSat: true, motivoFueraDelLibro: null, nitReceptor: '' });
  });

  it('a consumidor final el receptor es CF; a otro NIT no se deja CF', () => {
    const edicion = edicionVacia(HOY);
    edicion.motivoFueraDelLibro = 'fel_a_consumidor_final';
    alCambiarElMotivo(edicion);
    expect(edicion.nitReceptor).toBe('CF');
    edicion.motivoFueraDelLibro = 'fel_a_otro_nit';
    alCambiarElMotivo(edicion);
    expect(edicion.nitReceptor).toBe('');
  });

  it('al elegir el proveedor se pone su NIT, y las respuestas y la factura afectada se olvidan', () => {
    const edicion = {
      ...edicionVacia(HOY),
      nitEmisor: '999',
      documentoAfectadoId: 'f-1',
      respuestasFiscales: { regimenIsr: 'general' },
    };
    alElegirProveedor(edicion, { id: 'p-1', nombre: 'Agro', nit: '1234567-8' });
    expect(edicion).toMatchObject({ nitEmisor: '1234567-8', documentoAfectadoId: null, respuestasFiscales: {} });
    alElegirProveedor(edicion, { id: 'p-2', nombre: 'Informal', nit: 'CF' });
    expect(edicion.nitEmisor).toBe('');
  });
});
