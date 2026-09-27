import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import type { CifradorDeContrasenas } from '../aplicacion/puertos/cifrador-de-contrasenas.js';

/** Argon2id. */
export class CifradorArgon2 implements CifradorDeContrasenas {
  /** Se verifica cuando el usuario no existe, para que la respuesta tarde lo mismo. */
  private hashSenuelo: Promise<string> | null = null;

  cifrar(contrasena: string): Promise<string> {
    return hash(contrasena);
  }

  async coincide(hashGuardado: string | null, contrasena: string): Promise<boolean> {
    this.hashSenuelo ??= hash(randomBytes(32).toString('hex'));
    try {
      const coincide = await verify(hashGuardado ?? (await this.hashSenuelo), contrasena);
      return hashGuardado !== null && coincide;
    } catch {
      return false;
    }
  }
}

export const cifradorDeContrasenas = new CifradorArgon2();
