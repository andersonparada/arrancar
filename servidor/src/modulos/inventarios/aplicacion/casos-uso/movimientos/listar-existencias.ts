import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { VistaDelKardex } from '../../dto/documento.dto.js';
import type { ExistenciaDto, FiltrosDeExistencias } from '../../dto/existencia.dto.js';
import type { DependenciasDelKardex } from '../../kardex/dependencias-del-kardex.js';
import { existenciaSegunLaVista } from '../../kardex/vista-del-kardex.js';

type Dependencias = Pick<DependenciasDelKardex, 'unidadDeTrabajo' | 'consultas'>;

export class ListarExistencias {
  constructor(private readonly dependencias: Dependencias) {}

  /** La cantidad por bodega, artículo y lote de las bodegas que el usuario ve; sin `costos.ver`, sin costo ni valor. */
  ejecutar(operador: Operador, filtros: FiltrosDeExistencias, vista: VistaDelKardex): Promise<ExistenciaDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () =>
      (await consultas.existencias(filtros)).map((existencia) => existenciaSegunLaVista(existencia, vista)),
    );
  }
}
