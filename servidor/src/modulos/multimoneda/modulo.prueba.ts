import { describe, expect, it } from 'vitest';
import { RegistroModulos } from '../core/modulos-sistema/registro-modulos.js';
import { definicionesModulos } from '../indice.js';
import { configuracionDeMultimoneda } from './configuracion.js';
import { moduloMultimoneda } from './modulo.js';

describe('módulo de Multimoneda', () => {
  it('no depende de otros módulos y el registro de módulos lo acepta', () => {
    expect(moduloMultimoneda.dependeDe).toEqual([]);
    expect(() => new RegistroModulos(definicionesModulos)).not.toThrow();
  });

  it('declara un permiso por acción del reporte de tipos de cambio, sin gestionar', () => {
    expect(moduloMultimoneda.permisos.map((permiso) => permiso.clave)).toEqual([
      'multimoneda.tipos-de-cambio.ver',
      'multimoneda.tipos-de-cambio.exportar',
    ]);
  });

  it('declara el método del diferencial en los niveles instalación y empresa, acumulativo por omisión', () => {
    const [metodo, ...otras] = configuracionDeMultimoneda;

    expect(otras).toEqual([]);
    expect(metodo).toMatchObject({
      clave: 'multimoneda.diferencial.metodo',
      predeterminado: 'acumulativo',
      niveles: ['instalacion', 'empresa'],
      publica: true,
    });
    expect(metodo!.esquema.safeParse('reversion').success).toBe(true);
    expect(metodo!.esquema.safeParse('otro').success).toBe(false);
  });
});
