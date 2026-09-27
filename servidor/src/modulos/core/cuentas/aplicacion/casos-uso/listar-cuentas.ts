import type { CuentaDto } from '../dto/cuenta.dto.js';
import type { ConsultasCuentas } from '../puertos/repositorio-cuentas.js';

export class ListarCuentas {
  constructor(private readonly dependencias: { consultas: ConsultasCuentas }) {}

  ejecutar(): Promise<CuentaDto[]> {
    return this.dependencias.consultas.listar();
  }
}
