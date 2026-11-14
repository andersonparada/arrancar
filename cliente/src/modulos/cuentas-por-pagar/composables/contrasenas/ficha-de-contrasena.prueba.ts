import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FichaDeContrasena } from '../../servicios/tipos-de-contrasenas';
import {
  AVISO_DE_RECUPERAR_EL_ORIGINAL,
  AVISO_DE_REIMPRESION,
  cambiosDeContrasena,
  detallesDeFichaDeContrasena,
  edicionDeCambioDe,
  erroresDeCambio,
  resumenDeAgregarDocumentos,
  resumenDeAnularContrasena,
  resumenDeQuitarDocumento,
  textoDeImpresion,
} from './ficha-de-contrasena';

const ficha = (cambios: Partial<FichaDeContrasena> = {}): FichaDeContrasena => ({
  id: 'c1',
  numero: '2026-15',
  fecha: '2026-11-10',
  fechaDePago: '2026-12-10',
  proveedorId: 'p1',
  proveedorNombre: 'Agro S.A.',
  proveedorNit: '1234567-8',
  observaciones: null,
  estado: 'vigente',
  cargos: [],
  notas: [],
  totales: { total: '1000.00', retenciones: '0.00', rebajado: '0.00', saldo: '1000.00' },
  impresa: false,
  impresaEn: null,
  anulacion: null,
  creadoPorNombre: 'Ana',
  creadoEn: '2026-11-10T10:00:00Z',
  puedeEditar: true,
  puedeAnular: true,
  ...cambios,
});

describe('cambio de la contraseña', () => {
  it('sin cambios no manda nada y lo dice', () => {
    const edicion = edicionDeCambioDe(ficha());
    expect(cambiosDeContrasena(edicion, ficha())).toBeNull();
    expect(erroresDeCambio(edicion, ficha()).fechaDePago).toMatch(/No cambió nada/);
  });

  it('cambiar la fecha prometida pide el motivo y lo manda recortado', () => {
    const edicion = { ...edicionDeCambioDe(ficha()), fechaDePago: '2026-12-20' };
    expect(erroresDeCambio(edicion, ficha()).motivo).toBeTruthy();
    edicion.motivo = '  El proveedor pidió más plazo  ';
    expect(erroresDeCambio(edicion, ficha())).toEqual({});
    expect(cambiosDeContrasena(edicion, ficha())).toEqual({
      fechaDePago: '2026-12-20',
      motivo: 'El proveedor pidió más plazo',
    });
  });

  it('cambiar solo las observaciones no pide motivo y vaciarlas manda nulo', () => {
    const con = ficha({ observaciones: 'Entrega en bodega' });
    const edicion = { ...edicionDeCambioDe(con), observaciones: 'Otra' };
    expect(erroresDeCambio(edicion, con)).toEqual({});
    expect(cambiosDeContrasena(edicion, con)).toEqual({ observaciones: 'Otra' });
    expect(cambiosDeContrasena({ ...edicion, observaciones: '  ' }, con)).toEqual({ observaciones: null });
  });

  it('la fecha prometida no puede ser anterior a la de la contraseña ni estar vacía', () => {
    const anterior = { ...edicionDeCambioDe(ficha()), fechaDePago: '2026-11-01', motivo: 'x' };
    expect(erroresDeCambio(anterior, ficha()).fechaDePago).toMatch(/anterior a la fecha de la contraseña/);
    expect(erroresDeCambio({ ...anterior, fechaDePago: '' }, ficha()).fechaDePago).toMatch(/Escriba/);
  });

  it('las observaciones largas dan error', () => {
    const edicion = { ...edicionDeCambioDe(ficha()), observaciones: 'a'.repeat(501) };
    expect(erroresDeCambio(edicion, ficha()).observaciones).toBeTruthy();
  });
});

describe('textos de la ficha', () => {
  it('la impresión dice si ya se imprimió', () => {
    expect(textoDeImpresion(ficha())).toBe('Sin imprimir');
    expect(textoDeImpresion(ficha({ impresa: true, impresaEn: '2026-11-11T15:30:00Z' }))).toMatch(/^Impresa el /);
  });

  it('quitar y agregar avisan de la reimpresión solo si ya se imprimió', () => {
    expect(resumenDeQuitarDocumento(ficha(), 'el documento A-1')).not.toContain('REIMPRESIÓN');
    expect(resumenDeQuitarDocumento(ficha({ impresa: true }), 'el documento A-1')).toContain(AVISO_DE_REIMPRESION);
    expect(resumenDeAgregarDocumentos(ficha(), 2)).toContain('2 documentos');
    expect(resumenDeAgregarDocumentos(ficha({ impresa: true }), 1)).toContain('REIMPRESIÓN');
  });

  it('anular avisa de recuperar el original solo si ya se imprimió', () => {
    expect(resumenDeAnularContrasena(ficha())).not.toContain(AVISO_DE_RECUPERAR_EL_ORIGINAL);
    expect(resumenDeAnularContrasena(ficha({ impresa: true }))).toContain(AVISO_DE_RECUPERAR_EL_ORIGINAL);
  });

  it('los datos de la ficha traen proveedor, fechas y observaciones', () => {
    const etiquetas = detallesDeFichaDeContrasena(ficha()).map((d) => d.etiqueta);
    expect(etiquetas).toEqual(expect.arrayContaining(['Proveedor', 'Pago prometido', 'Impresión', 'Observaciones']));
  });
});

// Los formatos de fecha y monto leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));
