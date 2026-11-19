import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { FormatoDeChequeInvalido } from '../../../dominio/errores-de-impresion.js';
import { plantillasDeFabrica, type PlantillaDeCheque } from '../../../dominio/formatos-de-cheque/plantillas.js';
import type { FormatoDeChequeDetalleDto, FormatoDeChequeDto } from '../../dto/formato-de-cheque.dto.js';
import { resolverFormato } from '../../formatos-de-cheque/resolucion-de-formato.js';
import type { DependenciasDeFormatosDeCheque } from './dependencias-de-formatos-de-cheque.js';

type Lectura = Pick<DependenciasDeFormatosDeCheque, 'unidadDeTrabajo' | 'consultas'>;

/** Los formatos de la cuenta, ordenados por nombre. */
export class ListarFormatosDeCheque {
  constructor(private readonly dependencias: Lectura) {}

  ejecutar(operador: Operador): Promise<FormatoDeChequeDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar());
  }
}

/** Un formato con sus medidas resueltas; si sus ajustes dejaron de ser válidos, sale como dañado y sin medidas. */
export class ObtenerFormatoDeCheque {
  constructor(private readonly dependencias: Lectura) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la cuenta. */
  ejecutar(operador: Operador, formatoId: string): Promise<FormatoDeChequeDetalleDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const formato = await consultas.obtener(formatoId);
      try {
        return { ...formato, resuelto: resolverFormato(formato.base, formato.ajustes), danado: false };
      } catch (error) {
        if (!(error instanceof FormatoDeChequeInvalido)) throw error;
        return { ...formato, resuelto: null, danado: true };
      }
    });
  }
}

/** Las plantillas de fábrica con sus medidas aproximadas. */
export class ListarPlantillasDeCheque {
  ejecutar(): readonly PlantillaDeCheque[] {
    return plantillasDeFabrica();
  }
}
