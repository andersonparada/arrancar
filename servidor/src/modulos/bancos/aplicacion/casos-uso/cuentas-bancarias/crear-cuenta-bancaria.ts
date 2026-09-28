import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { CuentaBancaria } from '../../../dominio/cuenta-bancaria.js';
import { datosDeCuentaBancaria } from '../../datos-de-cuenta-bancaria.js';
import type { CuentaBancariaDto, SolicitudDeCuentaBancaria } from '../../dto/cuenta-bancaria.dto.js';
import type { DependenciasDeCuentasBancarias } from './dependencias-de-cuentas-bancarias.js';

export class CrearCuentaBancaria {
  constructor(private readonly dependencias: DependenciasDeCuentasBancarias) {}

  /**
   * @throws CuentaBancariaInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeCuentaBancaria): Promise<CuentaBancariaDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const cuentaBancaria = CuentaBancaria.crear(
      Identificador.desde(operador.empresaId),
      datosDeCuentaBancaria(solicitud),
    );
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await consultas.exigirReferencias(solicitud);
      await repositorio.agregar(cuentaBancaria);
      return consultas.obtener(cuentaBancaria.id.valor);
    });
  }
}
