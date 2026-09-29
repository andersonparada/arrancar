/** Un usuario de la empresa, para elegirlo en la ventana de accesos. */
export interface UsuarioParaAccesosDto {
  usuarioId: string;
  usuario: string;
  nombres: string;
  apellidos: string;
  roles: string[];
  /** Ya ve todas las localidades por su acceso total o por `ver-todas`: no necesita asignaciones. */
  veTodas: boolean;
}

/** Una localidad de la empresa, con quiénes tienen acceso, para la ventana de accesos. */
export interface LocalidadParaAsignarDto {
  id: string;
  codigo: string;
  nombre: string;
  tipoNombre: string | null;
  activo: boolean;
  usuarioIds: string[];
}

/** Un usuario de la empresa tal como se guarda en la auditoría. */
export interface MiembroDeLaEmpresa {
  usuarioId: string;
  usuario: string;
  nombres: string;
  apellidos: string;
}
