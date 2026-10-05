import { describe, expect, it } from 'vitest';
import {
  AVISO_FACTURA_ESPECIAL,
  AVISO_NO_DEDUCIBLE,
  FelAlNitDeLaEmpresaNoSeDesmarca,
  MotivoFueraDelLibroIncoherente,
  evaluarFueraDelLibro,
  type DatosDeFueraDelLibro,
} from './fuera-del-libro.js';

const AUTORIZACION = '6f1d0c5e-0f55-4f7a-9d0e-5f3f0a0b9c11';

const datos = (cambios: Partial<DatosDeFueraDelLibro> = {}): DatosDeFueraDelLibro => ({
  motivo: 'sin_fel',
  autorizacionFel: null,
  nitReceptor: null,
  nitDeLaEmpresa: '1234567',
  proveedor: { tipoDePersona: 'juridica', nit: '7654321' },
  ...cambios,
});

describe('evaluarFueraDelLibro', () => {
  it('sin motivo el documento va en el libro y no hay avisos', () => {
    expect(evaluarFueraDelLibro(datos({ motivo: null, autorizacionFel: AUTORIZACION }))).toEqual({
      muestraEnReportesSat: true,
      avisos: [],
    });
  });

  it('un recibo sin FEL queda fuera con el aviso de gasto no deducible', () => {
    expect(evaluarFueraDelLibro(datos())).toEqual({ muestraEnReportesSat: false, avisos: [AVISO_NO_DEDUCIBLE] });
  });

  it('una persona individual sin NIT suma la sugerencia de factura especial', () => {
    const proveedor = { tipoDePersona: 'individual', nit: null } as const;

    expect(evaluarFueraDelLibro(datos({ proveedor })).avisos).toEqual([AVISO_NO_DEDUCIBLE, AVISO_FACTURA_ESPECIAL]);
  });

  it('una persona individual con NIT o una jurídica sin NIT no la reciben', () => {
    const conNit = { tipoDePersona: 'individual', nit: '99' } as const;
    const juridica = { tipoDePersona: 'juridica', nit: null } as const;

    expect(evaluarFueraDelLibro(datos({ proveedor: conNit })).avisos).toEqual([AVISO_NO_DEDUCIBLE]);
    expect(evaluarFueraDelLibro(datos({ proveedor: juridica })).avisos).toEqual([AVISO_NO_DEDUCIBLE]);
  });

  it.each(['fel_a_consumidor_final', 'fel_a_otro_nit'] as const)('%s con su autorización queda fuera', (motivo) => {
    const resultado = evaluarFueraDelLibro(datos({ motivo, autorizacionFel: AUTORIZACION, nitReceptor: 'CF' }));

    expect(resultado.muestraEnReportesSat).toBe(false);
  });

  it('una FEL al NIT de la empresa no se desmarca', () => {
    const alNit = datos({ motivo: 'fel_a_otro_nit', autorizacionFel: AUTORIZACION, nitReceptor: '1234567' });

    expect(() => evaluarFueraDelLibro(alNit)).toThrow(FelAlNitDeLaEmpresaNoSeDesmarca);
  });

  it('sin FEL no puede traer autorización, y con FEL es obligatoria', () => {
    expect(() => evaluarFueraDelLibro(datos({ autorizacionFel: AUTORIZACION }))).toThrow(
      MotivoFueraDelLibroIncoherente,
    );
    expect(() => evaluarFueraDelLibro(datos({ motivo: 'fel_a_otro_nit' }))).toThrow(MotivoFueraDelLibroIncoherente);
  });
});
