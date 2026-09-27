import { createHash, randomBytes } from 'node:crypto';
import type { TokensDeSesion } from '../aplicacion/puertos/repositorio-sesiones.js';

/** 32 bytes aleatorios; en la base solo queda su SHA-256. */
export class TokensAleatorios implements TokensDeSesion {
  nuevo(): string {
    return randomBytes(32).toString('base64url');
  }

  huellaDe(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
