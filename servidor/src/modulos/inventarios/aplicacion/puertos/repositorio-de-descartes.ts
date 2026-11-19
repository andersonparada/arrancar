/** Una línea del libro apartada de la bandeja. */
export interface DescarteDeLinea {
  id: string;
  lineaId: string;
  documentoId: string;
  motivo: string;
  /** Si descartar quitó la marca de inventario en el libro. */
  quitoLaMarca: boolean;
}

export interface NuevoDescarte {
  empresaId: string;
  lineaId: string;
  documentoId: string;
  motivo: string;
  quitoLaMarca: boolean;
}

/** Las líneas descartadas de la bandeja «Por recibir» (§5.16). La seguridad por empresa (RLS) limita todo. */
export interface RepositorioDeDescartes {
  vigente(lineaId: string): Promise<DescarteDeLinea | null>;
  agregar(descarte: NuevoDescarte): Promise<void>;
  /** El descarte deja de ser vigente y queda como historia, con quien lo devolvió. */
  devolver(descarteId: string, usuarioId: string, ahora: Date): Promise<void>;
}
