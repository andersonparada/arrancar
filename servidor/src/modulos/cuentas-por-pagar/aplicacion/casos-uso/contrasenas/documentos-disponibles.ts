import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { DocumentosDisponiblesDto } from '../../dto/contrasena.dto.js';
import { dtoDeDisponibles } from '../../dto/dto-de-contrasena.js';
import type { DependenciasDeConsultaDeContrasenas } from './dependencias-de-contrasenas.js';

/** Lo que un proveedor tiene para meter en una contraseña nueva: cargos con saldo y notas con saldo libre. Solo lee. */
export class DocumentosDisponibles {
  constructor(private readonly dependencias: DependenciasDeConsultaDeContrasenas) {}

  ejecutar(operador: Operador, proveedorId: string): Promise<DocumentosDisponiblesDto> {
    const { unidadDeTrabajo, reloj, contrasenas, umbral } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const filas = await contrasenas.disponiblesDe(proveedorId);
      const umbralCentavos = await umbral.centavos(operador);
      return dtoDeDisponibles(filas, { umbralCentavos, hoy: await reloj.hoy(operador) });
    });
  }
}
