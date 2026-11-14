import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import type { ContrasenaDto } from '../../dto/contrasena.dto.js';
import type { ContrasenaConDocumentos } from '../../puertos/puertos-de-contrasenas.js';
import {
  abrirContrasena,
  contrasenaComoDto,
  RECURSO_DE_CONTRASENAS,
  type DependenciasParaEditarContrasena,
} from './dependencias-de-contrasenas.js';

/**
 * Una regla que puede rechazar que se anule una contraseña lanzando su error. Los pagos (CP4) sumarán la suya
 * («tiene pagos vigentes») sin tocar el caso de uso.
 */
export type ReglaParaAnularContrasena = (contrasena: ContrasenaConDocumentos) => void | Promise<void>;

/** Hoy no hay pagos: CP4 sumará aquí `ContrasenaConPagos`. */
export const REGLAS_PARA_ANULAR_CONTRASENA: readonly ReglaParaAnularContrasena[] = [];

export interface PeticionParaAnularContrasena {
  id: string;
  motivo: string;
}

/**
 * Anula una contraseña vigente, con motivo y sin reversión: audita `anular` con la contraseña como estaba (documentos,
 * montos y aplicaciones de ese momento), borra lo que sus notas aplicaron dentro de ella (vuelve a su saldo libre) y suelta
 * sus documentos para otra contraseña. El número no se libera. Todo en la misma transacción.
 */
export class AnularContrasena {
  constructor(
    private readonly dependencias: DependenciasParaEditarContrasena,
    private readonly reglas: readonly ReglaParaAnularContrasena[] = REGLAS_PARA_ANULAR_CONTRASENA,
  ) {}

  /**
   * @throws MotivoInvalido si falta el motivo o pasa de 300 caracteres.
   * @throws RecursoNoEncontrado si la contraseña no existe.
   * @throws ContrasenaAnulada si ya estaba anulada.
   */
  async ejecutar(operador: Operador, { id, motivo }: PeticionParaAnularContrasena): Promise<ContrasenaDto> {
    const motivoLimpio = motivoValido(motivo);
    const { unidadDeTrabajo, repositorio, auditoria } = this.dependencias;
    return await unidadDeTrabajo.ejecutar(operador, async () => {
      const { detalle, antes } = await abrirContrasena(this.dependencias, operador, id);
      for (const regla of this.reglas) await regla(detalle);
      await auditoria.registrar({
        recurso: RECURSO_DE_CONTRASENAS,
        registroId: id,
        accion: 'anular',
        anterior: antes,
        motivo: motivoLimpio,
      });
      await repositorio.borrarReparto(id);
      await repositorio.anular(id, { anuladaPor: operador.usuarioId, motivo: motivoLimpio });
      return contrasenaComoDto(this.dependencias, operador, id);
    });
  }
}
