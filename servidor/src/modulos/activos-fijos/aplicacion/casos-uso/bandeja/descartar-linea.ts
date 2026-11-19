import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { motivoDeDescarteValido } from '../../../dominio/descarte.js';
import { LineaConCostos, LineaNoCapitalizable } from '../../../dominio/errores-de-costo.js';
import { exigirCapitalizable } from '../../../dominio/linea-capitalizable.js';
import type { DescarteDto } from '../../dto/bandeja.dto.js';
import type { LineaConReferencia } from '../../puertos/lineas-del-libro.js';
import type { DependenciasDeBandeja } from './dependencias-de-bandeja.js';

/** R-3: el pago de la compra ya se clasificó como inversión y su IVA fue a la casilla de activos fijos. */
export const AVISO_DE_DESCARTE =
  'El pago de esta factura se clasificó como Inversión y su IVA en la casilla de activos fijos; si era gasto, la marca del libro estaba mal.';

interface DescartePedido {
  lineaId: string;
  motivo: string;
}

/** La línea tal como queda en la auditoría: de qué documento es, qué número y cuánto costó. */
export const lineaParaAuditoria = (linea: LineaConReferencia) => ({
  lineaId: linea.lineaId,
  documento: linea.documento,
  numeroDeLinea: linea.numeroDeLinea,
  costo: deCentavos(linea.costoCentavos),
});

export class DescartarLinea {
  constructor(private readonly dependencias: DependenciasDeBandeja) {}

  /**
   * Aparta una línea de la bandeja con su motivo (era gasto) y lo deja en la auditoría (`descartar`). Toma el candado
   * de la línea. Avisa que la marca del libro no se corrige (R-3).
   * @throws LineaNoCapitalizable si la línea no existe, su documento está anulado o no es de activo fijo.
   * @throws LineaDescartada si ya está descartada.
   * @throws LineaConCostos si ya tiene costos vigentes (se anulan antes).
   * @throws CostoInvalido si falta el motivo.
   */
  async ejecutar(operador: Operador, { lineaId, motivo }: DescartePedido): Promise<DescarteDto> {
    const { unidadDeTrabajo, costos, lineas, descartes, auditoria } = this.dependencias;
    const limpio = motivoDeDescarteValido(motivo);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await costos.bloquearLineas([lineaId]);
      const [linea] = await lineas.buscar([lineaId]);
      if (!linea) throw new LineaNoCapitalizable('La línea no existe en el libro de compras de la empresa.');
      exigirCapitalizable(linea);
      if (linea.capitalizadoCentavos !== 0) throw new LineaConCostos();
      await descartes.agregar({
        empresaId: operador.empresaId,
        lineaId,
        documentoId: linea.documentoId,
        motivo: limpio,
      });
      await auditoria.registrar({
        recurso: 'activos-fijos.bandeja',
        registroId: lineaId,
        accion: 'descartar',
        anterior: lineaParaAuditoria(linea),
        motivo: limpio,
      });
      return { lineaId, avisos: [AVISO_DE_DESCARTE] };
    });
  }
}
