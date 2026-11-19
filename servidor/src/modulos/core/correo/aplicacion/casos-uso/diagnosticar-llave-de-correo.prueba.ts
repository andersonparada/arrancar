import { describe, expect, it } from 'vitest';
import type { ServidorDeCorreoRepositorio } from '../puertos/servidor-de-correo-repositorio.js';
import { DiagnosticarLlaveDeCorreo } from './diagnosticar-llave-de-correo.js';

const conServidor = (hay: boolean) =>
  new DiagnosticarLlaveDeCorreo({ obtener: async () => (hay ? {} : null) } as unknown as ServidorDeCorreoRepositorio);

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
});
