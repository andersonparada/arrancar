import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { CargaInicialCerrada, FechaDeInicioRequerida } from '../../../dominio/errores.js';
import type { CargaInicialDto, RevisionDeCierreDto } from '../../dto/datos-de-empresa.dto.js';
import { ArmadorDeLaRevision } from './armador-de-la-revision.js';
import type { DependenciasDeDatosDeEmpresa } from './dependencias.js';

export class RevisarCierreDeCargaInicial {
  private readonly armador: ArmadorDeLaRevision;

  constructor(private readonly dependencias: DependenciasDeDatosDeEmpresa) {
    this.armador = new ArmadorDeLaRevision(dependencias.preguntas);
  }

  /**
   * Lo que se ve antes de cerrar: lo propio de la empresa y lo que encontró cada módulo activo, con una huella para
   * saber si algo cambió entre revisar y cerrar.
   * @throws FechaDeInicioRequerida si aún no se registró la fecha de inicio.
   * @throws CargaInicialCerrada si ya estaba cerrada.
   * @throws RecursoNoEncontrado si la empresa no es de la cuenta o el operador no tiene acceso a ella.
   */
  ejecutar(operador: Operador, empresaId: string): Promise<RevisionDeCierreDto> {
    const { ejecutorEnEmpresa, consultas } = this.dependencias;
    return ejecutorEnEmpresa.ejecutar(operador, empresaId, async () => {
      const carga = await consultas.cargaInicial(empresaId);
      return this.armador.armar(operador, exigirAbierta(carga));
    });
  }
}

/** La carga con fecha de inicio y abierta: lo único que se puede revisar para cerrar. */
export function exigirAbierta(carga: CargaInicialDto): CargaInicialDto & { fechaDeInicio: string } {
  if (carga.fechaDeInicio === null) throw new FechaDeInicioRequerida();
  if (carga.cerrada) throw new CargaInicialCerrada();
  return { ...carga, fechaDeInicio: carga.fechaDeInicio };
}
