import { describe, expect, it } from 'vitest';
import { RecursoDuplicado } from '../../compartido/aplicacion/errores.js';
import { SinNombreDeUsuarioLibre } from '../dominio/errores.js';
import type { NombreDeUsuario } from '../dominio/nombre-de-usuario.js';
import { Usuario } from '../dominio/usuario.js';
import type { RepositorioUsuarios } from './puertos/repositorio-usuarios.js';
import { AsignadorDeNombreDeUsuario } from './asignador-de-nombre-de-usuario.js';

/** Solo lo que el asignador consulta: qué nombres están ocupados. */
function conOcupados(...ocupados: string[]): AsignadorDeNombreDeUsuario {
  const usuarios = {
    nombresOcupados: async (candidatos: string[]) => new Set(candidatos.filter((c) => ocupados.includes(c))),
    buscarPorNombre: async (nombre: NombreDeUsuario) =>
      ocupados.includes(nombre.valor)
        ? Usuario.registrar({ nombreDeUsuario: nombre, nombres: 'X', apellidos: '', correo: null, hashContrasena: '' })
        : null,
  } as Partial<RepositorioUsuarios> as RepositorioUsuarios;
  return new AsignadorDeNombreDeUsuario({ usuarios });
}

describe('nombre de usuario para una persona nueva', () => {
  it('sin escribirlo, usa el primer candidato libre', async () => {
    const nombre = await conOcupados('jlopez').paraNuevo({ nombres: 'Juan Pablo', apellidos: 'López Díaz' });

    expect(nombre.valor).toBe('jplopezd');
  });

  it('respeta el escrito a mano si está libre y lo rechaza si ya existe', async () => {
    const asignador = conOcupados('jlopez');
    const persona = { nombres: 'Juan', apellidos: 'López' };

    expect((await asignador.paraNuevo({ ...persona, usuario: 'juanito' })).valor).toBe('juanito');
    await expect(asignador.paraNuevo({ ...persona, usuario: 'jlopez' })).rejects.toThrow(RecursoDuplicado);
  });

  it('avisa cuando no queda ningún candidato libre', async () => {
    await expect(conOcupados('jlopez', 'juanlopez').paraNuevo({ nombres: 'Juan', apellidos: 'López' })).rejects.toThrow(
      SinNombreDeUsuarioLibre,
    );
  });
});
