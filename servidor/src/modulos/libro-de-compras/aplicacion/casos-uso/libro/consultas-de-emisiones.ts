import type {
  DocumentoAbierto,
  DocumentosProtegidos,
} from '../../../../core/compartido/aplicacion/documentos-protegidos.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { dtoDeEmision, type EmisionesDelLibroDto } from '../../dto/emision-del-libro.dto.js';
import { EmisionNoEncontrada } from '../../errores-de-emision.js';
import type { RepositorioDeEmisiones, RepositorioDeFoliacion } from '../../puertos/emisiones-del-libro.js';
import { periodoDelLibro } from './consultar-libro.js';
import { RECURSO_DE_EMISIONES } from './emitir-libro-foliado.js';
import type { GeneradorDePdfDelLibro } from '../../puertos/generador-de-pdf-del-libro.js';
import { armarLibro, type DependenciasParaArmarElLibro } from './consultar-libro.js';
import { libroParaImprimir } from './libro-para-imprimir.js';

interface DependenciasDeConsulta {
  unidadDeTrabajo: UnidadDeTrabajo;
  emisiones: RepositorioDeEmisiones;
  foliacion: RepositorioDeFoliacion;
}

/** Las emisiones con folios (de un período o de todos) y el último folio usado. */
export class ListarEmisionesDelLibro {
  constructor(private readonly dependencias: DependenciasDeConsulta) {}

  ejecutar(operador: Operador, periodo: string | null): Promise<EmisionesDelLibroDto> {
    const { unidadDeTrabajo, emisiones, foliacion } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const lista = await emisiones.listar(periodo ? periodoDelLibro(periodo) : null);
      const vistas = new Set<string>();
      // De la más nueva a la más vieja: la primera de cada período es la vigente; las demás, sustituidas.
      const dtos = lista.map((emision) => {
        const sustituida = vistas.has(emision.periodo);
        vistas.add(emision.periodo);
        return dtoDeEmision(emision, sustituida);
      });
      return { ultimoFolio: await foliacion.ultimoFolio(), emisiones: dtos };
    });
  }
}

export interface CopiaDeEmision extends DocumentoAbierto {
  nombre: string;
}

/** La copia de una emisión anterior: el mismo archivo y los mismos folios, sin gastar folios. */
export class AbrirEmisionDelLibro {
  constructor(
    private readonly dependencias: Pick<DependenciasDeConsulta, 'unidadDeTrabajo' | 'emisiones'> & {
      documentos: DocumentosProtegidos;
    },
  ) {}

  ejecutar(operador: Operador, emisionId: string): Promise<CopiaDeEmision> {
    const { unidadDeTrabajo, emisiones, documentos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const emision = await emisiones.buscar(emisionId);
      if (!emision?.archivoId) throw new EmisionNoEncontrada();
      const archivo = await documentos.abrir(emision.archivoId, RECURSO_DE_EMISIONES);
      const nombre = `libro-de-compras-${emision.periodo.slice(0, 7)}-folios-${emision.folioDesde}-${emision.folioHasta}.pdf`;
      return { ...archivo, nombre };
    });
  }
}

interface DependenciasDelBorrador extends DependenciasParaArmarElLibro {
  unidadDeTrabajo: UnidadDeTrabajo;
  generador: GeneradorDePdfDelLibro;
}

/** El mismo PDF con «BORRADOR — sin folio» en lugar del número; no guarda nada ni gasta folios. */
export class GenerarBorradorDelLibro {
  constructor(private readonly dependencias: DependenciasDelBorrador) {}

  async ejecutar(operador: Operador, periodo: string): Promise<Buffer> {
    const armado = await this.dependencias.unidadDeTrabajo.ejecutar(operador, () =>
      armarLibro(this.dependencias, operador, periodoDelLibro(periodo)),
    );
    return this.dependencias.generador.generar(libroParaImprimir(armado, null));
  }
}
