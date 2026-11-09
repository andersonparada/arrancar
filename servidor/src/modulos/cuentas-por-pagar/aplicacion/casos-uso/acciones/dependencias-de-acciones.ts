import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { PublicadorEventos } from '../../../../core/compartido/aplicacion/publicador-eventos.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { DocumentoConAplicaciones } from '../../../dominio/documento-por-pagar.js';
import type { DocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import { dtoDeDocumentoPorPagar } from '../../dto/dto-de-documento-por-pagar.js';
import type {
  DocumentosDeCompra,
  RepositorioDeAplicaciones,
  RepositorioDeDocumentos,
} from '../../puertos/puertos-de-documentos.js';
import type { LibroDeCompras } from '../../puertos/puertos-de-libro-de-compras.js';
import type { DocumentoPorPagar } from '../../../dominio/documento-por-pagar.js';
import type { ConsultasDeDocumentos, FilaDeDocumento } from '../../puertos/puertos-de-consultas.js';

/** Lo que necesitan los casos de uso que cambian el estado de un documento. */
export interface DependenciasDeAcciones {
  unidadDeTrabajo: UnidadDeTrabajo;
  documentos: RepositorioDeDocumentos;
  consultas: ConsultasDeDocumentos;
  reloj: Reloj;
}

/** Lo que además necesitan autorizar y desautorizar: las órdenes a Libro de compras, la auditoría y los eventos. */
export interface DependenciasDeAutorizacion extends DependenciasDeAcciones {
  auditoria: Auditoria;
  libroDeCompras: LibroDeCompras;
  /** Se publica después de confirmar la transacción de la propia petición. */
  publicadorEventos: PublicadorEventos;
}

/** Lo que además necesitan anular y eliminar desde aquí. */
export interface DependenciasDeBajas extends DependenciasDeAutorizacion {
  aplicaciones: RepositorioDeAplicaciones;
  documentosDeCompra: DocumentosDeCompra;
}

/** Cómo se nombra un documento ante el usuario: `serie-número`, o solo el número si no tiene serie. */
export function etiquetaDe({ serie, numero }: Pick<DocumentoPorPagar, 'serie' | 'numero'>): string {
  return serie ? `${serie}-${numero}` : numero;
}

/**
 * La fila con sus datos de origen (sin bloquear), para nombrar el documento y para las órdenes a Libro de compras que
 * van antes de bloquear la fila de aquí.
 * @throws RecursoNoEncontrado si no existe o es de otra empresa.
 */
export async function filaDe(consultas: ConsultasDeDocumentos, id: string): Promise<FilaDeDocumento> {
  const fila = await consultas.buscar(id);
  if (!fila) throw new RecursoNoEncontrado('El documento');
  return fila;
}

/** La fila bloqueada para este caso de uso. @throws RecursoNoEncontrado si no existe. */
export async function bloquear(documentos: RepositorioDeDocumentos, id: string): Promise<DocumentoConAplicaciones> {
  const guardado = await documentos.buscarPorId(id, true);
  if (!guardado) throw new RecursoNoEncontrado('El documento');
  return guardado;
}

/** Los documentos como los ve la pantalla después del cambio, en el orden de los ids. */
export async function dtosDe(
  { consultas, reloj }: DependenciasDeAcciones,
  operador: Operador,
  ids: readonly string[],
): Promise<DocumentoPorPagarDto[]> {
  const vista = { usuarioId: operador.usuarioId, hoy: await reloj.hoy(operador) };
  const dtos: DocumentoPorPagarDto[] = [];
  for (const id of ids) dtos.push(dtoDeDocumentoPorPagar(await filaDe(consultas, id), vista));
  return dtos;
}
