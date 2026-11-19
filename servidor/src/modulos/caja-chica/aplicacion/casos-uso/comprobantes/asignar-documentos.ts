import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ResultadoDeAsignarDto } from '../../dto/comprobantes.dto.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import type { PermisosDeExcepcion } from './asignador-de-comprobantes.js';
import { AsignadorDeDocumentos, type DocumentoPorAsignar } from './asignador-de-documentos.js';
import { comprobanteDto } from './armado-del-comprobante.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';

export type { DocumentoPorAsignar } from './asignador-de-documentos.js';

export interface PeticionDeAsignarDocumentos {
  fondoId: string;
  documentos: DocumentoPorAsignar[];
  /** Los permisos de excepción de quien asigna: los pone el controlador con los de la sesión. */
  permisos: PermisosDeExcepcion;
}

/**
 * Asigna documentos de la bandeja a un fondo abierto y visible (`comprobantes.crear`, 1 a 100 a la vez, todo o nada;
 * §5.4 b y g). El tope y la retención piden su permiso de excepción y un motivo; quien asigna queda como quien autorizó. Las
 * notas de crédito van después de las facturas de la misma tanda. Publica `comprobante_asignado` por cada uno.
 */
export class AsignarDocumentos {
  private readonly asignador: AsignadorDeDocumentos;
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: DependenciasDeComprobantes) {
    this.asignador = new AsignadorDeDocumentos(dependencias);
    this.lector = new LectorDelFondo({ fondos: dependencias.fondos, consultas: dependencias.consultasDeFondos });
  }

  /**
   * @throws RecursoNoEncontrado, ComprobanteYaAsignado, DocumentoNoEstaEnLaBandeja y lo que rechace `AsignadorDeComprobantes`
   * (en el primer documento que falle: no se asigna ninguno).
   */
  async ejecutar(operador: Operador, pedido: PeticionDeAsignarDocumentos): Promise<ResultadoDeAsignarDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.asignar(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async asignar(operador: Operador, pedido: PeticionDeAsignarDocumentos) {
    const fondo = await this.lector.bloquear(pedido.fondoId);
    const cargados = await this.asignador.cargar(pedido.documentos);
    const { comprobantes, avisos, eventos } = await this.asignador.asignar(operador, {
      cargados,
      fondo,
      permisos: pedido.permisos,
    });
    return { dto: { comprobantes: comprobantes.map(comprobanteDto), avisos }, eventos };
  }
}
