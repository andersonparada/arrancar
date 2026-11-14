import { Readable } from 'node:stream';
import type {
  DocumentoAbierto,
  DocumentoGuardado,
  DocumentoRevisado,
  DocumentosProtegidos,
} from '../../core/compartido/aplicacion/documentos-protegidos.js';
import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { EstadoDeCuentaDto } from '../aplicacion/dto/conciliacion.dto.js';
import type { PoliticaDeEstadoDeCuenta } from '../aplicacion/puertos/politica-de-estado-de-cuenta.js';

/** Lo que `revisar` devuelve en las pruebas: el contenido con el nombre con el que llegó. */
interface Revisado {
  contenido: Buffer;
  nombre: string | null;
}

interface Guardado extends Revisado {
  id: string;
  recursoDueno: string;
}

/**
 * Documentos en memoria: `revisar` cuenta las revisiones (para saber si «qpdf corrió») y puede fallar con el error
 * que se programe; `guardarRevisado` y `eliminar` aplican de una vez, como si la transacción se confirmara.
 */
export class DocumentosEnMemoria implements DocumentosProtegidos {
  readonly guardados = new Map<string, Guardado>();
  /** Cuántas veces se revisó contenido: el equivalente de las veces que corrió qpdf. */
  revisiones = 0;
  /** Si se indica, `revisar` lo lanza. */
  errorAlRevisar: Error | null = null;

  async revisar(_operador: Operador, contenido: Buffer, nombre: string | null): Promise<DocumentoRevisado> {
    this.revisiones += 1;
    if (this.errorAlRevisar) throw this.errorAlRevisar;
    return { contenido, nombre } as unknown as DocumentoRevisado;
  }

  async guardarRevisado(
    _operador: Operador,
    documento: DocumentoRevisado,
    opciones: { recursoDueno: string },
  ): Promise<DocumentoGuardado> {
    const { contenido, nombre } = documento as unknown as Revisado;
    const id = crypto.randomUUID();
    this.guardados.set(id, { id, contenido, nombre, recursoDueno: opciones.recursoDueno });
    return { id, tipoMime: 'application/pdf', sha256: `huella-${id}`, tamanoBytes: contenido.length, paginas: 1 };
  }

  guardar(): Promise<DocumentoGuardado> {
    throw new Error('Bancos solo guarda documentos ya revisados.');
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

  /** Lo que mostraría el DTO de la conciliación para ese archivo. */
  datosDelEstadoDeCuenta(archivoId: string | null): EstadoDeCuentaDto | null {
    const archivo = archivoId ? this.guardados.get(archivoId) : undefined;
    if (!archivo) return null;
    return {
      tipoMime: 'application/pdf',
      tamanoBytes: archivo.contenido.length,
      paginas: 1,
      sha256: `huella-${archivo.id}`,
      nombreOriginal: archivo.nombre,
      subidoEn: new Date(0).toISOString(),
      subidoPorNombre: null,
    };
  }
}

/** La variable de la empresa fija en la prueba. */
export class PoliticaDeEstadoDeCuentaFija implements PoliticaDeEstadoDeCuenta {
  constructor(public exige: boolean) {}

  async exigeEstadoDeCuenta(): Promise<boolean> {
    return this.exige;
  }
}
