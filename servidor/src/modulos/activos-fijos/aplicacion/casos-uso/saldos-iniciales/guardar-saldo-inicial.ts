import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { crearActivoDeSaldoInicial } from '../../../dominio/saldos-iniciales/activo-de-saldo-inicial.js';
import type { SaldoInicialDto, SolicitudDeSaldoInicial } from '../../dto/saldo-inicial.dto.js';
import { ArmadorDeSaldoInicial } from './armador-de-saldo-inicial.js';
import { exigirCargaAbierta, type DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';

export class GuardarSaldoInicial {
  private readonly armador: ArmadorDeSaldoInicial;

  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {
    this.armador = new ArmadorDeSaldoInicial(dependencias);
  }

  /**
   * Carga un activo que la empresa ya tenía al día de corte (§8): crea el activo en uso (o en construcción), su costo
   * `saldo_inicial`, lo que traía depreciado en cada libro, el traslado del alta y los dos tramos de depreciación.
   * @throws SaldoInicialSinFechaDeInicio, CargaInicialCerrada o SaldosConCierres si no se puede cargar.
   * @throws SaldoInicialInvalido, ActivoInvalido u otro error de datos si no cumple las reglas.
   * @throws RecursoDuplicado si el código ya existe.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeSaldoInicial): Promise<SaldoInicialDto> {
    const { unidadDeTrabajo, repositorio, consultas, topes } = this.dependencias;
    const porInciso = await topes.paraEmpresa(operador);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const fechaDeInicio = await exigirCargaAbierta(this.dependencias, operador);
      const { plan, inciso } = await this.armador.armar(operador, {
        solicitud,
        fechaDeInicio,
        topes: porInciso,
        actual: null,
      });
      const activo = crearActivoDeSaldoInicial(Identificador.desde(operador.empresaId), plan.activo, inciso);
      await repositorio.agregar(activo);
      await this.armador.guardarLibros(operador, activo.id.valor, plan);
      return consultas.obtener(activo.id.valor);
    });
  }
}
