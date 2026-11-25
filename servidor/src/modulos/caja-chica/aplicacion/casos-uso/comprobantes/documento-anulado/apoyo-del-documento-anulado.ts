import { RecursoNoEncontrado } from '../../../../../core/compartido/aplicacion/errores.js';
import type { AccionAuditada } from '../../../../../core/compartido/aplicacion/auditoria.js';
import { RECURSO_DE_COMPROBANTES, type Comprobante } from '../../../../dominio/comprobantes.js';
import type { SeguimientoDelDocumento } from '../../../../dominio/documento-anulado.js';
import type { ComprobanteDto } from '../../../dto/comprobantes.dto.js';
import { LectorDelFondo } from '../../fondos/lector-del-fondo.js';
import { comprobanteDto } from '../armado-del-comprobante.js';
import type { DependenciasDeComprobantes } from '../dependencias-de-comprobantes.js';

export interface PeticionConMotivo {
  comprobanteId: string;
  motivo: string;
}

/**
 * Lo que comparten los casos de uso del documento anulado por su emisor: bloquear el comprobante (el fondo primero, aunque
 * esté cerrado: resolver no mueve efectivo), y guardar el nuevo seguimiento con su auditoría en la misma transacción.
 */
export class ApoyoDelDocumentoAnulado {
  private readonly lector: LectorDelFondo;

  constructor(readonly dependencias: DependenciasDeComprobantes) {
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
  }

  /** @throws RecursoNoEncontrado */
  async bloquear(comprobanteId: string): Promise<Comprobante> {
    const { comprobantes } = this.dependencias;
    const visto = await comprobantes.buscar(comprobanteId);
    if (!visto) throw new RecursoNoEncontrado('El comprobante');
    if (visto.fondoId !== null) await this.lector.bloquear(visto.fondoId);
    const comprobante = await comprobantes.bloquear(comprobanteId);
    if (!comprobante) throw new RecursoNoEncontrado('El comprobante');
    return comprobante;
  }

  /** Guarda el seguimiento y audita con el comprobante como estaba; devuelve el comprobante ya actualizado. */
  async guardar(por: {
    anterior: Comprobante;
    seguimiento: SeguimientoDelDocumento;
    accion: Extract<AccionAuditada, 'corregir' | 'ajustar'>;
    motivo: string;
  }): Promise<ComprobanteDto> {
    const { anterior, seguimiento, accion, motivo } = por;
    const { comprobantes, auditoria } = this.dependencias;
    await comprobantes.guardarSeguimiento(anterior.id, seguimiento);
    await auditoria.registrar({
      recurso: RECURSO_DE_COMPROBANTES,
      registroId: anterior.id,
      accion,
      anterior: comprobanteDto(anterior),
      motivo,
    });
    return comprobanteDto((await comprobantes.buscar(anterior.id))!);
  }
}
