import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DocumentosDisponiblesDto } from '../../dto/contrasena.dto.js';
import { dtoDeDisponibles } from '../../dto/dto-de-contrasena.js';
import { vistaDeContrasena, type DependenciasDeConsultaDeContrasenas } from './dependencias-de-contrasenas.js';

/** Lo que un proveedor tiene para meter en una contraseña nueva: cargos con saldo y notas con saldo libre. Solo lee. */
export class DocumentosDisponibles {
  constructor(private readonly dependencias: DependenciasDeConsultaDeContrasenas) {}

  ejecutar(operador: Operador, proveedorId: string): Promise<DocumentosDisponiblesDto> {
    const { unidadDeTrabajo, contrasenas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const filas = await contrasenas.disponiblesDe(proveedorId);
      return dtoDeDisponibles(filas, await vistaDeContrasena(this.dependencias, operador));
    });
  }
}
