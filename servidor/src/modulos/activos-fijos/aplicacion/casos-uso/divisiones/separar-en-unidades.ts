import type { Activo } from '../../../dominio/activo.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  CodigosDeUnidadesRepetidos,
  DemasiadasUnidades,
  type RenglonRepetido,
} from '../../../dominio/errores-de-costo.js';
import { DivisionInvalida } from '../../../dominio/errores-de-division.js';
import { MAXIMO_DE_UNIDADES } from '../../../dominio/tipos-de-costo.js';
import type { ActivoDividido } from '../../../dominio/eventos.js';
import type { DivisionDto, SolicitudDeSepararEnUnidades } from '../../dto/division.dto.js';
import { proponerCodigos } from '../activos/proponer-codigo.js';
import { activoParaDividir } from './dividir-activo.js';
import { RECURSO_DE_DIVISIONES, type DependenciasDeDivisiones } from './dependencias-de-divisiones.js';
import { DivisorDeActivos } from './divisor-de-activos.js';

interface SeparacionPedida {
  activoId: string;
  solicitud: SolicitudDeSepararEnUnidades;
}

/**
 * Los códigos de los activos nuevos: los escritos (recortados, sin repetirse ni usarlos otro activo) y, donde faltan, los
 * propuestos por el correlativo en un solo bloque.
 */
async function codigosDeLasUnidades(
  dependencias: DependenciasDeDivisiones,
  operador: Operador,
  { cantidad, escritos }: { cantidad: number; escritos: readonly string[] },
): Promise<string[]> {
  const dados = escritos.slice(0, cantidad).map((codigo) => codigo.trim());
  const usados = await dependencias.repositorio.codigosUsados(dados.filter(Boolean));
  const vistos = new Set<string>();
  const problemas: RenglonRepetido[] = [];
  dados.forEach((codigo, renglon) => {
    const clave = codigo.toUpperCase();
    if (!codigo) return;
    if (vistos.has(clave)) problemas.push({ asignacion: 0, renglon, codigo, causa: 'repetido_en_la_cuadricula' });
    else if (usados.has(clave)) problemas.push({ asignacion: 0, renglon, codigo, causa: 'ya_usado_por_otro_activo' });
    vistos.add(clave);
  });
  if (problemas.length > 0) throw new CodigosDeUnidadesRepetidos(problemas);
  const faltan = Array.from({ length: cantidad }, (_, renglon) => renglon).filter((renglon) => !dados[renglon]);
  const propuestos = await proponerCodigos(dependencias, operador, { cantidad: faltan.length, reservados: vistos });
  faltan.forEach((renglon, posicion) => (dados[renglon] = propuestos[posicion]!));
  return Array.from({ length: cantidad }, (_, renglon) => dados[renglon]!);
}

export class SepararEnUnidades {
  constructor(private readonly dependencias: DependenciasDeDivisiones) {}

  /**
   * Separa un activo de N piezas en N activos de una (`divisiones.crear`, §6.11): `N − 1` divisiones de 1 en una sola
   * transacción, con tope de 200 unidades. Cada una deja su auditoría y publica `activo_dividido` al confirmar.
   * @throws RecursoNoEncontrado si el activo no existe.
   * @throws DivisionInvalida si el activo ya es de una sola pieza.
   * @throws DemasiadasUnidades si pasa de 200 piezas.
   * @throws CodigosDeUnidadesRepetidos si un código escrito se repite o ya existe.
   * @throws DivisionNoPermitida, DivisionInvalida, MesCerrado, DivisionConMovimientosPosteriores como al dividir.
   */
  async ejecutar(operador: Operador, pedido: SeparacionPedida): Promise<DivisionDto[]> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dtos, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.separar(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dtos;
  }

  private async separar(operador: Operador, { activoId, solicitud }: SeparacionPedida) {
    const origen = await activoParaDividir(this.dependencias, activoId);
    const piezas = origen.instantanea().cantidad;
    if (piezas < 2) throw new DivisionInvalida('El activo tiene una sola pieza: no hay nada que separar.');
    if (piezas > MAXIMO_DE_UNIDADES) throw new DemasiadasUnidades();
    const anterior = await this.dependencias.consultas.obtener(activoId);
    const codigos = await codigosDeLasUnidades(this.dependencias, operador, {
      cantidad: piezas - 1,
      escritos: solicitud.codigos,
    });
    const dtos: DivisionDto[] = [];
    const eventos: ActivoDividido[] = [];
    for (const codigo of codigos) {
      const hecha = await this.dividirUna(operador, { origen, codigo, solicitud, anterior });
      dtos.push(await this.dependencias.consultasDeDivisiones.obtener(hecha.division.id.valor));
      eventos.push(hecha.evento);
    }
    return { dtos, eventos };
  }

  /** Una división de una pieza con su auditoría (el activo de origen como estaba antes de separar). */
  private async dividirUna(
    operador: Operador,
    {
      origen,
      codigo,
      solicitud,
      anterior,
    }: { origen: Activo; codigo: string; solicitud: SolicitudDeSepararEnUnidades; anterior: unknown },
  ) {
    const { fecha, motivo } = solicitud;
    const base = { origen, cantidad: 1, fecha, motivo, causa: 'separar_en_unidades', codigo } as const;
    const hecha = await new DivisorDeActivos(this.dependencias).dividir(operador, base);
    const registroId = hecha.division.id.valor;
    await this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_DIVISIONES,
      registroId,
      accion: 'ajustar',
      anterior,
      motivo,
    });
    return hecha;
  }
}
