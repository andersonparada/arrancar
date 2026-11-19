/** Un usuario de la empresa, para elegirlo en la ventana de accesos. */
export interface UsuarioParaAccesosDto {
  usuarioId: string;
  usuario: string;
  nombres: string;
  apellidos: string;
  roles: string[];
  /** Ya ve todos los fondos por su acceso total o por `ver-todos`: no necesita asignaciones. */
  veTodos: boolean;
}

/** Un fondo de la empresa, con quiénes tienen acceso, para la ventana de accesos. */
export interface FondoParaAsignarDto {
  id: string;
  nombre: string;
  estado: 'abierto' | 'cerrado';
  usuarioIds: string[];
}

/** Un usuario de la empresa tal como se guarda en la auditoría. */
export interface MiembroDeLaEmpresa {
  usuarioId: string;
  usuario: string;
  nombres: string;
  apellidos: string;
}
