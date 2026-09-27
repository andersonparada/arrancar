import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Nit } from '../../core/compartido/dominio/objetos-valor/nit.js';
import { Telefono } from '../../core/compartido/dominio/objetos-valor/telefono.js';
import { Empresa, type DatosDeEmpresa } from './empresa.js';
import { NoSePuedeDesactivarLaEmpresaEnUso, NombreDeEmpresaInvalido } from './errores.js';

const cuentaId = Identificador.desde<'Cuenta'>(crypto.randomUUID());

function datos(cambios: Partial<DatosDeEmpresa> = {}): DatosDeEmpresa {
  return {
    nombre: 'Rancho El Arrancar',
    nit: Nit.crear('12345679'),
    direccion: null,
    telefono: null,
    correo: null,
    activa: true,
    ...cambios,
  };
}

describe('registro de una empresa', () => {
  it('nace en quetzales, en la cuenta indicada y con el nombre sin espacios sobrantes', () => {
    const empresa = Empresa.registrar(cuentaId, datos({ nombre: '  Finca La Esperanza  ' }));

    expect(empresa.instantanea()).toMatchObject({ nombre: 'Finca La Esperanza', monedaBase: 'GTQ', cuentaId });
  });

  it('avisa que se registró', () => {
    const empresa = Empresa.registrar(cuentaId, datos());

    expect(empresa.extraerEventos()).toEqual([
      expect.objectContaining({
        nombre: 'empresas.registrada',
        datos: { empresaId: empresa.id.valor, cuentaId: cuentaId.valor },
      }),
    ]);
  });

  it.each(['', '   ', 'x'.repeat(121)])('no acepta un nombre vacío o demasiado largo', (nombre) => {
    expect(() => Empresa.registrar(cuentaId, datos({ nombre }))).toThrow(NombreDeEmpresaInvalido);
  });
});

describe('cambio de datos', () => {
  it('cambia los datos generales', () => {
    const empresa = Empresa.registrar(cuentaId, datos());

    const telefono = Telefono.crear('5555-1234');

    empresa.cambiarDatos(datos({ nombre: 'Rancho Nuevo', telefono }), Identificador.nuevo());

    expect(empresa.instantanea()).toMatchObject({ nombre: 'Rancho Nuevo', telefono });
  });

  it('puede desactivar otra empresa, pero no la que está en uso', () => {
    const empresa = Empresa.registrar(cuentaId, datos());

    expect(() => empresa.cambiarDatos(datos({ activa: false }), Identificador.nuevo())).not.toThrow();
    expect(() => empresa.cambiarDatos(datos({ activa: false }), empresa.id)).toThrow(NoSePuedeDesactivarLaEmpresaEnUso);
  });
});
