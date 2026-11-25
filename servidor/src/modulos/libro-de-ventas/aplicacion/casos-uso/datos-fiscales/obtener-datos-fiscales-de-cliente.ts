import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { DatosFiscalesDeCliente } from '../../../dominio/datos-fiscales-de-cliente.js';
import type { DatosFiscalesDeClienteDto } from '../../dto/datos-fiscales-de-cliente.dto.js';
import type { RepositorioDeDatosFiscalesDeCliente } from '../../puertos/repositorio-de-datos-fiscales-de-cliente.js';
import { dtoDeCliente } from './dto-de-datos-fiscales-de-cliente.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDatosFiscalesDeCliente;
}

export class ObtenerDatosFiscalesDeCliente {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Sin datos guardados, devuelve los valores por omisión (no retiene nada).
   * @throws RecursoNoEncontrado si el cliente no existe en la cuenta.
   */
  ejecutar(operador: Operador, clienteId: string): Promise<DatosFiscalesDeClienteDto> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!(await repositorio.existe(clienteId))) throw new RecursoNoEncontrado('El cliente');
      const guardados = await repositorio.buscar(clienteId);
      return dtoDeCliente(clienteId, guardados ?? DatosFiscalesDeCliente.porOmision(), guardados !== null);
    });
  }
}
