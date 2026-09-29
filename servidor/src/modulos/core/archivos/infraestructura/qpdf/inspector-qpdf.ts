import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Semaforo } from '../../../compartido/infraestructura/semaforo.js';
import type { InspectorDePdf, PdfInspeccionado } from '../../aplicacion/puertos/inspector-de-pdf.js';
import { buscarContenidoActivo } from '../../dominio/contenido-activo-de-pdf.js';
import {
  DocumentoNoAceptado,
  esPdfPorFirma,
  LIMITE_DE_PAGINAS_DE_PDF,
  PdfConContenidoActivo,
  PdfConContrasena,
  PdfDanado,
  PdfConDemasiadasPaginas,
  PdfNoSePudoRevisar,
} from '../../dominio/documento.js';
import type { EjecutorDeQpdf } from './ejecutor-de-qpdf.js';

/** Códigos de salida de `qpdf --requires-password`. */
const REQUIERE_CONTRASENA = 0;
const SOLO_DE_PROPIETARIO = 3;
/** Códigos de salida al reescribir: 3 es «funcionó con avisos». */
const ERROR_AL_REESCRIBIR = 2;

/**
 * Revisa los PDF con qpdf, de uno en uno: firma, contraseña, reescritura limpia (lo pegado al final
 * desaparece), contenido activo y número de páginas. Trabaja en una carpeta privada que siempre se borra.
 */
export class InspectorQpdf implements InspectorDePdf {
  constructor(
    private readonly ejecutor: EjecutorDeQpdf,
    private readonly semaforo = new Semaforo(1),
  ) {}

  inspeccionar(contenido: Buffer): Promise<PdfInspeccionado> {
    if (!esPdfPorFirma(contenido)) return Promise.reject(new DocumentoNoAceptado());
    return this.semaforo.ejecutar(() => this.enCarpetaPrivada((carpeta) => this.revisar(contenido, carpeta)));
  }

  private async enCarpetaPrivada<T>(trabajo: (carpeta: string) => Promise<T>): Promise<T> {
    const carpeta = await mkdtemp(join(tmpdir(), 'arrancar-pdf-'));
    try {
      return await trabajo(carpeta);
    } finally {
      await rm(carpeta, { recursive: true, force: true });
    }
  }

  private async revisar(contenido: Buffer, carpeta: string): Promise<PdfInspeccionado> {
    const entrada = join(carpeta, `${crypto.randomUUID()}.pdf`);
    const salida = join(carpeta, `${crypto.randomUUID()}.pdf`);
    await writeFile(entrada, contenido, { mode: 0o600 });
    const descifrar = await this.exigirSinContrasena(entrada);
    await this.reescribir({ entrada, salida, descifrar });
    const paginas = await this.contarPaginas(salida);
    await this.exigirSinContenidoActivo(salida);
    return { contenido: await readFile(salida), paginas };
  }

  /** @returns `true` si solo tiene restricciones de propietario y hay que quitarlas al reescribir. */
  private async exigirSinContrasena(entrada: string): Promise<boolean> {
    const { codigo } = await this.ejecutor.ejecutar(['--requires-password', entrada]);
    if (codigo === REQUIERE_CONTRASENA) throw new PdfConContrasena();
    return codigo === SOLO_DE_PROPIETARIO;
  }

  private async reescribir(archivos: { entrada: string; salida: string; descifrar: boolean }): Promise<void> {
    const opciones = archivos.descifrar ? ['--decrypt'] : [];
    const { codigo } = await this.ejecutor.ejecutar([...opciones, archivos.entrada, archivos.salida]);
    if (codigo === ERROR_AL_REESCRIBIR) throw new PdfDanado();
    if (codigo !== 0 && codigo !== 3) throw new PdfNoSePudoRevisar();
  }

  private async contarPaginas(archivo: string): Promise<number> {
    const { codigo, salida } = await this.ejecutor.ejecutar(['--show-npages', archivo]);
    const paginas = Number.parseInt(salida.trim(), 10);
    if (codigo !== 0 || !Number.isInteger(paginas)) throw new PdfDanado();
    if (paginas > LIMITE_DE_PAGINAS_DE_PDF) throw new PdfConDemasiadasPaginas(paginas);
    return paginas;
  }

  private async exigirSinContenidoActivo(archivo: string): Promise<void> {
    const argumentos = ['--json=2', '--json-key=qpdf', '--json-stream-data=none', archivo];
    const { codigo, salida } = await this.ejecutor.ejecutar(argumentos);
    if (codigo !== 0 && codigo !== 3) throw new PdfDanado();
    const hallazgos = buscarContenidoActivo(analizar(salida));
    if (hallazgos.length > 0) throw new PdfConContenidoActivo(hallazgos);
  }
}

function analizar(salida: string): unknown {
  try {
    return JSON.parse(salida);
  } catch {
    throw new PdfDanado();
  }
}
