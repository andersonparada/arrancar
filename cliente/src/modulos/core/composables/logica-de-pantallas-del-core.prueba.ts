import { describe, expect, it } from 'vitest';
import type { VariableConfiguracion } from '../servicios/configuracion.api';
import type { EstadoModulo } from '../servicios/plataforma.api';
import type { Rol } from '../servicios/roles.api';
import { borradoresDe, nivelesEditables, valorParaGuardar } from './configuracion/valores-de-configuracion';
import { altaVacia, datosDelAlta, modulosContratables, requisitosDe } from './plataforma/alta-de-cuenta';
import { datosDelRol, edicionDe, resumenDePermisos } from './roles/edicion-de-rol';

describe('roles', () => {
  const encargado: Rol = {
    id: 'r1',
    nombre: 'Encargado',
    descripcion: null,
    accesoTotal: false,
    permisos: ['terceros.ver'],
    totalUsuarios: 2,
  };

  it('al editar copia los permisos: marcar casillas no cambia el rol listado', () => {
    const edicion = edicionDe(encargado);
    edicion.permisos.push('usuarios.ver');

    expect(encargado.permisos).toEqual(['terceros.ver']);
  });

  it('una descripción vacía se guarda como nada', () => {
    expect(datosDelRol({ ...edicionDe(), nombre: 'Peón' }).descripcion).toBeNull();
  });

  it('resume sus permisos y a cuántos usuarios se asignó', () => {
    expect(resumenDePermisos(encargado)).toBe('1 permiso · 2 asignaciones');
    expect(resumenDePermisos({ ...encargado, accesoTotal: true })).toMatch(/^Todos los permisos/);
  });
});

describe('configuración', () => {
  const decimales: VariableConfiguracion = {
    clave: 'core.regional.decimales_montos',
    descripcion: 'Decimales',
    niveles: ['instalacion', 'cuenta', 'empresa'],
    predeterminado: 2,
    valores: { cuenta: 3 },
    efectivo: 3,
    origen: 'cuenta',
  };

  it('solo cuenta y empresa se editan desde la pantalla', () => {
    expect(nivelesEditables(decimales)).toEqual(['cuenta', 'empresa']);
  });

  it('cada nivel empieza con su valor guardado, o vacío si lo hereda', () => {
    expect(borradoresDe([decimales])).toEqual({
      'core.regional.decimales_montos:cuenta': 3,
      'core.regional.decimales_montos:empresa': null,
    });
  });

  it('una variable numérica se guarda como número aunque el campo dé texto', () => {
    expect(valorParaGuardar(decimales, '4')).toBe(4);
  });
});

describe('alta de cuenta', () => {
  const modulo = (clave: string, dependeDe: string[] = [], esencial = false): EstadoModulo => ({
    clave,
    nombre: clave.toUpperCase(),
    descripcion: '',
    esencial,
    dependeDe,
    activo: false,
  });
  const catalogo = [modulo('core', [], true), modulo('terceros'), modulo('ventas', ['terceros'])];

  it('los módulos esenciales no se eligen', () => {
    expect(modulosContratables(catalogo).map((m) => m.clave)).toEqual(['terceros', 'ventas']);
  });

  it('dice de qué módulos depende otro, por su nombre', () => {
    expect(requisitosDe(catalogo[2]!, catalogo)).toBe('Requiere: TERCEROS.');
    expect(requisitosDe(catalogo[1]!, catalogo)).toBe('');
  });

  it('no manda lo opcional vacío y el usuario va en minúsculas', () => {
    const datos = datosDelAlta({ ...altaVacia(), usuario: ' JPerez ' });

    expect(datos.propietario).toMatchObject({ usuario: 'jperez', correo: null, contrasena: undefined });
    expect(datos.empresa.nit).toBeUndefined();
  });
});
