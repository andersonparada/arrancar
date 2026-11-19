/** El mensaje de un error de la API, o el de respaldo si no es un `Error`. */
export const mensajeDe = (error: unknown, porOmision: string): string =>
  error instanceof Error ? error.message : porOmision;
