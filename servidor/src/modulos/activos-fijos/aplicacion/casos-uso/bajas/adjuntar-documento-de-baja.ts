import type { DocumentoRevisado } from '../../../../core/compartido/aplicacion/documentos-protegidos.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { Baja, BajaId } from '../../../dominio/baja.js';
import { BajaAnulada } from '../../../dominio/errores-de-baja.js';
import type { BajaDto } from '../../dto/baja.dto.js';
import { RECURSO_DE_BAJAS, type DependenciasDeBajas } from './dependencias-de-bajas.js';

/** El archivo que se sube: lo que mandó el navegador (aún sin revisar) y el nombre con que lo mandó. */
export interface PedidoDeDocumentoDeBaja {
  bajaId: string;
  contenido: Buffer;
  nombre: string | null;
}

/** Cómo se guarda un documento en la baja: cuál es el actual y cómo se pone el nuevo. */
export interface DestinoDelDocumento {
  documento: 'acta' | 'denuncia';
  actual(baja: Baja): { archivoId: string; tipoDeActa: string | null } | null;
  poner(baja: Baja, archivoId: string): void;
}

/**
 * Guarda o reemplaza el acta o la denuncia de una baja (PDF o foto); el acta y la denuncia son de todo el acto, así que
 * las de un componente que se dio de baja con su principal se guardan en la baja del principal. Va en tres tiempos para no retener una conexión
 * mientras qpdf revisa el PDF: (a) una unidad corta que falla rápido, (b) la revisión fuera de toda transacción y (c) la
 * unidad que bloquea la baja y guarda. Si ya había un archivo, se borra y la auditoría `adjuntar` lo deja como estaba.
 */
export class AdjuntadorDeDocumentos {
  constructor(private readonly dependencias: DependenciasDeBajas) {}

  /**
   * @throws RecursoNoEncontrado si la baja no existe; BajaAnulada si está anulada (qpdf ni se llama).
   * @throws RevisionDePdfSaturada (429), o un error de PDF o de foto (400), si no se acepta el archivo.
   */
  async adjuntar(operador: Operador, pedido: PedidoDeDocumentoDeBaja, destino: DestinoDelDocumento): Promise<BajaDto> {
    const { unidadDeTrabajo, documentos } = this.dependencias;
    await unidadDeTrabajo.ejecutar(operador, () => this.cargarVigente(pedido.bajaId, false));
    const revisado = await documentos.revisar(operador, pedido.contenido, pedido.nombre);
    return unidadDeTrabajo.ejecutar(operador, () => this.guardar(operador, { pedido, revisado }, destino));
  }

  private async guardar(
    operador: Operador,
    { pedido, revisado }: { pedido: PedidoDeDocumentoDeBaja; revisado: DocumentoRevisado },
    destino: DestinoDelDocumento,
  ): Promise<BajaDto> {
    const { documentos, bajas, auditoria, consultasDeBajas } = this.dependencias;
    const baja = await this.cargarVigente(pedido.bajaId, true);
    const anterior = destino.actual(baja);
    const registroId = baja.id.valor;
    const guardado = await documentos.guardarRevisado(operador, revisado, { recursoDueno: RECURSO_DE_BAJAS });
    destino.poner(baja, guardado.id);
    await bajas.guardar(baja);
    if (anterior) await documentos.eliminar(anterior.archivoId, RECURSO_DE_BAJAS);
    const habiaArchivo = anterior !== null;
    await auditoria.registrar({
      recurso: RECURSO_DE_BAJAS,
      registroId,
      accion: 'adjuntar',
      anterior: { documento: destino.documento, habiaArchivo, tipoDeActa: anterior?.tipoDeActa ?? null },
    });
    return consultasDeBajas.obtener(pedido.bajaId);
  }

  /** En la etapa final la baja se lee con `FOR UPDATE`: así una anulación en curso no se cruza con el guardado. */
  private async cargarVigente(bajaId: string, bloqueando: boolean): Promise<Baja> {
    const { bajas } = this.dependencias;
    const id = Identificador.desde(bajaId) as BajaId;
    const pedida = await bajas.buscar(id);
    if (!pedida) throw new RecursoNoEncontrado('La baja');
    if (pedida.instantanea().estado === 'anulada') throw new BajaAnulada();
    const portadora = await bajas.portadoraDeDocumentos(pedida);
    if (!bloqueando) return portadora;
    const bloqueada = await bajas.buscarBloqueando(portadora.id);
    if (bloqueada?.instantanea().estado !== 'vigente') throw new BajaAnulada();
    return bloqueada;
  }
}
