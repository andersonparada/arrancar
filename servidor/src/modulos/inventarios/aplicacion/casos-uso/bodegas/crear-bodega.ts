import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Bodega } from '../../../dominio/bodega.js';
import { datosDeBodega, dtoDeBodega } from '../../datos-de-bodega.js';
import type { BodegaDto, SolicitudDeBodega } from '../../dto/bodega.dto.js';
import { auditarAsignacionesAlGuardar } from './auditar-asignaciones-al-guardar.js';
import type { DependenciasDeBodegas } from './dependencias-de-bodegas.js';

export class CrearBodega {
  constructor(private readonly dependencias: DependenciasDeBodegas) {}

  /**
   * Quien la crea queda con acceso a ella y el responsable con usuario también (lo hacen disparadores de la base de
   * datos); esas asignaciones quedan en la auditoría. Al importar desde Excel no se asigna a quien importa.
   * @throws BodegaInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si el código o el nombre ya existen en la empresa.
   * @throws RecursoNoEncontrado si la localidad o el responsable no existen.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeBodega): Promise<BodegaDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const bodega = Bodega.crear(Identificador.desde(operador.empresaId), datosDeBodega(solicitud));
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await consultas.exigirReferencias(solicitud);
      await repositorio.agregar(bodega);
      // Sin asignar, quien importa no ve la bodega nueva: no se vuelve a leer.
      if (operador.sinAsignarAlCrear) return dtoDeBodega(bodega);
      await auditarAsignacionesAlGuardar(this.dependencias, { operador, bodega, antes: [] });
      return consultas.obtener(bodega.id.valor);
    });
  }
}
