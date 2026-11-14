import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { motivoValido } from '../../../dominio/ciclo-de-vida.js';
import type { ContrasenaDto } from '../../dto/contrasena.dto.js';
import type { FilaDeDocumento } from '../../puertos/puertos-de-consultas.js';
import type { ContrasenaConDocumentos } from '../../puertos/puertos-de-contrasenas.js';
import {
  abrirContrasena,
  contrasenaComoDto,
  RECURSO_DE_CONTRASENAS,
  type DependenciasParaCambiarDocumentos,
} from './dependencias-de-contrasenas.js';
import { bloquearEnOrden } from './documentos-de-la-contrasena.js';
import { rehacerElReparto } from './rehacer-el-reparto.js';

/**
 * Una regla que puede rechazar que se quite un documento de la contraseña lanzando su error. Los pagos (CP4) sumarán la
 * suya («el documento tiene pagos de esta contraseña») sin tocar el caso de uso.
 */
export type ReglaParaQuitarDeContrasena = (
  fila: FilaDeDocumento,
  contrasena: ContrasenaConDocumentos,
) => void | Promise<void>;

/** Hoy no hay pagos: CP4 sumará aquí la suya. */
export const REGLAS_PARA_QUITAR_DE_CONTRASENA: readonly ReglaParaQuitarDeContrasena[] = [];

export interface PeticionParaQuitarDocumento {
  contrasenaId: string;
  documentoId: string;
  motivo: string;
}

/**
 * Saca un documento de una contraseña vigente y rehace el reparto de sus notas. Pide motivo y audita `quitar` con la
 * contraseña como estaba antes (sus documentos y montos), en la misma transacción. La contraseña no puede quedarse sin
 * cargos ni sin nada que pagar: en ese caso se anula.
 */
export class QuitarDocumentoDeContrasena {
  constructor(
    private readonly dependencias: DependenciasParaCambiarDocumentos,
    private readonly reglas: readonly ReglaParaQuitarDeContrasena[] = REGLAS_PARA_QUITAR_DE_CONTRASENA,
  ) {}

  /**
   * @throws MotivoInvalido si falta el motivo o pasa de 300 caracteres.
   * @throws RecursoNoEncontrado si la contraseña no existe o el documento no está en ella.
   * @throws ContrasenaAnulada, ContrasenaSinCargos, ContrasenaSinSaldo
   */
  async ejecutar(operador: Operador, pedido: PeticionParaQuitarDocumento): Promise<ContrasenaDto> {
    const { unidadDeTrabajo, cargaInicial, repositorio, auditoria } = this.dependencias;
    const motivo = motivoValido(pedido.motivo);
    const { contrasenaId, documentoId } = pedido;
    return await unidadDeTrabajo.ejecutar(operador, async () => {
      const { fechaDeInicio } = await cargaInicial.obtener(operador);
      const { detalle, antes, quedan } = await this.prepararBaja(operador, pedido);
      const { proveedorId, fecha } = detalle.contrasena;
      await auditoria.registrar({
        recurso: RECURSO_DE_CONTRASENAS,
        registroId: contrasenaId,
        accion: 'quitar',
        anterior: antes,
        motivo,
      });
      await repositorio.quitarDocumento(contrasenaId, documentoId);
      const datos = { contrasenaId, proveedorId, fecha, fechaDeInicio, documentoIds: quedan };
      await rehacerElReparto(this.dependencias, datos);
      return contrasenaComoDto(this.dependencias, operador, contrasenaId);
    });
  }

  /** Bloquea la contraseña y sus documentos, revisa que el documento esté y pasa las reglas. */
  private async prepararBaja(operador: Operador, { contrasenaId, documentoId }: PeticionParaQuitarDocumento) {
    const { detalle, antes } = await abrirContrasena(this.dependencias, operador, contrasenaId);
    const fila = detalle.documentos.find(({ documento }) => documento.id === documentoId);
    if (!fila) throw new RecursoNoEncontrado('El documento de la contraseña');
    const quedan = detalle.documentos.map(({ documento }) => documento.id).filter((id) => id !== documentoId);
    await bloquearEnOrden(this.dependencias, [...quedan, documentoId]);
    for (const regla of this.reglas) await regla(fila, detalle);
    return { detalle, antes, quedan };
  }
}
