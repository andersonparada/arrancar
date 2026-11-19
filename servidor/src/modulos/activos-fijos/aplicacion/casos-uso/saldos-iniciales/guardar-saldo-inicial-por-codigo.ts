import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { SaldoInicialDto, SolicitudDeSaldoInicial } from '../../dto/saldo-inicial.dto.js';
import type { RepositorioActivos } from '../../puertos/repositorio-activos.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';
import type { GuardarSaldoInicial } from './guardar-saldo-inicial.js';

/** Un saldo inicial que nombra a su activo principal por su código, como se escribe en Excel. */
export type SolicitudDeSaldoPorCodigo = Omit<SolicitudDeSaldoInicial, 'activoPadreId'> & {
  activoPadreCodigo: string | null;
};

interface Dependencias extends Pick<DependenciasDeSaldosIniciales, 'unidadDeTrabajo'> {
  repositorio: RepositorioActivos;
  guardar: GuardarSaldoInicial;
}

export class GuardarSaldoInicialPorCodigo {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Lo mismo que cargar un saldo, buscando el activo principal por su código: el padre puede ser uno ya cargado o uno de
   * una fila anterior del mismo archivo (las filas se crean en orden).
   * @throws RecursoNoEncontrado si no hay un activo con el código del padre.
   */
  ejecutar(
    operador: Operador,
    { activoPadreCodigo, ...solicitud }: SolicitudDeSaldoPorCodigo,
  ): Promise<SaldoInicialDto> {
    const { unidadDeTrabajo, repositorio, guardar } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const codigo = activoPadreCodigo?.trim() ?? '';
      const activoPadreId = codigo ? await repositorio.idPorCodigo(codigo) : null;
      if (codigo && !activoPadreId) throw new RecursoNoEncontrado(`El activo principal "${codigo}"`);
      return guardar.ejecutar(operador, { ...solicitud, activoPadreId });
    });
  }
}
