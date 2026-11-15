import type { DocumentoConAplicaciones } from '../../../dominio/documento-por-pagar.js';
import { CargoNoDisponible } from '../../../dominio/errores-de-aplicaciones.js';
import {
  exigirCargoPagable,
  exigirMontoQueCabe,
  type CargoParaPagar,
  type LineaPedida,
} from '../../../dominio/registro-de-pago.js';
import { bloquear } from '../acciones/dependencias-de-acciones.js';
import { saldoDeLaFila } from '../aplicaciones/dependencias-de-aplicaciones.js';
import type { DependenciasDeRegistrarPago, LineaRevisada } from './dependencias-de-pagos.js';

type Dependencias = Pick<DependenciasDeRegistrarPago, 'documentos' | 'consultas' | 'contrasenas'>;

/** Los cargos del pago ya bloqueados y revisados, con cada uno como estaba antes del pago (para auditar). */
export interface PagoBloqueado {
  lineas: LineaRevisada[];
  guardados: Map<string, DocumentoConAplicaciones>;
}

/**
 * Revisa los cargos de un pago: son del proveedor, están autorizados y en una contraseña vigente (de ahí sale la contraseña
 * de cada línea) y cada monto cabe en el saldo. Se usa dos veces: sin bloquear, antes de gastar un número de cheque en Bancos,
 * y con las filas bloqueadas, por si otro pago llegó primero.
 */
export class RevisorDelPago {
  constructor(private readonly dependencias: Dependencias) {}

  /** Lee y revisa cada cargo sin bloquear nada. @throws RecursoNoEncontrado, CargoNoDisponible, DocumentoFueraDeLaContrasena, DocumentoSinAutorizar, PagoMayorQueElSaldo */
  async revisar(proveedorId: string, lineas: readonly LineaPedida[]): Promise<LineaRevisada[]> {
    const revisadas: LineaRevisada[] = [];
    for (const [indice, linea] of lineas.entries()) revisadas.push(await this.revisarUna(proveedorId, linea, indice));
    return revisadas;
  }

  /**
   * Bloquea las contraseñas y después los cargos, cada grupo en orden de id (el orden de todo el módulo), y vuelve a revisar
   * con lo que quedó confirmado.
   */
  async bloquearYRevisar(
    proveedorId: string,
    lineas: readonly LineaPedida[],
    previas: readonly LineaRevisada[],
  ): Promise<PagoBloqueado> {
    const { contrasenas } = this.dependencias;
    for (const id of [...new Set(previas.map(({ contrasena }) => contrasena.id))].sort())
      await contrasenas.bloquear(id);
    const guardados = new Map<string, DocumentoConAplicaciones>();
    for (const { cargoId } of [...lineas].sort((a, b) => a.cargoId.localeCompare(b.cargoId))) {
      guardados.set(cargoId, await bloquear(this.dependencias.documentos, cargoId));
    }
    return { lineas: await this.revisar(proveedorId, lineas), guardados };
  }

  private async revisarUna(proveedorId: string, linea: LineaPedida, indice: number): Promise<LineaRevisada> {
    const fila = await this.dependencias.consultas.buscar(linea.cargoId);
    if (!fila) throw new CargoNoDisponible(null, indice);
    const cargo: CargoParaPagar = {
      documento: fila.documento,
      saldoCentavos: saldoDeLaFila(fila),
      contrasenaId: fila.contrasena?.id ?? null,
    };
    exigirCargoPagable(cargo, proveedorId, indice);
    exigirMontoQueCabe(cargo, linea.montoCentavos, indice);
    return {
      indice,
      fila,
      saldoCentavos: cargo.saldoCentavos,
      montoCentavos: linea.montoCentavos,
      contrasena: fila.contrasena!,
    };
  }
}
