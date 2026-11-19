import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Activo } from '../../../dominio/activo.js';
import type { ActivoFichaDto, SolicitudDeActivo } from '../../dto/activo.dto.js';
import {
  claseParaActivo,
  validarFechaDeAdquisicion,
  validarPadre,
  validarUbicacion,
} from './comprobaciones-de-activo.js';
import type { DependenciasDeActivos } from './dependencias-de-activos.js';
import { proponerCodigo } from './proponer-codigo.js';

export class CrearActivo {
  constructor(private readonly dependencias: DependenciasDeActivos) {}

  /**
   * Alta manual, sin costos (AF-2): un activo del balance nace en construcción; un bien de control o de terceros, en
   * uso. Deja la primera fila del historial de traslados con la ubicación inicial.
   * @throws ActivoInvalido, ValorFiscalSoloEnEdificios u otro error de datos si no cumple las reglas.
   * @throws FechaAnteriorAlInicio si la adquisición es anterior al inicio de la empresa (va como saldo inicial).
   * @throws RecursoDuplicado si el código ya existe.
   */
  ejecutar(operador: Operador, solicitud: SolicitudDeActivo): Promise<ActivoFichaDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const clase = await this.comprobar(operador, solicitud);
      const codigo = solicitud.codigo?.trim() || (await proponerCodigo(this.dependencias, operador));
      const { enBodega, localidadId, departamentoId, responsable, ...datos } = solicitud;
      const activo = Activo.crear(
        Identificador.desde(operador.empresaId),
        { datos: { ...datos, codigo }, ubicacion: { enBodega, localidadId, departamentoId, responsable } },
        clase.instantanea().incisoFiscal,
      );
      await repositorio.agregar(activo);
      return consultas.obtener(activo.id.valor);
    });
  }

  private async comprobar(operador: Operador, solicitud: SolicitudDeActivo) {
    const clase = await claseParaActivo(this.dependencias, solicitud.claseId);
    const fecha = solicitud.fechaDeAdquisicion;
    await validarFechaDeAdquisicion(this.dependencias, { operador, fecha });
    await validarPadre(this.dependencias, { padreId: solicitud.activoPadreId, activoId: null });
    await validarUbicacion(this.dependencias, solicitud);
    return clase;
  }
}
