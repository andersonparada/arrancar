import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { FechaDeInicioRequerida } from '../../../dominio/errores.js';
import type { CargaInicialDto } from '../../dto/datos-de-empresa.dto.js';
import type { DependenciasDeDatosDeEmpresa } from './dependencias.js';

export class CerrarCargaInicial {
  constructor(private readonly dependencias: DependenciasDeDatosDeEmpresa) {}

  /**
   * Cierra la carga inicial: la fecha de inicio queda fija y los módulos ya no aceptan saldos iniciales.
   * @throws FechaDeInicioRequerida si aún no se registró la fecha de inicio.
   * @throws CargaInicialCerrada si ya estaba cerrada.
   * @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella.
   */
  ejecutar(operador: Operador, empresaId: string): Promise<CargaInicialDto> {
    const { ejecutorEnEmpresa, repositorioCargas, consultas } = this.dependencias;
    return ejecutorEnEmpresa.ejecutar(operador, empresaId, async () => {
      const carga = await repositorioCargas.buscar(Identificador.desde(empresaId));
      if (!carga) throw new FechaDeInicioRequerida();
      carga.cerrar({ cerradaEn: new Date(), cerradaPor: operador.usuarioId });
      await repositorioCargas.guardar(carga);
      return consultas.cargaInicial(empresaId);
    });
  }
}
