/** Guarda el escaneo firmado de cada boleta (una fila por boleta; la seguridad por empresa la da RLS). */
export interface RepositorioBoletasFirmadas {
  /** Serializa las subidas de una misma boleta hasta que termine la transacción. */
  bloquear(grupoId: string): Promise<void>;
  /** El archivo vigente de la boleta, o `null` si todavía no tiene. */
  archivoDe(grupoId: string): Promise<string | null>;
  /** Pone el archivo de la boleta: lo crea o reemplaza el anterior. */
  poner(grupoId: string, archivoId: string): Promise<void>;
}
