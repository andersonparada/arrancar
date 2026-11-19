import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Costo } from '../../servicios/costos.api';
import { pestanaTrasLaTecla } from '../activos/navegacion-por-pestanas';
import {
  datosDeCosto,
  detallesDeCosto,
  edicionDeCostoNueva,
  erroresDeCosto,
  mensajeDeAnulacionDeCosto,
  nombreDeClaseDeCosto,
  procedenciaDeCosto,
  totalTrasAnular,
} from './edicion-de-costo';

beforeEach(() => setActivePinia(createPinia()));

const costo = (cambios: Partial<Costo> = {}): Costo => ({
  id: 'c1',
  activoId: 'a1',
  origen: 'manual',
  claseDeCosto: 'importacion',
  documentoDeCompraId: null,
  lineaDeDocumentoId: null,
  documento: null,
  proveedorNombre: null,
  fecha: '2026-11-01',
  monto: '1500.00',
  aplicaAlLibroFiscal: true,
  motivoFueraDelLibroFiscal: null,
  noEsEdificacion: false,
  documentoDeSoporte: 'DUCA 26-0000123',
  descripcion: null,
  estado: 'vigente',
  anuladoEn: null,
  motivoDeAnulacion: null,
  ...cambios,
});

describe('costo manual', () => {
  const llena = () => ({
    ...edicionDeCostoNueva('2026-11-19'),
    monto: '250.50',
    documentoDeSoporte: ' DUCA 1 ',
  });

  it('empieza con la fecha dada, como adquisición y dentro del libro fiscal', () => {
    expect(edicionDeCostoNueva('2026-11-19')).toMatchObject({
      fecha: '2026-11-19',
      claseDeCosto: 'adquisicion',
      aplicaAlLibroFiscal: true,
    });
  });

  it('pide monto, soporte y, fuera del libro fiscal, el motivo, diciendo cómo corregir', () => {
    expect(erroresDeCosto(llena())).toEqual({});
    expect(Object.keys(erroresDeCosto(edicionDeCostoNueva('2026-11-19'))).sort()).toEqual([
      'documentoDeSoporte',
      'monto',
    ]);
    expect(erroresDeCosto({ ...llena(), monto: '0' }).monto).toMatch(/distinto de cero/);
    expect(erroresDeCosto({ ...llena(), monto: '10.123' }).monto).toBeDefined();
    expect(erroresDeCosto({ ...llena(), aplicaAlLibroFiscal: false }).motivoFueraDelLibroFiscal).toMatch(/por qué/);
  });

  it('manda lo vacío como null y el motivo solo si queda fuera del libro fiscal', () => {
    expect(datosDeCosto(llena(), false)).toMatchObject({
      monto: '250.50',
      documentoDeSoporte: 'DUCA 1',
      descripcion: null,
      motivoFueraDelLibroFiscal: null,
      noEsEdificacion: false,
    });
    const fuera = { ...llena(), aplicaAlLibroFiscal: false, motivoFueraDelLibroFiscal: ' sin factura ' };
    expect(datosDeCosto(fuera, false)).toMatchObject({
      aplicaAlLibroFiscal: false,
      motivoFueraDelLibroFiscal: 'sin factura',
    });
  });

  it('«no es edificación» solo se manda si el activo es un edificio', () => {
    const marcada = { ...llena(), noEsEdificacion: true };
    expect(datosDeCosto(marcada, true).noEsEdificacion).toBe(true);
    expect(datosDeCosto(marcada, false).noEsEdificacion).toBe(false);
  });
});

describe('lista de costos', () => {
  it('muestra la procedencia: el documento del libro o el soporte escrito', () => {
    expect(
      procedenciaDeCosto(costo({ origen: 'linea_de_compra', documento: 'A-1', proveedorNombre: 'Tractores SA' })),
    ).toBe('A-1 · Tractores SA');
    expect(procedenciaDeCosto(costo())).toBe('Escrito a mano · DUCA 26-0000123');
    expect(procedenciaDeCosto(costo({ origen: 'saldo_inicial', documentoDeSoporte: null }))).toBe('Saldo inicial');
  });

  it('nombra las clases, incluidas las de las notas', () => {
    expect(nombreDeClaseDeCosto('nota_de_credito')).toBe('Nota de crédito');
    expect(nombreDeClaseDeCosto('flete')).toBe('Flete');
  });

  it('en los detalles de un costo anulado va el motivo, y el de fuera del libro fiscal lo explica', () => {
    const etiquetas = detallesDeCosto(
      costo({
        estado: 'anulado',
        motivoDeAnulacion: 'Error',
        aplicaAlLibroFiscal: false,
        motivoFueraDelLibroFiscal: 'Sin DTE',
      }),
    ).map((d) => d.etiqueta);
    expect(etiquetas).toEqual(expect.arrayContaining(['Anulado', 'Fuera del libro fiscal']));
  });
});

describe('anular un costo', () => {
  it('calcula el costo que queda, también con una nota de crédito', () => {
    expect(totalTrasAnular('5000.00', { monto: '1500.00' })).toBe('3500.00');
    expect(totalTrasAnular('5000.00', { monto: '-200.00' })).toBe('5200.00');
  });

  it('la confirmación dice qué se anula y cómo queda, y avisa si la línea vuelve a la bandeja', () => {
    const manual = mensajeDeAnulacionDeCosto(costo(), '5000.00');
    expect(manual).toContain('Importación');
    expect(manual).not.toContain('Por capitalizar');
    const delLibro = mensajeDeAnulacionDeCosto(costo({ origen: 'linea_de_compra' }), '5000.00');
    expect(delLibro).toContain('Por capitalizar');
  });
});

describe('pestañas con el teclado', () => {
  const claves = ['datos', 'costos'] as const;

  it('las flechas dan la vuelta y Inicio y Fin van a los extremos', () => {
    expect(pestanaTrasLaTecla(claves, 'datos', 'ArrowRight')).toBe('costos');
    expect(pestanaTrasLaTecla(claves, 'costos', 'ArrowRight')).toBe('datos');
    expect(pestanaTrasLaTecla(claves, 'datos', 'ArrowLeft')).toBe('costos');
    expect(pestanaTrasLaTecla(claves, 'costos', 'Home')).toBe('datos');
    expect(pestanaTrasLaTecla(claves, 'datos', 'End')).toBe('costos');
    expect(pestanaTrasLaTecla(claves, 'datos', 'a')).toBeNull();
  });
});
