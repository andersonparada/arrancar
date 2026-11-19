import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ActivoFichaDto, SolicitudDeEdicionDeActivo } from '../../dto/activo.dto.js';
import { claseParaActivo, validarFechaDeAdquisicion, validarPadre } from './comprobaciones-de-activo.js';
import { activoExistente, type DependenciasDeActivos } from './dependencias-de-activos.js';

interface CambioDeActivo {
  activoId: string;
  solicitud: SolicitudDeEdicionDeActivo;
}

export class EditarActivo {
  constructor(private readonly dependencias: DependenciasDeActivos) {}

  /**
   * Cambia los datos descriptivos. La clase, el padre, la cantidad, el origen y la fecha de adquisición solo en
   * construcción; la matrícula y el catastro, mientras el activo no tenga libros.
   * @throws RecursoNoEncontrado si no existe o no es de la empresa.
   * @throws ActivoInvalido si cambia algo que ya no se puede cambiar.
   */
  ejecutar(operador: Operador, { activoId, solicitud }: CambioDeActivo): Promise<ActivoFichaDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const activo = await activoExistente(repositorio, activoId);
      const clase = await claseParaActivo(this.dependencias, solicitud.claseId);
      const { fechaDeAdquisicion: fecha, activoPadreId: padreId } = solicitud;
      if (fecha !== activo.instantanea().fechaDeAdquisicion)
        await validarFechaDeAdquisicion(this.dependencias, { operador, fecha });
      if (padreId !== activo.instantanea().activoPadreId) await validarPadre(this.dependencias, { padreId, activoId });
      activo.cambiarDatos(solicitud, clase.instantanea().incisoFiscal);
      await repositorio.guardar(activo);
      return consultas.obtener(activoId);
    });
  }
}
