import { describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../compartido/aplicacion/errores.js';
import type { Operador } from '../../compartido/aplicacion/operador.js';
import type { Usuario } from '../dominio/usuario.js';
import type { PertenenciaEnCuentas, RepositorioUsuarios } from './puertos/repositorio-usuarios.js';
import { usuarioDeLaCuenta } from './usuario-de-la-cuenta.js';

const operador = { usuarioId: 'admin', cuentaId: 'cuenta-a' } as Operador;
const usuarioId = '5f0d3a52-33a7-4d19-8c51-0b4a3a9b0c11';

function repositorioCon(pertenencia: PertenenciaEnCuentas, esSuperacceso = false): RepositorioUsuarios {
  const usuario = { id: { valor: usuarioId }, esSuperacceso } as unknown as Usuario;
  return { buscar: async () => usuario, pertenenciaEn: async () => pertenencia } as unknown as RepositorioUsuarios;
}

describe('usuarioDeLaCuenta', () => {
  it('un usuario solo de esta cuenta puede administrarse por completo', async () => {
    const repositorio = repositorioCon({ enLaCuenta: true, otrasCuentas: 0 });

    const resultado = await usuarioDeLaCuenta(repositorio, usuarioId, operador);

    expect(resultado.pertenencia).toEqual({ esElMismo: false, soloEnEstaCuenta: true });
  });

  it('un usuario que también trabaja en otra cuenta no es solo de esta (no se le cambian nombre ni contraseña)', async () => {
    const repositorio = repositorioCon({ enLaCuenta: true, otrasCuentas: 2 });

    const resultado = await usuarioDeLaCuenta(repositorio, usuarioId, operador);

    expect(resultado.pertenencia.soloEnEstaCuenta).toBe(false);
  });

  it('un usuario que no trabaja en la cuenta se trata como inexistente', async () => {
    const repositorio = repositorioCon({ enLaCuenta: false, otrasCuentas: 1 });

    await expect(usuarioDeLaCuenta(repositorio, usuarioId, operador)).rejects.toThrow(RecursoNoEncontrado);
  });

  it('soporte no se administra desde una cuenta', async () => {
    const repositorio = repositorioCon({ enLaCuenta: true, otrasCuentas: 0 }, true);

    await expect(usuarioDeLaCuenta(repositorio, usuarioId, operador)).rejects.toThrow(RecursoNoEncontrado);
  });
});
