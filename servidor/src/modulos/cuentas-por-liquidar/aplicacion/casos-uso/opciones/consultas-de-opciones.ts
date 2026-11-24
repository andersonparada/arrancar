import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { dtoDeMedios, type MediosParaElegirDto } from '../../dto/opciones.dto.js';
import type {
  BeneficiarioParaElegir,
  BeneficiariosParaElegir,
  ConceptoParaGasto,
  ConceptosParaGasto,
  MediosDePagoDeBancos,
} from '../../puertos/puertos-de-opciones.js';

interface DependenciasDeMedios {
  unidadDeTrabajo: UnidadDeTrabajo;
  medios: MediosDePagoDeBancos;
  reloj: Reloj;
}

/**
 * Las cuentas y chequeras de Bancos para entregar un anticipo o reembolsar lo gastado de más: las activas, con su saldo a la
 * fecha (hoy si no se pide) y el siguiente cheque de cada chequera. Cada ruta exige el permiso de su acción, no el de Bancos.
 */
export class ListarMediosParaElegir {
  constructor(private readonly dependencias: DependenciasDeMedios) {}

  ejecutar(operador: Operador, fecha?: string): Promise<MediosParaElegirDto> {
    const { unidadDeTrabajo, medios, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () =>
      dtoDeMedios(await medios.medios(operador, fecha ?? (await reloj.hoy(operador)))),
    );
  }
}

/** Los conceptos de gasto activos, por nombre: lo que se elige al registrar un gasto sin documento. */
export class ListarConceptosParaGasto {
  constructor(private readonly dependencias: { unidadDeTrabajo: UnidadDeTrabajo; conceptos: ConceptosParaGasto }) {}

  ejecutar(operador: Operador): Promise<ConceptoParaGasto[]> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () => this.dependencias.conceptos.listarActivos());
  }
}

/**
 * A quién se puede entregar un anticipo (todos los terceros activos, con su NIT) o, para quien solo mira la lista, los
 * beneficiarios que ya tienen anticipos en la empresa (sin NIT); no pide `terceros.ver`.
 */
export class ListarBeneficiariosParaElegir {
  constructor(
    private readonly dependencias: { unidadDeTrabajo: UnidadDeTrabajo; beneficiarios: BeneficiariosParaElegir },
  ) {}

  ejecutar(operador: Operador, catalogoCompleto: boolean): Promise<BeneficiarioParaElegir[]> {
    const { unidadDeTrabajo, beneficiarios } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () =>
      catalogoCompleto ? beneficiarios.listarActivos() : beneficiarios.listarConAnticipos(),
    );
  }
}
