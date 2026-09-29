import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { DatosFiscales } from '../../../dominio/datos-fiscales.js';
import type { DatosFiscalesDto, SolicitudDeDatosFiscales } from '../../dto/datos-de-empresa.dto.js';
import type { DependenciasDeDatosDeEmpresa } from './dependencias.js';

interface CambioDeDatosFiscales {
  empresaId: string;
  solicitud: SolicitudDeDatosFiscales;
}

export class GuardarDatosFiscales {
  constructor(private readonly dependencias: DependenciasDeDatosDeEmpresa) {}

  /**
   * @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella.
   * @throws RazonSocialInvalida | NombreComercialInvalido si un texto pasa de 200 caracteres.
   */
  ejecutar(operador: Operador, { empresaId, solicitud }: CambioDeDatosFiscales): Promise<DatosFiscalesDto> {
    const { ejecutorEnEmpresa, repositorioFiscales, consultas } = this.dependencias;
    return ejecutorEnEmpresa.ejecutar(operador, empresaId, async () => {
      await repositorioFiscales.guardar(DatosFiscales.crear(Identificador.desde(empresaId), solicitud));
      return consultas.datosFiscales(empresaId);
    });
  }
}
