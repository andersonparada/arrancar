import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { motivoDelPeriodoValido } from '../../../dominio/periodos/reglas-de-declaracion.js';
import { dtoDelControl, type ControlDto } from '../../dto/periodo.dto.js';
import type { DependenciasDePeriodos } from './dependencias-de-periodos.js';

/** Lo que cambia el bloqueo: apagarlo exige el motivo. */
export interface PeticionDeControl {
  encendido: boolean;
  motivo?: string | undefined;
}

type Dependencias = Pick<DependenciasDePeriodos, 'unidadDeTrabajo' | 'ajuste' | 'auditoria'>;

/**
 * Enciende o apaga el bloqueo de períodos declarados de la empresa (variable `control_de_declarados` de su nivel).
 * Apagarlo pide motivo. Cada cambio queda en la auditoría como `corregir`, en la misma transacción; si ya estaba
 * así, no hace nada.
 */
export class CambiarControlDePeriodos {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws MotivoDelPeriodoInvalido si se apaga sin motivo (o con uno de más de 500 caracteres). */
  ejecutar(operador: Operador, peticion: PeticionDeControl): Promise<ControlDto> {
    const motivo = peticion.encendido ? null : motivoDelPeriodoValido(peticion.motivo);
    const { unidadDeTrabajo, ajuste, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const antes = await ajuste.detalle();
      if (antes.encendido !== peticion.encendido) {
        await auditoria.registrar({
          recurso: 'libro-de-compras.periodos',
          registroId: operador.empresaId,
          accion: 'corregir',
          anterior: { encendido: antes.encendido },
          motivo,
        });
        await ajuste.establecer(peticion.encendido);
      }
      return dtoDelControl(await ajuste.detalle());
    });
  }
}
