import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { ComprobanteYaAnulado, SoloElValeDeGastoSeAnula } from '../../../dominio/errores-de-comprobantes.js';
import { exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import type { ComprobanteDto } from '../../dto/comprobantes.dto.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import { AnuladorDeComprobantes } from './anulador-de-comprobantes.js';
import { comprobanteDto } from './armado-del-comprobante.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';

export interface PeticionDeAnular {
  comprobanteId: string;
  motivo: string;
}

/**
 * Anula un vale de gasto (`comprobantes.anular`, §5.4 e): no repuesto; audita `anular` con el vale como estaba y el motivo.
 * Un documento no se anula aquí: se anula en el libro de compras (que avisa a Caja chica) o se devuelve a la bandeja.
 */
export class AnularComprobante {
  private readonly lector: LectorDelFondo;
  private readonly anulador: AnuladorDeComprobantes;

  constructor(private readonly dependencias: DependenciasDeComprobantes) {
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
    this.anulador = new AnuladorDeComprobantes(dependencias);
  }

  /** @throws RecursoNoEncontrado, SoloElValeDeGastoSeAnula, ComprobanteYaAnulado, ComprobanteRepuesto, FondoNoDisponible */
  async ejecutar(operador: Operador, pedido: PeticionDeAnular): Promise<ComprobanteDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async anular(operador: Operador, { comprobanteId, motivo }: PeticionDeAnular) {
    const { comprobantes } = this.dependencias;
    const visto = await comprobantes.buscar(comprobanteId);
    if (!visto) throw new RecursoNoEncontrado('El comprobante');
    if (visto.clase !== 'vale_de_gasto') throw new SoloElValeDeGastoSeAnula();
    exigirFondoAbierto(await this.lector.bloquear(visto.fondoId!));
    const comprobante = (await comprobantes.bloquear(comprobanteId))!;
    if (comprobante.estado === 'anulado') throw new ComprobanteYaAnulado();
    const eventos = await this.anulador.anular(operador, { comprobante, motivo });
    return { dto: comprobanteDto((await comprobantes.buscar(comprobanteId))!), eventos };
  }
}
