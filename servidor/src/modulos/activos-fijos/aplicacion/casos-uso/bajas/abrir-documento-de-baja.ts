import type { Readable } from 'node:stream';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import type { BajaId } from '../../../dominio/baja.js';
import { DocumentoDeBajaInexistente } from '../../errores-de-documentos-de-baja.js';
import { RECURSO_DE_BAJAS, type DependenciasDeBajas } from './dependencias-de-bajas.js';

/** El archivo listo para servirse, con un nombre armado por el servidor (nunca el que trajo el usuario). */
export interface DocumentoDeBajaAbierto {
  nombre: string;
  tipoMime: string;
  tamanoBytes: number;
  contenido: Readable;
}

const EXTENSIONES: Record<string, string> = { 'application/pdf': 'pdf', 'image/webp': 'webp' };

/** Abre el acta o la denuncia de una baja (también anulada; la de un componente es la del acto de su principal); solo se llega a ellos por aquí, con el permiso de ver. */
export class AbridorDeDocumentosDeBaja {
  constructor(private readonly dependencias: DependenciasDeBajas) {}

  /** @throws RecursoNoEncontrado si la baja no existe; DocumentoDeBajaInexistente si todavía no tiene ese documento. */
  abrir(
    operador: Operador,
    pedido: { bajaId: string; documento: 'acta' | 'denuncia' },
  ): Promise<DocumentoDeBajaAbierto> {
    const { unidadDeTrabajo, bajas, documentos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const pedida = await bajas.buscar(Identificador.desde(pedido.bajaId) as BajaId);
      if (!pedida) throw new RecursoNoEncontrado('La baja');
      const { acta, denunciaArchivoId } = (await bajas.portadoraDeDocumentos(pedida)).instantanea();
      const archivoId = pedido.documento === 'acta' ? (acta?.archivoId ?? null) : denunciaArchivoId;
      if (archivoId === null) throw new DocumentoDeBajaInexistente(pedido.documento);
      const { tipoMime, tamanoBytes, contenido } = await documentos.abrir(archivoId, RECURSO_DE_BAJAS);
      const nombre = `${pedido.documento}-de-baja.${EXTENSIONES[tipoMime] ?? 'bin'}`;
      return { nombre, tipoMime, tamanoBytes, contenido };
    });
  }
}
