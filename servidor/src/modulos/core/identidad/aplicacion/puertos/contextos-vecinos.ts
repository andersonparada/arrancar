/**
 * Lo que la sesión necesita de otros contextos del núcleo. Los implementan sus
 * piezas (autorización, configuración y bitácora); identidad no conoce su código.
 */

export interface PermisosDeRoles {
  permisosDelRol(rolId: string): Promise<string[]>;
}

export interface ConfiguracionPublica {
  valoresPublicos(alcance: {
    destino: { cuentaId: string; empresaId: string };
    modulosActivos: ReadonlySet<string>;
  }): Promise<Record<string, unknown>>;
}

export interface BitacoraDeSoporte {
  registrarEntrada(entrada: { usuarioId: string; empresaId: string; direccionIp: string | null }): Promise<void>;
}
