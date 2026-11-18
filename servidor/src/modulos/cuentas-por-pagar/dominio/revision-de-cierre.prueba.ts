import { describe, expect, it } from 'vitest';
import {
  fechaDeCorteDeApertura,
  revisionDeCierreDeCuentasPorPagar,
  type DatosDeLaRevision,
  type SumasDelProveedor,
} from './revision-de-cierre.js';

const proveedor = (valores: Partial<SumasDelProveedor> = {}): SumasDelProveedor => ({
  documentos: 1,
  documentosConRetenciones: 0,
  cargosCentavos: 100_00,
  notasAFavorCentavos: 0,
  retencionesPorPracticarCentavos: 0,
  ...valores,
});

const revisar = (datos: Partial<DatosDeLaRevision> = {}) =>
  revisionDeCierreDeCuentasPorPagar({
    fechaDeInicio: '2026-01-01',
    proveedores: [proveedor()],
    librosAnteriores: { cantidad: 0, montoCentavos: 0 },
    ...datos,
  });

const codigos = (datos?: Partial<DatosDeLaRevision>) => revisar(datos).hallazgos.map((hallazgo) => hallazgo.codigo);
const cifraDe = (clave: string, datos?: Partial<DatosDeLaRevision>) =>
  revisar(datos).cifras.find((cifra) => cifra.clave === clave)?.valor;

describe('revisión de Cuentas por pagar al cerrar la carga inicial', () => {
  it('sin hallazgos trae el resumen y las cifras', () => {
    const revision = revisar({ proveedores: [proveedor({ documentos: 3 }), proveedor({ documentos: 2 })] });

    expect(revision).toMatchObject({
      nombreDelModulo: 'Cuentas por pagar',
      resumen: '5 documentos de 2 proveedores',
      ruta: '/cuentas-por-pagar/saldos-iniciales',
      hallazgos: [],
    });
  });

  it('sin ningún saldo inicial avisa con la fecha del día anterior al inicio y cifras en cero', () => {
    const revision = revisar({ proveedores: [], fechaDeInicio: '2026-01-01' });

    expect(revision.resumen).toBeNull();
    expect(revision.hallazgos).toEqual([
      expect.objectContaining({
        codigo: 'sin_saldos_iniciales',
        nivel: 'aviso',
        mensaje: expect.stringContaining('al 31/12/2025'),
      }),
    ]);
    expect(cifraDe('saldo_de_proveedores', { proveedores: [] })).toBe('0.00');
  });

  it('las retenciones por practicar avisan con el texto del dictamen y la fecha de inicio', () => {
    const revision = revisar({
      fechaDeInicio: '2026-03-01',
      proveedores: [
        proveedor({ documentosConRetenciones: 2, retencionesPorPracticarCentavos: 1_250_50 }),
        proveedor({ documentosConRetenciones: 1, retencionesPorPracticarCentavos: 100_00 }),
      ],
    });

    expect(revision.hallazgos).toEqual([
      expect.objectContaining({
        codigo: 'retenciones_por_practicar',
        mensaje:
          '3 documentos con retenciones por practicar por Q1,350.50. Verifique que no se hayan acreditado en cuenta ' +
          'antes del 01/03/2026: si así fue, la retención ya debía practicarse y enterarse.',
      }),
    ]);
  });

  it('un documento del Libro de compras anterior a la fecha de inicio avisa con su cuenta y su monto', () => {
    const revision = revisar({ librosAnteriores: { cantidad: 1, montoCentavos: 560_00 } });

    expect(revision.hallazgos).toEqual([
      expect.objectContaining({
        codigo: 'documentos_del_libro_anteriores',
        mensaje:
          '1 documento del Libro de compras, por Q560.00, tiene fecha de emisión anterior al 01/01/2026 y no es saldo ' +
          'inicial: si se debían a esa fecha, deben estar en el balance de apertura y no contarse dos veces.',
      }),
    ]);
    expect(codigos({ librosAnteriores: { cantidad: 2, montoCentavos: 10_00 } })).toEqual([
      'documentos_del_libro_anteriores',
    ]);
  });

  it('un proveedor con neto negativo avisa y alimenta el saldo a favor de la empresa', () => {
    const revision = revisar({
      proveedores: [proveedor({ cargosCentavos: 50_00, notasAFavorCentavos: 200_00 }), proveedor()],
    });

    expect(revision.hallazgos).toEqual([
      expect.objectContaining({
        codigo: 'proveedores_con_saldo_a_favor',
        mensaje:
          '1 proveedor tiene saldo a favor de la empresa por Q150.00: en el balance de apertura van como anticipo ' +
          '(activo), sin restarlos de Proveedores.',
      }),
    ]);
  });

  it('el saldo de proveedores y el saldo a favor no se compensan entre proveedores', () => {
    const proveedores = [
      proveedor({ cargosCentavos: 1_000_00 }),
      proveedor({ cargosCentavos: 100_00, notasAFavorCentavos: 400_00 }),
    ];

    expect(cifraDe('saldo_de_proveedores', { proveedores })).toBe('1000.00');
    expect(cifraDe('saldo_a_favor_de_la_empresa', { proveedores })).toBe('300.00');
    expect(cifraDe('cargos', { proveedores })).toBe('1100.00');
    expect(cifraDe('notas_a_favor', { proveedores })).toBe('400.00');
    expect(cifraDe('proveedores', { proveedores })).toBe('2');
  });

  it('las retenciones por practicar son una cifra aparte', () => {
    const proveedores = [proveedor({ retencionesPorPracticarCentavos: 75_25 })];

    expect(cifraDe('retenciones_por_practicar', { proveedores })).toBe('75.25');
  });
});

describe('fecha de corte de la apertura', () => {
  it('es el día anterior a la fecha de inicio, también cruzando mes y año', () => {
    expect(fechaDeCorteDeApertura('2026-03-01')).toBe('2026-02-28');
    expect(fechaDeCorteDeApertura('2026-01-01')).toBe('2025-12-31');
    expect(fechaDeCorteDeApertura('2024-03-01')).toBe('2024-02-29');
  });
});
