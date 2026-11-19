import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { DescarteNoVigente } from '../../../dominio/errores-de-costo.js';
import { lineaParaAuditoria } from './descartar-linea.js';
import type { DependenciasDeBandeja } from './dependencias-de-bandeja.js';

export class DevolverLineaALaBandeja {
  constructor(private readonly dependencias: DependenciasDeBandeja) {}

  /**
   * Devuelve a la bandeja una línea descartada; el descarte queda como historia (con quien lo devolvió) y la acción en
   * la auditoría (`devolver`) con la línea y el motivo del descarte.
   * @throws DescarteNoVigente si la línea no está descartada.
   */
  ejecutar(operador: Operador, lineaId: string): Promise<void> {
    const { unidadDeTrabajo, costos, lineas, descartes, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await costos.bloquearLineas([lineaId]);
      const descarte = await descartes.vigente(lineaId);
      const [linea] = await lineas.buscar([lineaId]);
      if (!descarte || !linea) throw new DescarteNoVigente('La línea no está descartada.');
      await descartes.devolver(descarte.id, operador.usuarioId, new Date());
      await auditoria.registrar({
        recurso: 'activos-fijos.bandeja',
        registroId: lineaId,
        accion: 'devolver',
        anterior: { ...lineaParaAuditoria(linea), motivoDelDescarte: descarte.motivo },
      });
    });
  }
}
