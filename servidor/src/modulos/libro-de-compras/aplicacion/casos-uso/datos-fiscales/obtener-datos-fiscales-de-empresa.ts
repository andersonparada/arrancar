import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { DatosFiscalesDeEmpresaDto } from '../../dto/datos-fiscales.dto.js';
import type {
  AccesoAEmpresas,
  ConsultaDePeriodosConDocumentos,
  RepositorioDeDatosFiscalesDeEmpresa,
} from '../../puertos/repositorios-de-datos-fiscales.js';
import { dtoDeEmpresa } from './dtos-de-datos-fiscales.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  repositorio: RepositorioDeDatosFiscalesDeEmpresa;
  documentos: ConsultaDePeriodosConDocumentos;
  acceso: AccesoAEmpresas;
  reloj: Reloj;
}

export class ObtenerDatosFiscalesDeEmpresa {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Trabaja con la empresa pedida como empresa de la transacción (el formulario de Empresas edita cualquiera
   * de la cuenta, no solo la activa). Trae lo que rige hoy y el historial; sin datos guardados, el formulario vacío.
   * @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella.
   */
  ejecutar(operador: Operador, empresaId: string): Promise<DatosFiscalesDeEmpresaDto> {
    const { unidadDeTrabajo, repositorio, documentos, acceso, reloj } = this.dependencias;
    const contexto = { ...operador, empresaId };
    return unidadDeTrabajo.ejecutar(contexto, async () => {
      await acceso.exigirAcceso(operador, empresaId);
      return dtoDeEmpresa(empresaId, await repositorio.historial(empresaId), {
        hoy: await reloj.hoy(contexto),
        periodosConDocumentos: await documentos.periodosConDocumentosVigentes(empresaId),
      });
    });
  }
}
