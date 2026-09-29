import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Localidad } from '../../../dominio/localidad.js';
import { datosDeLocalidad, dtoDeLocalidad } from '../../datos-de-localidad.js';
import type { LocalidadDto, SolicitudDeLocalidad } from '../../dto/localidad.dto.js';
import type { DependenciasDeLocalidades } from './dependencias-de-localidades.js';

export class CrearLocalidad {
  constructor(private readonly dependencias: DependenciasDeLocalidades) {}

  /**
   * Quien la crea queda con acceso a ella (lo hace el disparador de la base de datos) y la asignación
   * queda en la auditoría. Al importar desde Excel no se asigna a nadie.
   * @throws LocalidadInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si el código, el nombre o el establecimiento SAT ya existen en la empresa.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeLocalidad): Promise<LocalidadDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const localidad = Localidad.crear(Identificador.desde(operador.empresaId), datosDeLocalidad(solicitud));
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await consultas.exigirReferencias(solicitud);
      await repositorio.agregar(localidad);
      // Sin asignar, quien importa no ve la localidad nueva: no se vuelve a leer.
      if (operador.sinAsignarAlCrear) return dtoDeLocalidad(localidad);
      await this.auditarAsignacionAlCreador(operador, localidad);
      return consultas.obtener(localidad.id.valor);
    });
  }

  private async auditarAsignacionAlCreador(operador: Operador, localidad: Localidad): Promise<void> {
    const { accesos, auditoria } = this.dependencias;
    const asignados = await accesos.usuariosConAcceso(localidad.id.valor);
    const creador = asignados.find(({ usuarioId }) => usuarioId === operador.usuarioId);
    if (!creador) return;
    const { codigo, nombre } = localidad.instantanea();
    await auditoria.registrar({
      recurso: 'empresas.accesos-a-localidades',
      registroId: localidad.id.valor,
      accion: 'asignar',
      anterior: { ...creador, localidadId: localidad.id.valor, codigo, nombre, aSiMismo: true },
    });
  }
}
