import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { dtoDelGasto, type GastoDeBandejaDto, type GastoDto } from '../../dto/gastos.dto.js';
import type { DependenciasDeGastos } from './dependencias-de-gastos.js';

type Dependencias = Pick<DependenciasDeGastos, 'unidadDeTrabajo' | 'consultas' | 'anticipos'>;

export interface FiltroDeLaBandeja {
  proveedorId?: string | undefined;
  desde?: string | undefined;
  hasta?: string | undefined;
  conRetencion?: boolean | undefined;
  /** El usuario tiene `gastos.con-retencion`: decide si ve el documento con retención como asignable. */
  puedeConRetencion: boolean;
}

/**
 * La bandeja de Cuentas por liquidar: los documentos del libro que llegaron sin anticipo, con lo que retienen y si quien mira
 * los puede asignar con la excepción de retención (`anticipos.ver`).
 */
export class ListarBandeja {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, { puedeConRetencion, ...filtro }: FiltroDeLaBandeja): Promise<GastoDeBandejaDto[]> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const filas = await this.dependencias.consultas.listar({ ...filtro, anticipoId: null });
      return filas.map((fila) => ({ ...dtoDelGasto(fila), puedeAsignarConRetencion: puedeConRetencion }));
    });
  }
}

/** Los gastos vigentes de un anticipo, del más antiguo al más nuevo (`anticipos.ver`). */
export class ListarGastosDelAnticipo {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si el anticipo no existe. */
  ejecutar(operador: Operador, anticipoId: string): Promise<GastoDto[]> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      if (!(await this.dependencias.anticipos.buscar(anticipoId))) throw new RecursoNoEncontrado('El anticipo');
      const filas = await this.dependencias.consultas.listar({ anticipoId });
      return filas.map((fila) => dtoDelGasto(fila));
    });
  }
}
