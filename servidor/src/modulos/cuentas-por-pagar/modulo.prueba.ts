import { describe, expect, it } from 'vitest';
import { RegistroModulos } from '../core/modulos-sistema/registro-modulos.js';
import { definicionesModulos } from '../indice.js';
import { configuracionDeCuentasPorPagar } from './configuracion.js';
import { moduloCuentasPorPagar } from './modulo.js';

describe('módulo de Cuentas por pagar', () => {
  it('depende de Libro de compras y de Bancos, y el registro de módulos lo acepta', () => {
    expect(moduloCuentasPorPagar.dependeDe).toEqual(['libro-de-compras', 'bancos']);
    expect(() => new RegistroModulos(definicionesModulos)).not.toThrow();
  });

  it('declara un permiso por acción, sin crear ni gestionar, con el de autorizar lo propio', () => {
    const claves = moduloCuentasPorPagar.permisos.map((permiso) => permiso.clave);

    expect(claves).toEqual([
      'cuentas-por-pagar.documentos.ver',
      'cuentas-por-pagar.documentos.registrar',
      'cuentas-por-pagar.documentos.autorizar',
      'cuentas-por-pagar.documentos.autorizar-propios',
      'cuentas-por-pagar.documentos.anular',
      'cuentas-por-pagar.documentos.eliminar',
    ]);
  });

  it('el plazo por omisión es de un mes, solo de instalación y empresa, y acepta de 0 a 12', () => {
    const [meses] = configuracionDeCuentasPorPagar;

    expect(meses?.clave).toBe('cuentas-por-pagar.vencimientos.meses_por_omision');
    expect(meses?.predeterminado).toBe(1);
    expect(meses?.niveles).toEqual(['instalacion', 'empresa']);
    expect(meses?.publica).toBe(false);
    expect([0, 1, 12].map((v) => meses?.esquema.safeParse(v).success)).toEqual([true, true, true]);
    expect([-1, 13, 1.5].map((v) => meses?.esquema.safeParse(v).success)).toEqual([false, false, false]);
  });
});
