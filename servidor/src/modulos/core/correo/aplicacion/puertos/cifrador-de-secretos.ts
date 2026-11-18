/** Un secreto ya cifrado: lo que se guarda en la base. */
export interface SecretoCifrado {
  /** Texto cifrado seguido de la etiqueta de autenticación. */
  readonly cifrado: Buffer;
  readonly iv: Buffer;
  /** Identifica con qué llave se cifró (para rotarla). */
  readonly versionDeClave: number;
}

/** Cifra secretos con una llave que vive fuera de la base de datos y de los respaldos. */
export interface CifradorDeSecretos {
  /** Falso si falta la llave en el entorno: no se puede cifrar ni descifrar nada. */
  readonly disponible: boolean;
  /** @throws LlaveDeSecretosNoDisponible si falta la llave. */
  cifrar(texto: string, contexto: string): SecretoCifrado;
  /** @throws LlaveDeSecretosNoDisponible si falta la llave con que se cifró. */
  descifrar(secreto: SecretoCifrado, contexto: string): string;
}
