import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Activo } from '../../../dominio/activo.js';
import type { DivisionDto, SolicitudDeDivision } from '../../dto/division.dto.js';
import { proponerCodigo } from '../activos/proponer-codigo.js';
import { RECURSO_DE_DIVISIONES, type DependenciasDeDivisiones } from './dependencias-de-divisiones.js';
import { DivisorDeActivos } from './divisor-de-activos.js';

interface DivisionPedida {
  activoId: string;
  solicitud: SolicitudDeDivision;
}

/** Bloquea el activo (con el candado compartido del cierre ya tomado por quien llama). */
export async function activoParaDividir(dependencias: DependenciasDeDivisiones, activoId: string): Promise<Activo> {
  await dependencias.cierres.bloquear('compartido');
  const [activo] = await dependencias.repositorio.buscarBloqueando([activoId]);
  if (!activo) throw new RecursoNoEncontrado('El activo');
  return activo;
}

export class DividirActivo {
  constructor(private readonly dependencias: DependenciasDeDivisiones) {}

  /**
   * Divide a mano un activo con cantidad (`divisiones.crear`, §6.11): separa `cantidad` unidades en un activo nuevo con
   * su parte del costo, la depreciación acumulada y el residual, y abre tramos nuevos en los dos libros desde el mes de la
   * división. Deja en la auditoría el activo de origen como estaba y, al confirmar, publica `activo_dividido`.
   * @throws RecursoNoEncontrado si el activo no existe.
   * @throws DivisionNoPermitida, CantidadASepararInvalida, DivisionInvalida, MesCerrado, DivisionConMovimientosPosteriores.
   * @throws RecursoDuplicado si el código escrito ya existe.
   */
  async ejecutar(operador: Operador, pedido: DivisionPedida): Promise<DivisionDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, evento } = await unidadDeTrabajo.ejecutar(operador, () => this.dividir(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async dividir(operador: Operador, { activoId, solicitud }: DivisionPedida) {
    const { consultas, consultasDeDivisiones, auditoria } = this.dependencias;
    const origen = await activoParaDividir(this.dependencias, activoId);
    const anterior = await consultas.obtener(activoId);
    const codigo = solicitud.codigo?.trim() || (await proponerCodigo(this.dependencias, operador));
    const { cantidad, fecha, motivo } = solicitud;
    const hecha = await new DivisorDeActivos(this.dependencias).dividir(operador, {
      origen,
      cantidad,
      fecha,
      motivo,
      causa: 'manual',
      codigo,
    });
    const id = hecha.division.id.valor;
    await auditoria.registrar({ recurso: RECURSO_DE_DIVISIONES, registroId: id, accion: 'ajustar', anterior, motivo });
    return { dto: await consultasDeDivisiones.obtener(id), evento: hecha.evento };
  }
}
