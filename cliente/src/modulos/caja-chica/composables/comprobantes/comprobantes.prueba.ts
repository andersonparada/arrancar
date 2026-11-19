import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ComprobanteDeLaBandeja } from '../../servicios/tipos-de-comprobantes';
import {
  cuerpoDeAsignacion,
  edicionDeAsignacion,
  faltantesDeLaAsignacion,
  razonDeNoMarcar,
  resumenDeAsignacion,
  sePuedeMarcar,
} from './armado-de-asignacion';
import {
  cantidadDeFiltros,
  filtrarBandeja,
  marcasDelComprobante,
  proveedoresDeLaBandeja,
  tituloDeComprobante,
} from './detalles-de-comprobante';
import { cuerpoDeVale, edicionDeVale } from './edicion-de-vale';

beforeEach(() => setActivePinia(createPinia()));

function documento(cambios: Partial<ComprobanteDeLaBandeja> = {}): ComprobanteDeLaBandeja {
  return {
    id: 'c-1',
    fondoId: null,
    clase: 'documento',
    estado: 'vigente',
    fecha: '2026-11-02',
    monto: '100.00',
    resta: false,
    esNotaDeCredito: false,
    documentoDeCompraId: 'd-1',
    proveedorId: 'p-1',
    conRetencion: false,
    montoRetenido: '0.00',
    motivoConRetencion: null,
    sobreElTope: false,
    motivoSobreElTope: null,
    sinBancarizar: false,
    numero: null,
    descripcion: null,
    pagadoA: null,
    motivoSinDocumento: null,
    asignadoEn: null,
    motivoDeAnulacion: null,
    reposicionNumero: null,
    documento: {
      tipo: 'Factura',
      serie: 'A',
      numero: '123',
      proveedorNombre: 'Ferretería La Unión',
      fechaEmision: '2026-11-02',
      total: '100.00',
      enElLibro: true,
      motivoFueraDelLibro: null,
    },
    puedeAsignarConRetencion: false,
    ...cambios,
  };
}

const conRetencion = (cambios: Partial<ComprobanteDeLaBandeja> = {}) =>
  documento({ id: 'c-r', conRetencion: true, monto: '88.00', montoRetenido: '12.00', ...cambios });

describe('asignar documentos', () => {
  it('una factura con retención solo se marca con el permiso, y se explica por qué no', () => {
    expect(sePuedeMarcar(documento())).toBe(true);
    expect(sePuedeMarcar(conRetencion())).toBe(false);
    expect(razonDeNoMarcar(conRetencion())).toContain('permiso de excepción');
    expect(sePuedeMarcar(conRetencion({ puedeAsignarConRetencion: true }))).toBe(true);
    expect(razonDeNoMarcar(documento())).toBeNull();
  });

  it('el resumen suma lo que sale del fondo, resta las notas y cuenta las retenciones', () => {
    const nota = documento({ id: 'c-n', monto: '30.00', resta: true, esNotaDeCredito: true });
    const resumen = resumenDeAsignacion([documento(), conRetencion({ puedeAsignarConRetencion: true }), nota]);
    expect(resumen).toEqual({ cantidad: 3, total: '158.00', conRetencion: 1, retenido: '12.00', notasDeCredito: 1 });
  });

  it('pide el motivo de la retención solo si hay documentos con retención', () => {
    const edicion = edicionDeAsignacion();
    expect(faltantesDeLaAsignacion([documento()], edicion)).toEqual({});
    expect(faltantesDeLaAsignacion([documento(), conRetencion()], edicion)).toHaveProperty('motivoConRetencion');
    expect(faltantesDeLaAsignacion([conRetencion()], { ...edicion, motivoConRetencion: ' x ' })).toEqual({});
  });

  it('el motivo de la retención viaja solo en los documentos con retención', () => {
    const edicion = { fecha: '', motivoConRetencion: ' Urgente ', motivoSobreElTope: '' };
    const [normal, retenido] = cuerpoDeAsignacion([documento(), conRetencion()], edicion);
    expect(normal).toEqual({ comprobanteId: 'c-1', fecha: null, motivoSobreElTope: null, motivoConRetencion: null });
    expect(retenido?.motivoConRetencion).toBe('Urgente');
  });

  it('la fecha y el motivo del tope viajan en todos', () => {
    const edicion = { fecha: '2026-11-05', motivoConRetencion: '', motivoSobreElTope: 'Compra grande' };
    const [fila] = cuerpoDeAsignacion([documento()], edicion);
    expect(fila).toMatchObject({ fecha: '2026-11-05', motivoSobreElTope: 'Compra grande' });
  });
});

describe('la bandeja', () => {
  const lista = [
    documento(),
    conRetencion({
      proveedorId: 'p-2',
      fecha: '2026-11-10',
      documento: { ...documento().documento!, proveedorNombre: 'Agro S.A.' },
    }),
  ];

  it('filtra por proveedor, fechas y retención', () => {
    expect(filtrarBandeja(lista, {})).toHaveLength(2);
    expect(filtrarBandeja(lista, { proveedorId: 'p-2' })).toHaveLength(1);
    expect(filtrarBandeja(lista, { desde: '2026-11-05' })).toHaveLength(1);
    expect(filtrarBandeja(lista, { hasta: '2026-11-05' })).toHaveLength(1);
    expect(filtrarBandeja(lista, { conRetencion: false })[0]?.id).toBe('c-1');
  });

  it('cuenta los filtros puestos y lista los proveedores por nombre', () => {
    expect(cantidadDeFiltros({})).toBe(0);
    expect(cantidadDeFiltros({ proveedorId: 'p-1', conRetencion: false })).toBe(2);
    expect(proveedoresDeLaBandeja(lista).map((p) => p.nombre)).toEqual(['Agro S.A.', 'Ferretería La Unión']);
  });
});

describe('detalles de un comprobante', () => {
  it('titula documentos, notas y vales', () => {
    expect(tituloDeComprobante(documento())).toBe('Factura A-123');
    expect(tituloDeComprobante(documento({ esNotaDeCredito: true }))).toBe('Nota de crédito A-123');
    expect(tituloDeComprobante(documento({ clase: 'vale_de_gasto', numero: 7, documento: null }))).toBe(
      'Vale de gasto N.º 7',
    );
  });

  it('marca retención, tope, bancarización, fuera del libro y repuesto', () => {
    const marcas = marcasDelComprobante(
      conRetencion({
        sobreElTope: true,
        sinBancarizar: true,
        reposicionNumero: 4,
        documento: { ...documento().documento!, enElLibro: false },
      }),
    ).map((m) => m.texto);
    expect(marcas).toHaveLength(5);
    expect(marcas).toContain('Sin bancarizar');
    expect(marcas).toContain('Repuesto en la reposición 4');
  });
});

describe('vale de gasto', () => {
  it('recorta, deja el concepto vacío para que el servidor lo reclame y no manda motivos vacíos', () => {
    const edicion = {
      ...edicionDeVale(),
      monto: 85.5,
      descripcion: ' Gasolina ',
      pagadoA: ' Juan ',
      motivoSinDocumento: ' Sin factura ',
    };
    expect(cuerpoDeVale(edicion)).toEqual({
      fecha: null,
      monto: '85.5',
      descripcion: 'Gasolina',
      pagadoA: 'Juan',
      conceptoDeGastoId: '',
      motivoSinDocumento: 'Sin factura',
      motivoSobreElTope: null,
    });
  });
});
