import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavosEnteros, deCentavosEnteros } from '../../../dominio/decimales.js';
import { diaAnterior } from '../../../dominio/fechas.js';
import type { SaldoInicialDto, SaldosInicialesDto, TotalesDeSaldosIniciales } from '../../dto/saldo-inicial.dto.js';
import { metodoDelDia } from '../../kardex/metodo-de-la-empresa.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';

export function totalesDe(saldos: readonly SaldoInicialDto[]): TotalesDeSaldosIniciales {
  const valor = saldos.reduce((suma, saldo) => suma + aCentavosEnteros(saldo.costoTotal), 0n);
  return {
    renglones: saldos.length,
    articulos: new Set(saldos.map((saldo) => saldo.articuloId)).size,
    valor: deCentavosEnteros(valor),
  };
}

export class ListarSaldosIniciales {
  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {}

  /**
   * Lo que la pantalla «Saldos iniciales de inventario» necesita: la fecha de inicio y el día del saldo, si la carga ya
   * está cerrada, el método de costeo (elegido o propuesto) y los renglones de las bodegas que el usuario ve con sus totales.
   */
  ejecutar(operador: Operador): Promise<SaldosInicialesDto> {
    const { unidadDeTrabajo, cargaInicial, saldos, metodos, metodoInicial, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { fechaDeInicio, cerrada } = await cargaInicial.obtener(operador);
      const renglones = await saldos.listar();
      const vigente = metodoDelDia(await metodos.listar(), await reloj.hoy(operador));
      return {
        fechaDeInicio,
        fechaDelSaldo: fechaDeInicio ? diaAnterior(fechaDeInicio) : null,
        cargaCerrada: cerrada,
        metodo: {
          elegido: vigente !== null,
          metodo: vigente?.metodo ?? (await metodoInicial.paraEmpresa(operador)),
        },
        totales: totalesDe(renglones),
        saldos: renglones,
      };
    });
  }
}
