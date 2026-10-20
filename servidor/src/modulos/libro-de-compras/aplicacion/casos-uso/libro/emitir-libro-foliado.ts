import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { DocumentosProtegidos } from '../../../../core/compartido/aplicacion/documentos-protegidos.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { dtoDeEmision, type EmisionDelLibroDto } from '../../dto/emision-del-libro.dto.js';
import { dtoDelLibro } from '../../dto/libro.dto.js';
import { EmisionSinCambios, MotivoDeEmisionObligatorio } from '../../errores-de-emision.js';
import type { RepositorioDeEmisiones, RepositorioDeFoliacion } from '../../puertos/emisiones-del-libro.js';
import type { DatosDelPdfDelLibro, GeneradorDePdfDelLibro } from '../../puertos/generador-de-pdf-del-libro.js';
import { armarLibro, periodoDelLibro, type DependenciasParaArmarElLibro, type LibroArmado } from './consultar-libro.js';
import { huellaDelLibro, libroParaImprimir, VERSION_DE_PLANTILLA } from './libro-para-imprimir.js';

/** Recurso dueño del PDF guardado: solo se sirve desde la ruta de este módulo. */
export const RECURSO_DE_EMISIONES = 'libro-de-compras.emisiones-del-libro';

export interface Dependencias extends DependenciasParaArmarElLibro {
  unidadDeTrabajo: UnidadDeTrabajo;
  emisiones: RepositorioDeEmisiones;
  foliacion: RepositorioDeFoliacion;
  generador: GeneradorDePdfDelLibro;
  documentos: DocumentosProtegidos;
  auditoria: Auditoria;
}

export interface SolicitudDeEmision {
  periodo: string;
  motivo?: string | undefined;
}

/**
 * Emite el libro del período con folios: calcula cuántas hojas gasta, consume los folios en la misma transacción,
 * dibuja el PDF y lo guarda. Dos emisiones de la misma empresa se ordenan por el bloqueo del último folio.
 */
export class EmitirLibroFoliado {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, solicitud: SolicitudDeEmision): Promise<EmisionDelLibroDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const ultimoFolio = await this.dependencias.foliacion.bloquear(operador.empresaId);
      const armado = await armarLibro(this.dependencias, operador, periodoDelLibro(solicitud.periodo));
      return this.emitir({ operador, armado, ultimoFolio, motivo: solicitud.motivo ?? null });
    });
  }

  private async emitir(contexto: ContextoDeEmision): Promise<EmisionDelLibroDto> {
    const { operador, armado, ultimoFolio, motivo } = contexto;
    const datos = libroParaImprimir(armado, ultimoFolio + 1);
    const huella = huellaDelLibro(armado.libro.filas);
    await this.validarQueSeaNueva(armado.periodo, huella, motivo);
    const folioHasta = ultimoFolio + datos.libro.hojas;
    const archivoId = await this.guardarElPdf(operador, datos, folioHasta);
    const emision = await this.dependencias.emisiones.agregar(operador.empresaId, {
      periodo: armado.periodo,
      tipoDeLibro: armado.libro.tipoDeLibro,
      folioDesde: ultimoFolio + 1,
      folioHasta,
      paginas: datos.libro.hojas,
      archivoId,
      huellaDeDatos: huella,
      versionDePlantilla: VERSION_DE_PLANTILLA,
      totales: dtoDelLibro(armado.libro, armado).resumen,
      motivo,
    });
    await this.dependencias.foliacion.fijarUltimoFolio(operador.empresaId, folioHasta);
    return dtoDeEmision(emision, false);
  }

  /** Dibuja el PDF y lo guarda revisado; las páginas que cuenta qpdf deben ser los folios que se gastan. */
  private async guardarElPdf(operador: Operador, datos: DatosDelPdfDelLibro, folioHasta: number): Promise<string> {
    const pdf = await this.dependencias.generador.generar(datos);
    const nombre = `libro-de-compras-${datos.periodo.slice(0, 7)}-folios-${folioHasta - datos.libro.hojas + 1}-${folioHasta}.pdf`;
    const archivo = await this.dependencias.documentos.guardar(operador, pdf, {
      nombre,
      recursoDueno: RECURSO_DE_EMISIONES,
    });
    if (archivo.paginas !== null && archivo.paginas !== datos.libro.hojas) {
      throw new Error(`El PDF tiene ${archivo.paginas} páginas y se esperaban ${datos.libro.hojas}.`);
    }
    return archivo.id;
  }

  /** Mismos datos y misma plantilla: se ofrece la copia. Otro período ya emitido pide el motivo. */
  private async validarQueSeaNueva(periodo: string, huella: string, motivo: string | null): Promise<void> {
    const { emisiones } = this.dependencias;
    const igual = await emisiones.buscarIgual(periodo, huella, VERSION_DE_PLANTILLA);
    if (igual) throw new EmisionSinCambios(igual.id);
    if (!motivo && (await emisiones.hayDelPeriodo(periodo))) throw new MotivoDeEmisionObligatorio();
  }
}

interface ContextoDeEmision {
  operador: Operador;
  armado: LibroArmado;
  ultimoFolio: number;
  motivo: string | null;
}
