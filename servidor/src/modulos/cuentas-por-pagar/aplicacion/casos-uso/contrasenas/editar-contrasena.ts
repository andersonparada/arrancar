import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import { exigirFechaDePago, observacionesDeContrasena } from '../../../dominio/reglas-de-contrasena.js';
import type { ContrasenaDto } from '../../dto/contrasena.dto.js';
import {
  abrirContrasena,
  contrasenaComoDto,
  RECURSO_DE_CONTRASENAS,
  type DependenciasParaEditarContrasena,
} from './dependencias-de-contrasenas.js';

export interface PeticionParaEditarContrasena {
  id: string;
  /** La nueva fecha prometida; si no cambia, no se pide motivo. */
  fechaDePago?: string;
  /** `null` o vacío las borra; si falta, quedan como están. */
  observaciones?: string | null;
  /** Obligatorio solo si cambia la fecha prometida. */
  motivo?: string;
}

/**
 * Cambia la fecha prometida de pago (con motivo y auditoría `corregir`, porque el proveedor tiene un papel con la fecha
 * anterior) y las observaciones (sin auditoría: no cambian lo prometido). Se puede mientras esté vigente, con pagos o no.
 */
export class EditarContrasena {
  constructor(private readonly dependencias: DependenciasParaEditarContrasena) {}

  /**
   * @throws RecursoNoEncontrado si no existe.
   * @throws ContrasenaAnulada si está anulada.
   * @throws FechaDePagoInvalida si es anterior a la fecha de la contraseña.
   * @throws MotivoInvalido si cambia la fecha y falta el motivo, o pasa de 300 caracteres.
   * @throws ObservacionesDeContrasenaInvalidas si pasan de 500.
   */
  async ejecutar(operador: Operador, pedido: PeticionParaEditarContrasena): Promise<ContrasenaDto> {
    const { unidadDeTrabajo, repositorio, auditoria } = this.dependencias;
    const nuevas = pedido.observaciones === undefined ? undefined : observacionesDeContrasena(pedido.observaciones);
    return await unidadDeTrabajo.ejecutar(operador, async () => {
      const { detalle } = await abrirContrasena(this.dependencias, operador, pedido.id);
      const { fechaDePago: anterior, observaciones: antes, fecha } = detalle.contrasena;
      const fechaDePago = pedido.fechaDePago ?? anterior;
      exigirFechaDePago(fechaDePago, fecha);
      if (fechaDePago !== anterior) {
        const motivo = motivoValido(pedido.motivo ?? '');
        await auditoria.registrar({
          recurso: RECURSO_DE_CONTRASENAS,
          registroId: pedido.id,
          accion: 'corregir',
          anterior: { fechaDePago: anterior, observaciones: antes },
          motivo,
        });
      }
      await repositorio.actualizar(pedido.id, { fechaDePago, observaciones: nuevas === undefined ? antes : nuevas });
      return contrasenaComoDto(this.dependencias, operador, pedido.id);
    });
  }
}
