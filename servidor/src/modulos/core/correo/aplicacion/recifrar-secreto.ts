import { CONTEXTO_DE_LA_CONTRASENA } from './contexto-de-la-contrasena.js';
import type { CifradorDeSecretos, SecretoCifrado } from './puertos/cifrador-de-secretos.js';
import type { ServidorDeCorreoRepositorio } from './puertos/servidor-de-correo-repositorio.js';

interface Dependencias {
  repositorio: ServidorDeCorreoRepositorio;
  cifrador: CifradorDeSecretos;
}

/**
 * Rotación de la llave: un secreto cifrado con una llave que ya no es la actual se descifra y se guarda de nuevo con
 * la vigente, para poder quitar `CLAVE_SECRETOS_ANTERIOR` sin perder la contraseña.
 * @returns el secreto que quedó guardado (el mismo si ya era vigente o si otro proceso lo cambió antes).
 * @throws LlaveDeSecretosNoDisponible si falta la llave con que se cifró.
 */
export async function recifrarSiHaceFalta(
  { repositorio, cifrador }: Dependencias,
  secreto: SecretoCifrado,
): Promise<SecretoCifrado> {
  if (cifrador.esVigente(secreto)) return secreto;
  const nuevo = cifrador.cifrar(cifrador.descifrar(secreto, CONTEXTO_DE_LA_CONTRASENA), CONTEXTO_DE_LA_CONTRASENA);
  return (await repositorio.recifrar(secreto, nuevo)) ? nuevo : secreto;
}
