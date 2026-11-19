import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import type { UsuarioDto } from '../dto/usuario.dto.js';
import type { ConsultasUsuarios } from '../puertos/consultas-usuarios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasUsuarios;
}

export class ListarUsuarios {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador): Promise<UsuarioDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listarDeCuenta(operador.cuentaId));
  }
}
