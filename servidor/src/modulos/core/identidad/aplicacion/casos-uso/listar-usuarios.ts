import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UsuarioDto } from '../dto/usuario.dto.js';
import type { ConsultasUsuarios } from '../puertos/consultas-usuarios.js';

export class ListarUsuarios {
  constructor(private readonly dependencias: { consultas: ConsultasUsuarios }) {}

  ejecutar(operador: Operador): Promise<UsuarioDto[]> {
    return this.dependencias.consultas.listarDeCuenta(operador.cuentaId);
  }
}
