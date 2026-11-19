import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { DescarteNoVigente, LineaNoRecibible } from '../../../dominio/errores-de-recepcion.js';
import { lineaParaAuditoria } from './descartar-linea.js';
import type { DependenciasDeRecepciones } from './dependencias-de-recepciones.js';

export class DevolverLineaALaBandeja {
  constructor(private readonly dependencias: DependenciasDeRecepciones) {}

  /**
   * Devuelve a la bandeja una línea descartada: el descarte queda como historia (con quien lo devolvió) y la acción en
   * la auditoría (`devolver`) con la línea y el motivo del descarte. Si el descarte le había quitado la marca de
   * inventario en el libro, en la misma transacción se la vuelve a poner (V-8); si el libro lo rechaza (documento
   * anulado, línea que mientras tanto se marcó como activo fijo), todo se deshace.
   * @throws DescarteNoVigente si la línea no está descartada.
   */
  ejecutar(operador: Operador, lineaId: string): Promise<void> {
    const { unidadDeTrabajo, lineas, descartes, marcas, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await lineas.bloquear([lineaId]);
      const descarte = await descartes.vigente(lineaId);
      const [linea] = await lineas.buscar([lineaId]);
      if (!descarte) throw new DescarteNoVigente();
      if (!linea) throw new LineaNoRecibible();
      if (descarte.quitoLaMarca) {
        const motivo = 'Devuelta a la bandeja «Por recibir» de Inventarios';
        await marcas.cambiar(operador, { lineaId, documentoId: linea.documentoId, esInventario: true, motivo });
      }
      await descartes.devolver(descarte.id, operador.usuarioId, new Date());
      await auditoria.registrar({
        recurso: 'inventarios.recepciones',
        registroId: lineaId,
        accion: 'devolver',
        anterior: { ...lineaParaAuditoria(linea), motivoDelDescarte: descarte.motivo },
      });
    });
  }
}
