import { describe, expect, it } from 'vitest';
import { armarDocumentoDeVenta, type ContextoDelArmado, type SolicitudArmada } from './armado-del-documento.js';

const CONCEPTO = '22222222-2222-4222-8222-222222222222';
const CLIENTE = {
  id: '44444444-4444-4444-8444-444444444444',
  nit: '576937K',
  dpi: null,
  nombre: 'Distribuidora Quiroa',
};

const solicitud = (cambios: Partial<SolicitudArmada> = {}): SolicitudArmada => ({
  tipo: 'factura',
  tipoDte: null,
  clienteId: CLIENTE.id,
  serie: 'a',
  numero: '15',
  autorizacionFel: null,
  localidadId: null,
  fechaEmision: '2026-03-15',
  documentoAfectadoId: null,
  facturaAnterior: null,
  ivaDelDte: null,
  observaciones: null,
  lineas: [
    {
      conceptoDeIngresoId: CONCEPTO,
      tipo: 'bien',
      claseFiscal: 'gravada',
      descripcion: null,
      total: 11200,
      otrosImpuestos: 0,
    },
  ],
  ...cambios,
});

const contexto = (cambios: Partial<ContextoDelArmado> = {}): ContextoDelArmado => ({
  empresaId: '55555555-5555-4555-8555-555555555555',
  fechaDeInicio: null,
  regimen: { regimenIva: 'general', regimenIsr: 'utilidades' },
  regimenDeLaFacturaAnterior: null,
  tasaDeIva: 1200,
  fechaDeDerogacion: '2025-07-09',
  cliente: CLIENTE,
  facturaAfectada: null,
  destinosActivos: [],
  consumidorFinal: 'sin_cartera',
  ...cambios,
});

const nota = (cambios: Partial<SolicitudArmada> = {}) =>
  solicitud({ tipo: 'nota_de_credito', fechaEmision: '2026-03-20', ...cambios });

describe('una nota sobre una factura del sistema anterior', () => {
  const anterior = { serie: 'A', numero: '9', fecha: '2025-12-01' };
  const desdeAnterior = (cambios: Partial<SolicitudArmada> = {}) =>
    nota({ documentoAfectadoId: null, facturaAnterior: anterior, fechaEmision: '2026-03-10', ...cambios });
  const enGeneral = { regimenIva: 'general', regimenIsr: 'utilidades' } as const;
  const enPequeno = { regimenIva: 'pequeno_contribuyente', regimenIsr: null } as const;

  it('el IVA del DTE manda aunque el régimen del mes de la nota sea otro', () => {
    const sinIva = armarDocumentoDeVenta(
      desdeAnterior({ ivaDelDte: 0 }),
      contexto({ fechaDeInicio: '2026-01-01', regimenDeLaFacturaAnterior: enGeneral }),
    );
    expect(sinIva.documento.totales).toMatchObject({ iva: 0, total: 11200 });
    expect(sinIva.avisos.join(' ')).toContain('no concuerda');

    const conIva = armarDocumentoDeVenta(
      desdeAnterior({ ivaDelDte: 1200 }),
      contexto({ fechaDeInicio: '2026-01-01', regimen: enPequeno, regimenDeLaFacturaAnterior: enPequeno }),
    );
    expect(conIva.documento.totales.iva).toBe(1200);
  });

  it('IVA 0 sobre una venta exenta de una factura en régimen general no da aviso falso', () => {
    const exenta = desdeAnterior({
      ivaDelDte: 0,
      lineas: [{ ...solicitud().lineas[0]!, claseFiscal: 'exenta' }],
    });

    const { documento, avisos } = armarDocumentoDeVenta(
      exenta,
      contexto({ fechaDeInicio: '2026-01-01', regimenDeLaFacturaAnterior: enGeneral }),
    );

    expect(documento.totales.iva).toBe(0);
    expect(avisos.join(' ')).not.toContain('no concuerda');
  });

  it('una nota con IVA sobre una factura de un régimen sin débito se registra y avisa', () => {
    const { documento, avisos } = armarDocumentoDeVenta(
      desdeAnterior({ ivaDelDte: 1200 }),
      contexto({ fechaDeInicio: '2026-01-01', regimen: enPequeno, regimenDeLaFacturaAnterior: enPequeno }),
    );

    expect(documento.totales.iva).toBe(1200);
    expect(avisos.join(' ')).toContain('no concuerda');
  });

  it('sin IVA del DTE usa el régimen del mes de la factura, no el de la nota', () => {
    const contextoDe = (anteriorEn: ContextoDelArmado['regimenDeLaFacturaAnterior']) =>
      contexto({ fechaDeInicio: '2026-01-01', regimen: enGeneral, regimenDeLaFacturaAnterior: anteriorEn });

    expect(armarDocumentoDeVenta(desdeAnterior(), contextoDe(enPequeno)).documento.totales.iva).toBe(0);
    expect(armarDocumentoDeVenta(desdeAnterior(), contextoDe(enGeneral)).documento.totales.iva).toBe(1200);
  });

  it('sin historial de ese mes usa el de la nota y avisa', () => {
    const { documento, avisos } = armarDocumentoDeVenta(desdeAnterior(), contexto({ fechaDeInicio: '2026-01-01' }));

    expect(documento.totales.iva).toBe(1200);
    expect(avisos.join(' ')).toContain('No hay historial fiscal');
  });
});
