import { AccesoDenegado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { VistaDelKardex } from '../../dto/documento.dto.js';
import type { FiltrosDeKardex, KardexDelArticuloDto } from '../../dto/existencia.dto.js';
import { armarKardex } from '../../kardex/armar-kardex.js';
import type { DependenciasDelKardex } from '../../kardex/dependencias-del-kardex.js';

type Dependencias = Pick<DependenciasDelKardex, 'unidadDeTrabajo' | 'consultas'>;

export interface PedidoDeKardex {
  articuloId: string;
  filtros: FiltrosDeKardex;
}

export class KardexDelArticulo {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * El kardex de un artículo. **Con bodega**, lleva su propio saldo (los de la empresa no salen); **sin bodega**, el de
   * toda la empresa, que solo ve quien tiene alcance total de bodegas.
   * @throws AccesoDenegado si pide el kardex de la empresa sin ver todas las bodegas.
   * @throws RecursoNoEncontrado si el artículo (o la bodega) no existe o no se ve.
   */
  async ejecutar(operador: Operador, pedido: PedidoDeKardex, vista: VistaDelKardex): Promise<KardexDelArticuloDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    const { articuloId, filtros } = pedido;
    const bodegaId = filtros.bodegaId ?? null;
    if (!bodegaId && !vista.veTodasLasBodegas) {
      throw new AccesoDenegado(
        'Elija una bodega: el kardex de toda la empresa es solo para quien ve todas las bodegas.',
      );
    }
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const articulo = await consultas.articulo(articuloId);
      const filas = await consultas.filasDeKardex(articuloId, bodegaId);
      const opciones = { porBodega: bodegaId !== null, verCostos: vista.verCostos, ...filtros };
      return {
        articuloId: articulo.id,
        articuloCodigo: articulo.codigo,
        articuloNombre: articulo.nombre,
        unidadBaseNombre: articulo.unidadBaseNombre,
        bodegaId,
        renglones: armarKardex(filas, opciones),
      };
    });
  }
}
