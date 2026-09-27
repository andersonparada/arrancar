import { describe, expect, it } from 'vitest';
import { ModuloEnUso } from './errores.js';
import type { DefinicionModulo } from './definicion-modulo.js';
import { RegistroModulos } from './registro-modulos.js';

const modulo = (clave: string, extra: Partial<DefinicionModulo> = {}): DefinicionModulo => ({
  clave,
  nombre: clave.charAt(0).toUpperCase() + clave.slice(1),
  descripcion: '',
  permisos: [{ clave: `${clave}.ver`, descripcion: '' }],
  ...extra,
});

const crearRegistro = () =>
  new RegistroModulos([
    modulo('core', { esencial: true }),
    modulo('bancos'),
    modulo('caja-chica', { dependeDe: ['bancos'] }),
    modulo('moneda-extranjera'),
  ]);

describe('RegistroModulos', () => {
  it('incluye siempre los esenciales e ignora claves desconocidas', () => {
    const activos = crearRegistro().resolverActivos(['bancos', 'modulo-borrado']);
    expect([...activos].sort()).toEqual(['bancos', 'core']);
  });

  it('no permite activar un módulo sin sus dependencias', () => {
    const registro = crearRegistro();
    expect(() => registro.validarActivacion('caja-chica', new Set(['core']))).toThrow(/depende de: Bancos/);
    expect(() => registro.validarActivacion('caja-chica', new Set(['core', 'bancos']))).not.toThrow();
  });

  it('no permite desactivar un módulo del que depende otro activo', () => {
    const registro = crearRegistro();
    expect(() => registro.validarDesactivacion('bancos', new Set(['core', 'bancos', 'caja-chica']))).toThrow(
      ModuloEnUso,
    );
    expect(() => registro.validarDesactivacion('bancos', new Set(['core', 'bancos']))).not.toThrow();
  });

  it('no permite desactivar un módulo esencial', () => {
    expect(() => crearRegistro().validarDesactivacion('core', new Set(['core']))).toThrow(/esencial/);
  });

  it('encuentra el módulo dueño de un permiso', () => {
    expect(crearRegistro().moduloDelPermiso('caja-chica.ver')).toBe('caja-chica');
    expect(crearRegistro().moduloDelPermiso('no.existe')).toBeUndefined();
  });

  it('falla al arrancar si un módulo depende de otro que no está instalado', () => {
    expect(() => new RegistroModulos([modulo('caja-chica', { dependeDe: ['bancos'] })])).toThrow(/no está registrado/);
  });

  it('falla si un módulo se registra dos veces', () => {
    expect(() => new RegistroModulos([modulo('bancos'), modulo('bancos')])).toThrow(/dos veces/);
  });
});
