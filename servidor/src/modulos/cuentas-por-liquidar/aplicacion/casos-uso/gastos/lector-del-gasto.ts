import type { Gasto } from '../../../dominio/gastos.js';
import { dtoDelGasto, type GastoDto } from '../../dto/gastos.dto.js';
import type { DependenciasDeGastos } from './dependencias-de-gastos.js';

/** Arma el `GastoDto` de un gasto ya guardado, en cualquier estado: sirve para auditarlo y para responder cómo quedó. */
export class LectorDelGasto {
  constructor(private readonly dependencias: Pick<DependenciasDeGastos, 'documentos'>) {}

  async leer(gasto: Gasto, avisos: readonly string[] = []): Promise<GastoDto> {
    const documento =
      gasto.documentoDeCompraId === null ? null : await this.dependencias.documentos.datosDe(gasto.documentoDeCompraId);
    return dtoDelGasto({ gasto, documento }, avisos);
  }
}
