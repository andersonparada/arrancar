/** El descarte vigente de una línea: se apartó de la bandeja porque era gasto. */
export interface DescarteDeLinea {
  id: string;
  lineaId: string;
  documentoId: string;
  motivo: string;
}

/** Lo que se guarda al descartar una línea. */
export type NuevoDescarte = Omit<DescarteDeLinea, 'id'> & { empresaId: string };

/** Guarda los descartes de la bandeja (la bandeja misma no tiene tabla: es una consulta sobre el libro). */
export interface RepositorioDescartes {
  vigente(lineaId: string): Promise<DescarteDeLinea | null>;
  agregar(descarte: NuevoDescarte): Promise<void>;
  /** Marca el descarte como devuelto a la bandeja, con quien lo devolvió y cuándo. */
  devolver(descarteId: string, usuarioId: string, ahora: Date): Promise<void>;
}
