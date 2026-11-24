import { Readable } from 'node:stream';
import type {
  DocumentoAbierto,
  DocumentoGuardado,
  DocumentoRevisado,
  DocumentosProtegidos,
} from '../../core/compartido/aplicacion/documentos-protegidos.js';
import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { RepositorioBoletasFirmadas } from '../aplicacion/puertos/repositorio-boletas-firmadas.js';
import type { TrasladosEnMemoria } from './dobles-de-traslados.js';

interface Guardado {
  contenido: Buffer;
  recursoDueno: string;
}

/**
 * Documentos en memoria: `revisar` cuenta las revisiones (las veces que correría qpdf) y puede fallar con el error que
 * se programe; guardar y eliminar aplican de una vez, como si la transacción se confirmara.
 */
export class DocumentosDePrueba implements DocumentosProtegidos {
  readonly guardados = new Map<string, Guardado>();
  revisiones = 0;
  errorAlRevisar: Error | null = null;

  async revisar(_operador: Operador, contenido: Buffer): Promise<DocumentoRevisado> {
    this.revisiones += 1;
    if (this.errorAlRevisar) throw this.errorAlRevisar;
    return contenido as unknown as DocumentoRevisado;
  }

  async guardarRevisado(
    _operador: Operador,
    documento: DocumentoRevisado,
    opciones: { recursoDueno: string },
  ): Promise<DocumentoGuardado> {
    const contenido = documento as unknown as Buffer;
    const id = crypto.randomUUID();
    this.guardados.set(id, { contenido, recursoDueno: opciones.recursoDueno });
    return { id, tipoMime: 'application/pdf', sha256: `huella-${id}`, tamanoBytes: contenido.length, paginas: 1 };
  }

  guardar(): Promise<DocumentoGuardado> {
    throw new Error('Activos fijos solo guarda documentos ya revisados.');
  }

  async abrir(archivoId: string, recursoDueno: string): Promise<DocumentoAbierto> {
    const archivo = this.guardados.get(archivoId);
    if (archivo?.recursoDueno !== recursoDueno) throw new RecursoNoEncontrado('El archivo');
    return {
      tipoMime: 'application/pdf',
      tamanoBytes: archivo.contenido.length,
      sha256: `huella-${archivoId}`,
      creadoEn: new Date(),
      contenido: Readable.from(archivo.contenido),
    };
  }

  async eliminar(archivoId: string, recursoDueno: string): Promise<void> {
    if (this.guardados.get(archivoId)?.recursoDueno !== recursoDueno) throw new RecursoNoEncontrado('El archivo');
    this.guardados.delete(archivoId);
  }
}

/** Una fila por boleta; al poner un archivo deja los datos que mostraría la boleta en los traslados en memoria. */
export class BoletasFirmadasEnMemoria implements RepositorioBoletasFirmadas {
  readonly archivos = new Map<string, string>();

  constructor(private readonly traslados: TrasladosEnMemoria) {}

  async bloquear(): Promise<void> {}

  async archivoDe(grupoId: string): Promise<string | null> {
    return this.archivos.get(grupoId) ?? null;
  }

  async poner(grupoId: string, archivoId: string): Promise<void> {
    this.archivos.set(grupoId, archivoId);
    this.traslados.firmadas.set(grupoId, {
      tipoMime: 'application/pdf',
      tamanoBytes: 1,
      paginas: 1,
      sha256: `huella-${archivoId}`,
      nombreOriginal: null,
      subidoEn: new Date().toISOString(),
      subidoPorNombre: null,
    });
  }
}
