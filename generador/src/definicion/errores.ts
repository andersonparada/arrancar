/** Un error del generador que se explica al usuario tal cual, sin la pila. */
export class ErrorDelGenerador extends Error {
  override readonly name: string = 'ErrorDelGenerador';
}

/** La definición de un recurso tiene problemas; se listan todos a la vez. */
export class DefinicionInvalida extends ErrorDelGenerador {
  override readonly name = 'DefinicionInvalida';

  constructor(readonly problemas: string[]) {
    super(`La definición tiene problemas:\n${problemas.map((problema) => `  - ${problema}`).join('\n')}`);
  }
}
