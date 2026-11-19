import { describe, expect, it } from 'vitest';
import type { CifradorDeSecretos } from '../puertos/cifrador-de-secretos.js';
import type { ServidorDeCorreoRepositorio } from '../puertos/servidor-de-correo-repositorio.js';
import { DiagnosticarLlaveDeCorreo } from './diagnosticar-llave-de-correo.js';

const SECRETO = { cifrado: Buffer.from('x'), iv: Buffer.from('y'), versionDeClave: 1 };
const cifradorQueDescifra = { descifrar: () => 'secreta' } as unknown as CifradorDeSecretos;
const cifradorQueFalla = {
  descifrar: () => {
    throw new Error('Unsupported state or unable to authenticate data: secreta');
  },
} as unknown as CifradorDeSecretos;

const conServidor = (hay: boolean, cifrador = cifradorQueDescifra, contrasena: unknown = SECRETO) =>
  new DiagnosticarLlaveDeCorreo(
    { obtener: async () => (hay ? { contrasena } : null) } as unknown as ServidorDeCorreoRepositorio,
    cifrador,
  );

describe('DiagnosticarLlaveDeCorreo', () => {
  it('con un servidor guardado y sin llave es un error claro', async () => {
    const diagnostico = await conServidor(true).ejecutar();

    expect(diagnostico.nivel).toBe('error');
    expect(diagnostico.mensaje).toMatch(/servidor de correo guardado y falta CLAVE_SECRETOS/);
  });

  it('sin servidor guardado solo informa', async () => {
    const diagnostico = await conServidor(false).ejecutar();

    expect(diagnostico.nivel).toBe('info');
    expect(diagnostico.mensaje).toMatch(/falta CLAVE_SECRETOS/);
  });

  it('con la llave que descifra la contraseña no avisa nada', async () => {
    expect(await conServidor(true).verificarContrasena()).toBeNull();
  });

  it('sin servidor o sin contraseña guardada no avisa nada', async () => {
    expect(await conServidor(false).verificarContrasena()).toBeNull();
    expect(await conServidor(true, cifradorQueFalla, null).verificarContrasena()).toBeNull();
  });

  it('si la llave no descifra la contraseña es un error claro que no muestra la causa ni el secreto', async () => {
    const diagnostico = await conServidor(true, cifradorQueFalla).verificarContrasena();

    expect(diagnostico?.nivel).toBe('error');
    expect(diagnostico?.mensaje).toMatch(/no descifra la contraseña/);
    expect(diagnostico?.mensaje).not.toMatch(/secreta|unable/);
  });
});
