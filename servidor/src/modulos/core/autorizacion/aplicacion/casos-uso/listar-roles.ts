import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { RolDto } from '../dto/rol.dto.js';
import type { ConsultasRoles } from '../puertos/consultas-roles.js';

/** Los roles de la cuenta del operador. */
export class ListarRoles {
  constructor(private readonly dependencias: { consultas: ConsultasRoles }) {}

  ejecutar(operador: Operador): Promise<RolDto[]> {
    return this.dependencias.consultas.listarDeCuenta(operador.cuentaId);
  }
}
