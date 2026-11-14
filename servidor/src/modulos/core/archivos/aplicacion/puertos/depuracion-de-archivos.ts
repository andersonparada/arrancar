/** Recorre la carpeta de archivos sin salir de ella ni seguir enlaces simbólicos. */
export interface ExploradorDeArchivos {
  /** Rutas relativas (con `/`) de los archivos normales modificados antes de `antesDe`. Nunca carpetas ni enlaces. */
  listarModificadosAntesDe(antesDe: Date): AsyncIterable<string>;
  /** Borra solo un archivo normal dentro de la carpeta; no borra carpetas ni sigue enlaces. */
  borrar(ruta: string): Promise<void>;
}

/** Consulta, sin importar la empresa, qué rutas de archivo tienen su fila en `core.archivos`. */
export interface RegistroDeRutas {
  /** @returns las rutas recibidas que están registradas (como original o miniatura); máximo 500 por llamada. */
  registradas(rutas: readonly string[]): Promise<ReadonlySet<string>>;
}

/** Evita que dos instancias de la app depuren a la vez. */
export interface CerrojoDeCorrida {
  /** @returns lo que devuelve `trabajo`, o `null` si otra instancia ya está corriendo (no ejecuta nada). */
  ejecutarSiLibre<Resultado>(trabajo: () => Promise<Resultado>): Promise<Resultado | null>;
}

/** Dónde deja constancia la tarea: solo conteos y rutas relativas, nunca contenido. */
export interface RegistroDeTexto {
  info(mensaje: string): void;
  advertencia(mensaje: string): void;
}
