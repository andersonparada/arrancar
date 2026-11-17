/** Un aviso que no bloquea, tal como lo manda el servidor (p. ej. fondos de un cheque posfechado). */
export interface AvisoDeBancos {
  codigo: string;
  mensaje: string;
}

/** Los mensajes de los avisos de una respuesta; vacío si no trae. */
export const mensajesDeAvisos = (respuesta: { avisos?: readonly AvisoDeBancos[] } | null | undefined): string[] =>
  (respuesta?.avisos ?? []).map((aviso) => aviso.mensaje).filter((mensaje) => mensaje.trim() !== '');
