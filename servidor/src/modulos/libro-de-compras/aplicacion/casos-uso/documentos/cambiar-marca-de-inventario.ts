import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { DatoInvalido } from '../../../../core/compartido/dominio/errores.js';
import { exigirMarcaCambiable } from '../../../dominio/marca-de-inventario.js';
import type { MarcasDeInventario } from '../../puertos/puertos-de-marca-de-inventario.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  marcas: MarcasDeInventario;
  auditoria: Auditoria;
}

export interface CambioDeMarca {
  lineaId: string;
  documentoId: string;
  esInventario: boolean;
  motivo: string;
}

/** Falta el motivo del cambio de la marca. */
export class MotivoDeMarcaFaltante extends DatoInvalido {
  readonly codigo = 'motivo_de_marca_faltante';

  constructor() {
    super('Escriba el motivo del cambio de la marca de inventario.');
  }
}

/**
 * Atiende la orden `libro-de-compras.cambiar_marca_de_inventario` (V-8): Inventarios quita la marca al descartar una
 * línea de su bandeja y la vuelve a poner al devolverla. Corre en la transacción de quien manda. Se permite con el
 * período cerrado: ni el libro, ni el SAT-2237, ni el flujo de efectivo miran `es_inventario`.
 */
export class CambiarMarcaDeInventario {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Sin cambio real (la línea ya tiene esa marca) no hace nada ni audita; si cambia, audita `corregir` con la línea
   * como estaba y el motivo.
   * @throws RecursoNoEncontrado si la línea no es de ese documento o de la empresa.
   * @throws DocumentoYaAnulado, InventarioNoEsBien, LineaConDosDestinosDelCosto según `exigirMarcaCambiable`.
   * @throws MotivoDeMarcaFaltante si falta el motivo.
   */
  async ejecutar(operador: Operador, { lineaId, documentoId, esInventario, motivo }: CambioDeMarca): Promise<void> {
    const { unidadDeTrabajo, marcas, auditoria } = this.dependencias;
    const limpio = motivo.trim();
    if (!limpio) throw new MotivoDeMarcaFaltante();
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const linea = await marcas.buscar(lineaId, documentoId);
      if (!linea) throw new RecursoNoEncontrado('La línea del documento');
      exigirMarcaCambiable(linea, esInventario);
      if (linea.esInventario === esInventario) return;
      await marcas.cambiar(lineaId, esInventario);
      await auditoria.registrar({
        recurso: 'libro-de-compras.documentos',
        registroId: documentoId,
        accion: 'corregir',
        anterior: { lineaId, numeroDeLinea: linea.numero, esInventario: linea.esInventario },
        motivo: limpio,
      });
    });
  }
}
