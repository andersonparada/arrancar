import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { fechaDeCorteDe } from '../../../dominio/saldos-iniciales/saldo-inicial.js';
import type { ListaDeSaldosInicialesDto, SaldoInicialDto } from '../../dto/saldo-inicial.dto.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';
import { totalesDeSaldos, totalesPorClase } from './totales-de-saldos-iniciales.js';

type Lectura = Pick<DependenciasDeSaldosIniciales, 'unidadDeTrabajo' | 'consultas' | 'cargaInicial'>;

export class ListarSaldosIniciales {
  constructor(private readonly dependencias: Lectura) {}

  /** Los saldos iniciales de la empresa con el estado de la carga y el cuadre (totales y por clase). */
  ejecutar(operador: Operador): Promise<ListaDeSaldosInicialesDto> {
    const { unidadDeTrabajo, consultas, cargaInicial } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { fechaDeInicio, cerrada } = await cargaInicial.obtener(operador);
      const saldos = await consultas.listar();
      return {
        fechaDeInicio,
        fechaDeCorte: fechaDeInicio ? fechaDeCorteDe(fechaDeInicio) : null,
        cargaCerrada: cerrada,
        totales: totalesDeSaldos(saldos),
        porClase: totalesPorClase(saldos),
        saldos,
      };
    });
  }
}

export class ObtenerSaldoInicial {
  constructor(private readonly dependencias: Pick<DependenciasDeSaldosIniciales, 'unidadDeTrabajo' | 'consultas'>) {}

  /** @throws RecursoNoEncontrado si no existe o no viene de un saldo inicial. */
  ejecutar(operador: Operador, activoId: string): Promise<SaldoInicialDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(activoId));
  }
}
