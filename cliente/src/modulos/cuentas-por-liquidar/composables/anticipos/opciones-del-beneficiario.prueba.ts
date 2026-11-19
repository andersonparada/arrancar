import { describe, expect, it } from 'vitest';
import type { Usuario } from '@/modulos/core/servicios/usuarios.api';
import {
  beneficiarioNuevoVacio,
  datosDelBeneficiarioNuevo,
  erroresDelBeneficiarioNuevo,
  opcionesDeBeneficiarios,
  opcionesDeUsuarios,
} from './opciones-del-beneficiario';

const usuario = (id: string, nombres: string, cambios: Partial<Usuario> = {}) =>
  ({
    id,
    nombres,
    apellidos: 'Pérez',
    usuario: nombres.toLowerCase(),
    activo: true,
    empresas: [{ empresaId: 'e-1' }],
    ...cambios,
  }) as unknown as Usuario;

describe('los beneficiarios', () => {
  it('van por nombre, sin los inactivos, con el NIT para no confundir homónimos', () => {
    const opciones = opcionesDeBeneficiarios([
      { id: 'b-2', nombreMostrar: 'Zoila Ruiz', nit: null, activo: true },
      { id: 'b-1', nombreMostrar: 'Ana López', nit: '1234567', activo: true },
      { id: 'b-3', nombreMostrar: 'Baja', nit: null, activo: false },
    ]);
    expect(opciones.map(({ valor }) => valor)).toEqual(['b-1', 'b-2']);
    expect(opciones[0]?.texto).toContain('NIT');
  });
});

describe('los usuarios', () => {
  it('ofrecen «no es usuario» primero y luego los activos de la empresa, por nombre', () => {
    const opciones = opcionesDeUsuarios(
      [
        usuario('u-2', 'Zoila'),
        usuario('u-1', 'Ana'),
        usuario('u-3', 'Inactivo', { activo: false }),
        usuario('u-4', 'Ajeno', { empresas: [{ empresaId: 'otra' }] } as Partial<Usuario>),
      ],
      'e-1',
    );
    expect(opciones.map(({ valor }) => valor)).toEqual(['', 'u-1', 'u-2']);
  });
});

describe('el alta rápida', () => {
  it('una persona pide los nombres; una empresa, la razón social', () => {
    expect(erroresDelBeneficiarioNuevo(beneficiarioNuevoVacio()).nombres).toContain('nombres');
    expect(erroresDelBeneficiarioNuevo({ ...beneficiarioNuevoVacio(), tipo: 'juridica' }).razonSocial).toContain(
      'razón social',
    );
    expect(erroresDelBeneficiarioNuevo({ ...beneficiarioNuevoVacio(), nombres: 'Ana' })).toEqual({});
  });

  it('manda solo lo que corresponde al tipo', () => {
    expect(
      datosDelBeneficiarioNuevo({ tipo: 'individual', nombres: ' Ana ', apellidos: '', razonSocial: 'x' }),
    ).toEqual({
      tipo: 'individual',
      nombres: 'Ana',
      apellidos: null,
      razonSocial: null,
    });
    expect(
      datosDelBeneficiarioNuevo({ tipo: 'juridica', nombres: 'x', apellidos: 'y', razonSocial: ' Finca SA ' }),
    ).toEqual({
      tipo: 'juridica',
      nombres: null,
      apellidos: null,
      razonSocial: 'Finca SA',
    });
  });
});
