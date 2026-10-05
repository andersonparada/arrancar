import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { LineaEscrita } from '../../../dominio/calculo-de-linea.js';
import type { CombustibleDeLineaGuardada } from '../../../dominio/documento-de-compra.js';
import { CombustibleSinTasaVigente } from '../../../dominio/errores-de-calculo.js';
import { CatalogoInactivo, LineaDeDocumentoInvalida } from '../../../dominio/errores-de-documento.js';
import type { DatosDeLineaParaRetencion } from '../../../dominio/retencion-propuesta.js';
import type { SolicitudDeLinea } from '../../dto/solicitud-de-documento.js';
import type {
  CatalogosParaDocumentos,
  CombustibleConTasa,
  ConceptoParaLinea,
} from '../../puertos/puertos-de-documentos.js';

/** Lo que se guarda de una línea además de sus montos, que salen del cálculo. */
export interface DescripcionDeLinea {
  numero: number;
  conceptoId: string;
  descripcion: string | null;
  tipo: 'bien' | 'servicio';
  esActivoFijo: boolean;
  combustible: CombustibleDeLineaGuardada | null;
}

export interface LineasResueltas {
  escritas: LineaEscrita[];
  descripciones: DescripcionDeLinea[];
  /** Para la retención del exportador: si el concepto es agropecuario y el tipo de cada línea. */
  paraRetencion: DatosDeLineaParaRetencion[];
}

interface Catalogos {
  conceptos: Map<string, ConceptoParaLinea>;
  combustibles: Map<string, CombustibleConTasa>;
}

const sinRepetidos = (ids: readonly (string | null)[]): string[] => [
  ...new Set(ids.filter((id): id is string => id !== null)),
];

/** Resuelve cada línea contra los catálogos de la empresa: concepto activo, tipo y tasa de IDP en la fecha de emisión. */
export class ResolutorDeLineas {
  constructor(private readonly catalogos: CatalogosParaDocumentos) {}

  /**
   * @throws RecursoNoEncontrado si un concepto o combustible no existe en la empresa.
   * @throws CatalogoInactivo si alguno está inactivo.
   * @throws CombustibleSinTasaVigente si el combustible no tiene tasa de IDP en la fecha de emisión.
   * @throws LineaDeDocumentoInvalida si la línea se contradice (activo fijo que no es bien, galones sin combustible...).
   */
  async resolver(lineas: readonly SolicitudDeLinea[], fechaDeEmision: string): Promise<LineasResueltas> {
    const catalogos = await this.cargar(lineas, fechaDeEmision);
    const descripciones = lineas.map((linea, indice) => describir(linea, indice + 1, { catalogos, fechaDeEmision }));
    return {
      escritas: lineas.map((linea, indice) => escribir(linea, descripciones[indice]?.combustible ?? null)),
      descripciones,
      paraRetencion: descripciones.map((descripcion) => ({
        esProductoAgropecuario: catalogos.conceptos.get(descripcion.conceptoId)?.esProductoAgropecuario ?? false,
        tipo: descripcion.tipo,
      })),
    };
  }

  private async cargar(lineas: readonly SolicitudDeLinea[], fechaDeEmision: string): Promise<Catalogos> {
    const conceptos = await this.catalogos.conceptos(sinRepetidos(lineas.map((linea) => linea.conceptoId)));
    const combustibles = await this.catalogos.combustiblesConTasa(
      sinRepetidos(lineas.map((linea) => linea.combustibleId)),
      fechaDeEmision,
    );
    return {
      conceptos: new Map(conceptos.map((concepto) => [concepto.id, concepto])),
      combustibles: new Map(combustibles.map((combustible) => [combustible.combustibleId, combustible])),
    };
  }
}

function conceptoDe(linea: SolicitudDeLinea, catalogos: Catalogos): ConceptoParaLinea {
  const concepto = catalogos.conceptos.get(linea.conceptoId);
  if (!concepto) throw new RecursoNoEncontrado('El concepto de gasto');
  if (!concepto.activo) throw new CatalogoInactivo(`El concepto de gasto "${concepto.nombre}" está inactivo.`);
  return concepto;
}

function combustibleDe(
  linea: SolicitudDeLinea,
  catalogos: Catalogos,
  fechaDeEmision: string,
): CombustibleDeLineaGuardada | null {
  if ((linea.combustibleId === null) !== (linea.galones === null)) {
    throw new LineaDeDocumentoInvalida('Una línea de combustible lleva el combustible y los galones.');
  }
  if (linea.combustibleId === null || linea.galones === null) return null;
  const combustible = catalogos.combustibles.get(linea.combustibleId);
  if (!combustible) throw new RecursoNoEncontrado('El combustible');
  if (!combustible.activo) throw new CatalogoInactivo(`El combustible "${combustible.nombre}" está inactivo.`);
  if (!combustible.vigencia) throw new CombustibleSinTasaVigente(combustible.nombre, fechaDeEmision);
  const { id, idpPorGalon, porcentajeDeEtanol } = combustible.vigencia;
  return { vigenciaDeCombustibleId: id, galones: linea.galones, idpPorGalon, porcentajeDeEtanol };
}

function describir(
  linea: SolicitudDeLinea,
  numero: number,
  { catalogos, fechaDeEmision }: { catalogos: Catalogos; fechaDeEmision: string },
): DescripcionDeLinea {
  const concepto = conceptoDe(linea, catalogos);
  const tipo = linea.tipo ?? concepto.tipoPorOmision;
  const esActivoFijo = linea.esActivoFijo ?? concepto.esActivoFijo;
  const combustible = combustibleDe(linea, catalogos, fechaDeEmision);
  if ((esActivoFijo || combustible) && tipo !== 'bien') {
    throw new LineaDeDocumentoInvalida(`La línea ${numero} es un activo fijo o combustible: debe ser un bien.`);
  }
  return { numero, conceptoId: concepto.id, descripcion: linea.descripcion, tipo, esActivoFijo, combustible };
}

function escribir(linea: SolicitudDeLinea, combustible: CombustibleDeLineaGuardada | null): LineaEscrita {
  return {
    total: aCentavos(linea.total),
    exento: aCentavos(linea.exento ?? '0'),
    combustible: combustible && {
      galones: combustible.galones,
      idpPorGalon: combustible.idpPorGalon,
      porcentajeDeEtanol: combustible.porcentajeDeEtanol,
    },
  };
}
