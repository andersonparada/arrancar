import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

/**
 * Hash que se verifica cuando el usuario no existe, para que la respuesta tarde
 * lo mismo y no revele qué nombres de usuario están registrados.
 */
let hashSenuelo: Promise<string> | null = null;

/** Genera el hash Argon2id de una contraseña. */
export function generarHashContrasena(contrasena: string): Promise<string> {
  return hash(contrasena);
}

/** Compara una contraseña con su hash; con `hashGuardado` nulo usa el señuelo y siempre falla. */
export async function verificarContrasena(hashGuardado: string | null, contrasena: string): Promise<boolean> {
  hashSenuelo ??= hash(randomBytes(32).toString('hex'));
  try {
    const coincide = await verify(hashGuardado ?? (await hashSenuelo), contrasena);
    return hashGuardado !== null && coincide;
  } catch {
    return false;
  }
}
