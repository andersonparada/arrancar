import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LlaveDeSecretosNoDisponible } from '../dominio/errores-del-servidor-de-correo.js';
import { CifradorAesGcm } from './cifrador-aes-gcm.js';

const llave = () => randomBytes(32).toString('base64');
const CONTEXTO = 'core.servidor_de_correo.contrasena';

describe('CifradorAesGcm', () => {
  it('cifra y descifra, con IV de 12 bytes y sin dejar el texto a la vista', () => {
    const cifrador = new CifradorAesGcm({ actual: llave() });

    const secreto = cifrador.cifrar('contrasena-secreta', CONTEXTO);

    expect(secreto.iv).toHaveLength(12);
    expect(secreto.cifrado.toString('utf8')).not.toContain('contrasena-secreta');
    expect(cifrador.descifrar(secreto, CONTEXTO)).toBe('contrasena-secreta');
  });

  it('usa un IV nuevo en cada cifrado', () => {
    const cifrador = new CifradorAesGcm({ actual: llave() });

    const a = cifrador.cifrar('igual', CONTEXTO);
    const b = cifrador.cifrar('igual', CONTEXTO);

    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.cifrado.equals(b.cifrado)).toBe(false);
  });

  it('no descifra con otro contexto (datos autenticados adicionales)', () => {
    const cifrador = new CifradorAesGcm({ actual: llave() });
    const secreto = cifrador.cifrar('x', CONTEXTO);

    expect(() => cifrador.descifrar(secreto, 'core.otra.columna')).toThrow();
  });

  it('detecta que el texto cifrado fue alterado', () => {
    const cifrador = new CifradorAesGcm({ actual: llave() });
    const secreto = cifrador.cifrar('x', CONTEXTO);
    const alterado = Buffer.from(secreto.cifrado);
    alterado[0] = (alterado[0] as number) ^ 1;

    expect(() => cifrador.descifrar({ ...secreto, cifrado: alterado }, CONTEXTO)).toThrow();
  });

  it('sin llave no está disponible y no cifra', () => {
    const cifrador = new CifradorAesGcm({ actual: undefined });

    expect(cifrador.disponible).toBe(false);
    expect(() => cifrador.cifrar('x', CONTEXTO)).toThrow(LlaveDeSecretosNoDisponible);
  });

  it('con la llave anterior sigue leyendo lo viejo y cifra lo nuevo con la actual', () => {
    const vieja = llave();
    const nueva = llave();
    const secretoViejo = new CifradorAesGcm({ actual: vieja }).cifrar('viejo', CONTEXTO);
    const rotado = new CifradorAesGcm({ actual: nueva, anterior: vieja });

    const secretoNuevo = rotado.cifrar('nuevo', CONTEXTO);

    expect(rotado.descifrar(secretoViejo, CONTEXTO)).toBe('viejo');
    expect(secretoNuevo.versionDeClave).not.toBe(secretoViejo.versionDeClave);
    expect(rotado.descifrar(secretoNuevo, CONTEXTO)).toBe('nuevo');
  });

  it('si se perdió la llave con que se cifró, no descifra', () => {
    const secreto = new CifradorAesGcm({ actual: llave() }).cifrar('x', CONTEXTO);

    expect(() => new CifradorAesGcm({ actual: llave() }).descifrar(secreto, CONTEXTO)).toThrow(
      LlaveDeSecretosNoDisponible,
    );
  });

  it('ignora una llave que no mide 32 bytes', () => {
    const corta = Buffer.alloc(16).toString('base64');

    expect(new CifradorAesGcm({ actual: corta }).disponible).toBe(false);
  });
});
