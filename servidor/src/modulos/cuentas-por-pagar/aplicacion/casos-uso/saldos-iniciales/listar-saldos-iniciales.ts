import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { dtoDeSaldoInicial } from '../../dto/dto-de-saldo-inicial.js';
import type { PaginaDeSaldosInicialesDto } from '../../dto/saldo-inicial.dto.js';
import type { PaginacionDeDocumentos } from '../../puertos/puertos-de-consultas.js';
import type { DependenciasDeConsultaDeSaldos } from './dependencias-de-saldos-iniciales.js';

/**
 * Los saldos iniciales de la empresa, del más reciente al más antiguo, con la carga inicial (para que la ventana diga si
 * se puede cargar).
 */
export class ListarSaldosIniciales {
  constructor(private readonly dependencias: DependenciasDeConsultaDeSaldos) {}

  ejecutar(
    operador: Operador,
    filtro: { proveedorId?: string },
    paginacion: PaginacionDeDocumentos,
  ): Promise<PaginaDeSaldosInicialesDto> {
    const { unidadDeTrabajo, consultas, cargaInicial, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const carga = await cargaInicial.obtener(operador);
      const hoy = await reloj.hoy(operador);
      const { filas, total } = await consultas.listar(
        { ...filtro, origen: 'saldo_inicial', estado: 'todos' },
        paginacion,
        hoy,
      );
      const elementos = filas.map((fila) => dtoDeSaldoInicial(fila, carga.cerrada));
      return { carga, elementos, total, ...paginacion };
    });
  }
}
