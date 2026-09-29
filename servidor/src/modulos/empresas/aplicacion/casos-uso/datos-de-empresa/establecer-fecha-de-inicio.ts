import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { CargaInicial } from '../../../dominio/carga-inicial.js';
import type { CargaInicialDto } from '../../dto/datos-de-empresa.dto.js';
import type { DependenciasDeDatosDeEmpresa } from './dependencias.js';

interface CambioDeFechaDeInicio {
  empresaId: string;
  fechaDeInicio: string;
}

export class EstablecerFechaDeInicio {
  constructor(private readonly dependencias: DependenciasDeDatosDeEmpresa) {}

  /**
   * Registra la fecha de inicio la primera vez y la corrige después, mientras la carga esté abierta.
   * @throws CargaInicialCerrada si la carga ya se cerró.
   * @throws FechaDeInicioInvalida si no es una fecha real.
   * @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella.
   */
  ejecutar(operador: Operador, { empresaId, fechaDeInicio }: CambioDeFechaDeInicio): Promise<CargaInicialDto> {
    const { ejecutorEnEmpresa, repositorioCargas, consultas } = this.dependencias;
    return ejecutorEnEmpresa.ejecutar(operador, empresaId, async () => {
      const id = Identificador.desde<'Empresa'>(empresaId);
      const carga = await repositorioCargas.buscar(id);
      if (carga) carga.cambiarFechaDeInicio(fechaDeInicio);
      await repositorioCargas.guardar(carga ?? CargaInicial.iniciar(id, fechaDeInicio));
      return consultas.cargaInicial(empresaId);
    });
  }
}
