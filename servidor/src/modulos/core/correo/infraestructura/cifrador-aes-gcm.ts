import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { CifradorDeSecretos, SecretoCifrado } from '../aplicacion/puertos/cifrador-de-secretos.js';
import { LlaveDeSecretosNoDisponible } from '../dominio/errores-del-servidor-de-correo.js';

const ALGORITMO = 'aes-256-gcm';
const LARGO_DE_LLAVE = 32;
const LARGO_DEL_IV = 12;
const LARGO_DE_LA_ETIQUETA = 16;

/** Las llaves en base64 tal como llegan del entorno; la anterior solo existe mientras se rota. */
export interface LlavesDeSecretos {
  readonly actual: string | undefined;
  readonly anterior?: string | undefined;
}

function leerLlave(base64: string | undefined): Buffer | null {
  if (!base64) return null;
  const llave = Buffer.from(base64, 'base64');
  return llave.length === LARGO_DE_LLAVE ? llave : null;
}

/** Versión de una llave: 15 bits de su huella SHA-256 (cabe en un `smallint` y no revela la llave). */
export function versionDeLlave(llave: Buffer): number {
  return createHash('sha256').update(llave).digest().readUInt16BE(0) & 0x7fff;
}

/**
 * AES-256-GCM con `node:crypto`: IV aleatorio de 12 bytes por secreto y el contexto (por ejemplo
 * `core.servidor_de_correo.contrasena`) como datos autenticados adicionales: un secreto copiado a otra columna no
 * se descifra. Con la llave anterior solo se descifra; siempre se cifra con la actual.
 */
export class CifradorAesGcm implements CifradorDeSecretos {
  private readonly actual: Buffer | null;
  private readonly anterior: Buffer | null;

  constructor(llaves: LlavesDeSecretos) {
    this.actual = leerLlave(llaves.actual);
    this.anterior = leerLlave(llaves.anterior);
  }

  get disponible(): boolean {
    return this.actual !== null;
  }

  esVigente(secreto: SecretoCifrado): boolean {
    return this.actual !== null && versionDeLlave(this.actual) === secreto.versionDeClave;
  }

  cifrar(texto: string, contexto: string): SecretoCifrado {
    if (!this.actual) throw new LlaveDeSecretosNoDisponible();
    const iv = randomBytes(LARGO_DEL_IV);
    const cifrador = createCipheriv(ALGORITMO, this.actual, iv);
    cifrador.setAAD(Buffer.from(contexto, 'utf8'));
    const cifrado = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final(), cifrador.getAuthTag()]);
    return { cifrado, iv, versionDeClave: versionDeLlave(this.actual) };
  }

  descifrar(secreto: SecretoCifrado, contexto: string): string {
    const llave = this.llaveDeVersion(secreto.versionDeClave);
    const descifrador = createDecipheriv(ALGORITMO, llave, secreto.iv);
    descifrador.setAAD(Buffer.from(contexto, 'utf8'));
    const corte = secreto.cifrado.length - LARGO_DE_LA_ETIQUETA;
    descifrador.setAuthTag(secreto.cifrado.subarray(corte));
    const claro = Buffer.concat([descifrador.update(secreto.cifrado.subarray(0, corte)), descifrador.final()]);
    return claro.toString('utf8');
  }

  private llaveDeVersion(version: number): Buffer {
    const candidata = [this.actual, this.anterior].find((llave) => llave !== null && versionDeLlave(llave) === version);
    if (!candidata) throw new LlaveDeSecretosNoDisponible();
    return candidata;
  }
}
