import { describe, expect, it } from 'vitest';
import { NoPuedeCambiarseASiMismo, UsuarioDeVariasCuentas } from './errores.js';
import { NombreDeUsuario } from './nombre-de-usuario.js';
import { Usuario } from './usuario.js';

const juan = () =>
  Usuario.registrar({
    nombreDeUsuario: NombreDeUsuario.crear('JLopez '),
    nombres: 'Juan',
    apellidos: 'López',
    correo: null,
    hashContrasena: 'hash',
  });
const deEstaCuenta = { esElMismo: false, soloEnEstaCuenta: true };
const deVariasCuentas = { esElMismo: false, soloEnEstaCuenta: false };
const elMismo = { esElMismo: true, soloEnEstaCuenta: true };

describe('Usuario', () => {
  it('guarda el nombre de usuario en minúsculas y nace activo', () => {
    const usuario = juan();

    expect(usuario.instantanea().nombreDeUsuario.valor).toBe('jlopez');
    expect(usuario.activo).toBe(true);
  });

  it('solo cambia lo que se indicó', () => {
    const usuario = juan();

    usuario.cambiar({ nombres: 'Juan Carlos', apellidos: undefined }, deEstaCuenta);

    expect(usuario.instantanea()).toMatchObject({ nombres: 'Juan Carlos', apellidos: 'López' });
  });

  it('quien administra no puede desactivarse ni cambiar sus propios accesos', () => {
    const usuario = juan();

    expect(() => usuario.cambiar({ activo: false }, elMismo)).toThrow(NoPuedeCambiarseASiMismo);
    expect(() => usuario.exigirQueSePuedanCambiarSusAccesos(elMismo)).toThrow(NoPuedeCambiarseASiMismo);
  });

  it('si trabaja para otra cuenta, sus datos y su contraseña no se tocan desde esta', () => {
    const usuario = juan();

    expect(() => usuario.cambiar({ nombres: 'Otro' }, deVariasCuentas)).toThrow(UsuarioDeVariasCuentas);
    expect(() => usuario.cambiarContrasena('nuevo', deVariasCuentas)).toThrow(UsuarioDeVariasCuentas);
    expect(() => usuario.cambiar({}, deVariasCuentas)).not.toThrow();
  });
});
