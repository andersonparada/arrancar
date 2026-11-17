/** El nombre completo de un usuario unido como `alias` a `core.usuarios`; nulo si no hay persona. */
export const nombreDe = (alias: string): string =>
  `nullif(btrim(concat(${alias}.nombres, ' ', ${alias}.apellidos)), '')`;
