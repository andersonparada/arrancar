import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ImpresionDeContrasena } from '../../servicios/tipos-de-contrasenas';
import {
  lineasDeEmpresa,
  nombreDeCargoImpreso,
  pieDeImpresion,
  retencionPorEmitirDe,
  textoAlDia,
  tituloDelDocumento,
} from './impresion-de-contrasena';

const impresion = (cambios: Partial<ImpresionDeContrasena> = {}): ImpresionDeContrasena => ({
  empresa: { nombre: 'Finca Luz', nit: '1-9', razonSocial: 'Finca Luz, S.A.', nombreComercial: 'Finca Luz' },
  contrasena: {
    id: 'c1',
    numero: '2026-15',
    fecha: '2026-11-10',
    fechaDePago: '2026-12-10',
    observaciones: null,
    estado: 'vigente',
  },
  proveedor: { nombre: 'Agro S.A.', nit: '1234567-8' },
  hojas: [
    { rotulo: 'ORIGINAL — PROVEEDOR', firmaElProveedor: false },
    { rotulo: 'COPIA — EMPRESA', firmaElProveedor: true },
  ],
  cargos: [],
  totales: { total: '0.00', retenciones: '0.00', rebajado: '0.00', saldo: '0.00' },
  compensaciones: [],
  retencionesPorEmitir: [
    { documentoId: 'd1', monto: '50.00', texto: 'Retención por emitir: Q50.00; se entregará su constancia' },
  ],
  hayRetenciones: true,
  leyendaDeRetenciones: null,
  leyenda: null,
  alDia: '2026-11-14',
  reimpresion: false,
  impresoPorNombre: 'Ana',
  impresoEn: '2026-11-14T15:30:00Z',
  anulacion: null,
  ...cambios,
});

describe('impresión de la contraseña', () => {
  it('rotula los montos vivos con el día de la impresión', () => {
    expect(textoAlDia('2026-11-14')).toMatch(/^al .*2026|^al .*14/);
  });

  it('nombra el cargo con su tipo, serie y número', () => {
    expect(nombreDeCargoImpreso({ tipo: 'factura', serie: 'A', numero: '123' })).toBe('Factura A-123');
    expect(nombreDeCargoImpreso({ tipo: 'recibo', serie: null, numero: '9' })).toBe('Recibo 9');
  });

  it('el nombre comercial solo sale si es distinto de la razón social', () => {
    expect(lineasDeEmpresa(impresion().empresa)).toEqual({ principal: 'Finca Luz, S.A.', comercial: 'Finca Luz' });
    expect(lineasDeEmpresa({ nombre: 'Luz', nit: null, razonSocial: null, nombreComercial: 'Luz' })).toEqual({
      principal: 'Luz',
      comercial: null,
    });
  });

  it('el pie dice quién imprimió si se sabe', () => {
    expect(pieDeImpresion(impresion())).toContain('por Ana');
    expect(pieDeImpresion(impresion({ impresoPorNombre: null }))).not.toContain(' por ');
  });

  it('busca la retención por emitir de un cargo', () => {
    expect(retencionPorEmitirDe(impresion(), 'd1')).toMatch(/Retención por emitir/);
    expect(retencionPorEmitirDe(impresion(), 'd2')).toBeNull();
  });

  it('el título del documento lleva número y proveedor', () => {
    expect(tituloDelDocumento(impresion())).toBe('Contraseña 2026-15 - Agro S.A.');
  });
});

// Los formatos de fecha y monto leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));
