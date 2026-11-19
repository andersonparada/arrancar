import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { etiquetaDelComprobante, type Comprobante } from '../../../dominio/comprobantes.js';
import { ComprobanteYaAsignado, DocumentoNoEstaEnLaBandeja } from '../../../dominio/errores-de-comprobantes.js';
import type { ResultadoDeAsignarDto } from '../../dto/comprobantes.dto.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import { AsignadorDeComprobantes, type PermisosDeExcepcion } from './asignador-de-comprobantes.js';
import { comprobanteDto } from './armado-del-comprobante.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';

/** Un documento de la bandeja que se asigna, con lo que el usuario escribió para él. */
export interface DocumentoPorAsignar {
  comprobanteId: string;
  fecha?: string | null;
  motivoSobreElTope?: string | null;
  motivoConRetencion?: string | null;
}

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
  private readonly asignador: AsignadorDeComprobantes;
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: DependenciasDeComprobantes) {
    this.asignador = new AsignadorDeComprobantes(dependencias);
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
    const comprobantes: Comprobante[] = [];
    const avisos: string[] = [];
    const eventos: EventoDominio[] = [];
    for (const { documento, comprobante } of await this.cargar(pedido.documentos)) {
      const { fecha, motivoSobreElTope, motivoConRetencion } = documento;
      const resultado = await this.asignador.asignar(operador, {
        comprobante,
        fondo,
        fecha,
        motivoSobreElTope,
        motivoConRetencion,
        permisos: pedido.permisos,
      });
      comprobantes.push(resultado.comprobante);
      avisos.push(...resultado.avisos);
      eventos.push(resultado.evento);
    }
    return { dto: { comprobantes: comprobantes.map(comprobanteDto), avisos }, eventos };
  }

  /** Los documentos bloqueados y en la bandeja; las notas de crédito al final, para que su factura entre primero. */
  private async cargar(documentos: readonly DocumentoPorAsignar[]) {
    const cargados = [];
    for (const documento of documentos) {
      const comprobante = await this.dependencias.comprobantes.bloquear(documento.comprobanteId);
      if (!comprobante) throw new RecursoNoEncontrado('El documento');
      if (comprobante.fondoId !== null) throw new ComprobanteYaAsignado(etiquetaDelComprobante(comprobante));
      if (comprobante.clase !== 'documento' || comprobante.estado !== 'vigente') throw new DocumentoNoEstaEnLaBandeja();
      cargados.push({ documento, comprobante });
    }
    return cargados.sort((a, b) => Number(a.comprobante.esNotaDeCredito) - Number(b.comprobante.esNotaDeCredito));
  }
}
