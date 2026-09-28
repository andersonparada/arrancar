import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Cheque } from '../../../dominio/cheque.js';
import { Chequera } from '../../../dominio/chequera.js';
import { CuentaBancariaInactiva, RangoDeChequesTraslapado } from '../../../dominio/errores.js';
import type { ChequeraDto, SolicitudDeChequera } from '../../dto/chequera.dto.js';
import type { DependenciasDeChequeras } from './dependencias-de-chequeras.js';

/** Crea la chequera e inserta todos sus cheques como disponibles, en una sola unidad de trabajo. */
export class CrearChequera {
  constructor(private readonly dependencias: DependenciasDeChequeras) {}

  /**
   * @throws CuentaBancariaInactiva si la cuenta está inactiva.
   * @throws ChequeraInvalida o ChequeraDemasiadoGrande si el rango no es válido o excede el máximo configurado.
   * @throws RangoDeChequesTraslapado si se traslapa con otra chequera de la misma cuenta y serie.
   */
  ejecutar(operador: Operador, solicitud: SolicitudDeChequera): Promise<ChequeraDto> {
    const { unidadDeTrabajo, repositorio, repositorioCheques, consultas, consultasMovimientos, limiteDeChequera } =
      this.dependencias;
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!(await consultasMovimientos.cuentaEstaActiva(solicitud.cuentaBancariaId))) {
        throw new CuentaBancariaInactiva();
      }
      await this.exigirSinTraslape(solicitud);
      const maximo = await limiteDeChequera.maximoDeCheques(operador);
      const chequera = Chequera.crear(empresaId, solicitud, maximo);
      await repositorio.agregar(chequera);
      const cheques = chequera.numeros.map((numero) => Cheque.crear(empresaId, chequera.id.valor, numero));
      await repositorioCheques.agregarVarios(cheques);
      return consultas.obtener(chequera.id.valor);
    });
  }

  private async exigirSinTraslape(solicitud: SolicitudDeChequera): Promise<void> {
    const { repositorio } = this.dependencias;
    const serie = solicitud.serie?.trim() || null;
    const rangos = await repositorio.rangosDeLaCuenta(solicitud.cuentaBancariaId);
    const seTraslapan = rangos.some(
      (rango) => rango.serie === serie && solicitud.desde <= rango.hasta && solicitud.hasta >= rango.desde,
    );
    if (seTraslapan) throw new RangoDeChequesTraslapado();
  }
}
