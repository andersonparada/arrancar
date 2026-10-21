import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { PaginaDeDteRecibidosDto } from '../../dto/dte-recibido.dto.js';
import type {
  ConsultasDeLaBandeja,
  FiltroDeLaBandeja,
  PaginacionDeLaBandeja,
} from '../../puertos/puertos-de-la-bandeja.js';
import { dtoDeDteRecibido } from './dto-de-dte-recibido.js';
import type { ProponedorDeDte } from './proponedor-de-dte.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultasDeLaBandeja: ConsultasDeLaBandeja;
  crearProponedor: (operador: Operador) => ProponedorDeDte;
}

/**
 * La bandeja de DTE recibidos de la empresa, de la emisión más reciente a la más antigua, filtrada y paginada. Cada fila
 * pendiente trae su propuesta (proveedor, concepto, destino, recepción y período) calculada al mostrarla.
 */
export class ListarDteRecibidos {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(
    operador: Operador,
    filtro: FiltroDeLaBandeja,
    paginacion: PaginacionDeLaBandeja,
  ): Promise<PaginaDeDteRecibidosDto> {
    const { unidadDeTrabajo, consultasDeLaBandeja, crearProponedor } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { filas, total } = await consultasDeLaBandeja.listar(filtro, paginacion);
      const proponedor = crearProponedor(operador);
      const elementos = [];
      for (const fila of filas) {
        const propuesta = fila.estado === 'pendiente' ? await proponedor.proponer(fila) : null;
        elementos.push(dtoDeDteRecibido(fila, propuesta));
      }
      return { elementos, total, ...paginacion };
    });
  }
}
