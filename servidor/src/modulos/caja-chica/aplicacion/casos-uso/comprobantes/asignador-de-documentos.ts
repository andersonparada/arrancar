import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { etiquetaDelComprobante, type Comprobante } from '../../../dominio/comprobantes.js';
import { ComprobanteYaAsignado, DocumentoNoEstaEnLaBandeja } from '../../../dominio/errores-de-comprobantes.js';
import type { Fondo } from '../../../dominio/fondos.js';
import {
  AsignadorDeComprobantes,
  type PedidoDeAsignacion,
  type PermisosDeExcepcion,
} from './asignador-de-comprobantes.js';
import type { DependenciasDeComprobantes } from './dependencias-de-comprobantes.js';

/** Un documento de la bandeja que se asigna, con lo que el usuario escribió para él. */
export interface DocumentoPorAsignar {
  comprobanteId: string;
  fecha?: string | null;
  motivoSobreElTope?: string | null;
  motivoConRetencion?: string | null;
}

/** Un documento ya bloqueado y comprobado en la bandeja, con lo que se escribió para él. */
export interface DocumentoCargado {
  documento: DocumentoPorAsignar;
  comprobante: Comprobante;
}

type Dependencias = ConstructorParameters<typeof AsignadorDeComprobantes>[0] &
  Pick<DependenciasDeComprobantes, 'comprobantes'>;

/**
 * Asigna una tanda de documentos de la bandeja a un fondo ya bloqueado: todo o nada, con las notas de crédito después de
 * las facturas de la misma tanda. La usan `AsignarDocumentos` y la liquidación de un vale provisional.
 */
export class AsignadorDeDocumentos {
  private readonly asignador: AsignadorDeComprobantes;

  constructor(private readonly dependencias: Dependencias) {
    this.asignador = new AsignadorDeComprobantes(dependencias);
  }

  /** Los documentos bloqueados y en la bandeja; las notas de crédito al final, para que su factura entre primero. */
  async cargar(documentos: readonly DocumentoPorAsignar[]): Promise<DocumentoCargado[]> {
    const cargados: DocumentoCargado[] = [];
    for (const documento of documentos) {
      const comprobante = await this.dependencias.comprobantes.bloquear(documento.comprobanteId);
      if (!comprobante) throw new RecursoNoEncontrado('El documento');
      if (comprobante.fondoId !== null) throw new ComprobanteYaAsignado(etiquetaDelComprobante(comprobante));
      if (comprobante.clase !== 'documento' || comprobante.estado !== 'vigente') throw new DocumentoNoEstaEnLaBandeja();
      cargados.push({ documento, comprobante });
    }
    return cargados.sort((a, b) => Number(a.comprobante.esNotaDeCredito) - Number(b.comprobante.esNotaDeCredito));
  }

  /** Asigna uno por uno; el primero que falle deshace la transacción. */
  async asignar(
    operador: Operador,
    por: {
      cargados: readonly DocumentoCargado[];
      fondo: Fondo;
      permisos: PermisosDeExcepcion;
      valeProvisionalId?: string | null;
    },
  ): Promise<{ comprobantes: Comprobante[]; avisos: string[]; eventos: EventoDominio[] }> {
    const resultado = { comprobantes: [] as Comprobante[], avisos: [] as string[], eventos: [] as EventoDominio[] };
    for (const cargado of por.cargados) {
      const asignado = await this.asignador.asignar(operador, pedidoDe(cargado, por));
      resultado.comprobantes.push(asignado.comprobante);
      resultado.avisos.push(...asignado.avisos);
      resultado.eventos.push(asignado.evento);
    }
    return resultado;
  }
}

/** El pedido del asignador para un documento: lo escrito para él más lo común de la tanda. */
function pedidoDe(
  { documento, comprobante }: DocumentoCargado,
  {
    fondo,
    permisos,
    valeProvisionalId,
  }: { fondo: Fondo; permisos: PermisosDeExcepcion; valeProvisionalId?: string | null },
): PedidoDeAsignacion {
  const { fecha, motivoSobreElTope, motivoConRetencion } = documento;
  return { comprobante, fondo, fecha, motivoSobreElTope, motivoConRetencion, permisos, valeProvisionalId };
}
