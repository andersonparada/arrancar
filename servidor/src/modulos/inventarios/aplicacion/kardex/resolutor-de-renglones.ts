import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import type { ConversionDeArticulo } from '../../dominio/conversion.js';
import { convertirABase, type UnidadParaConvertir } from '../../dominio/conversion-a-base.js';
import { aCentavosEnteros, aDiezmilesimas } from '../../dominio/decimales.js';
import { DocumentoInvalido, ElementoInactivo, LoteObligatorio } from '../../dominio/errores-de-kardex.js';
import type { RenglonDePlan } from '../../dominio/plan-de-documento.js';
import type { RenglonSolicitado } from '../dto/documento.dto.js';
import type {
  ArticuloParaMovimiento,
  CatalogosDelKardex,
  LoteParaMovimiento,
} from '../puertos/catalogos-del-kardex.js';

/** Los renglones ya pasados a la unidad base y los artículos que usan (para los eventos). */
export interface RenglonesResueltos {
  renglones: RenglonDePlan[];
  articulos: ReadonlyMap<string, ArticuloParaMovimiento>;
}

interface Catalogos {
  articulos: Map<string, ArticuloParaMovimiento>;
  unidades: Map<string, UnidadParaConvertir>;
  conversiones: Map<string, ConversionDeArticulo[]>;
  lotes: Map<string, LoteParaMovimiento>;
}

const porId = <T extends { id: string }>(filas: readonly T[]): Map<string, T> => new Map(filas.map((f) => [f.id, f]));

/** Revisa los renglones de la solicitud contra los catálogos de la empresa y los pasa a la unidad base del artículo. */
export class ResolutorDeRenglones {
  constructor(private readonly catalogos: CatalogosDelKardex) {}

  /**
   * @throws RecursoNoEncontrado si un artículo, unidad o lote no existe en la empresa.
   * @throws ElementoInactivo si un artículo está inactivo.
   * @throws LoteObligatorio si el artículo maneja lotes y no se eligió uno.
   * @throws UnidadSinConversion si la unidad escrita no se pasa a la base.
   */
  async resolver(solicitados: readonly RenglonSolicitado[]): Promise<RenglonesResueltos> {
    const catalogos = await this.cargar(solicitados);
    const renglones = solicitados.map((s) => this.resolverUno(s, catalogos));
    return { renglones, articulos: catalogos.articulos };
  }

  private async cargar(solicitados: readonly RenglonSolicitado[]): Promise<Catalogos> {
    const articuloIds = [...new Set(solicitados.map((s) => s.articuloId))];
    const articulos = porId(await this.catalogos.articulos(articuloIds));
    if (articulos.size !== articuloIds.length) throw new RecursoNoEncontrado('El artículo');
    const unidadIds = new Set(solicitados.flatMap((s) => (s.unidadId ? [s.unidadId] : [])));
    for (const articulo of articulos.values()) unidadIds.add(articulo.unidadBaseId);
    const loteIds = solicitados.flatMap((s) => (s.loteId ? [s.loteId] : []));
    return {
      articulos,
      unidades: porId(await this.catalogos.unidades([...unidadIds])),
      conversiones: await this.catalogos.conversionesDe(articuloIds),
      lotes: porId(await this.catalogos.lotes([...new Set(loteIds)])),
    };
  }

  private resolverUno(solicitado: RenglonSolicitado, catalogos: Catalogos): RenglonDePlan {
    const articulo = catalogos.articulos.get(solicitado.articuloId)!;
    if (!articulo.activo) throw new ElementoInactivo(`El artículo ${articulo.codigo}`);
    const unidadId = solicitado.unidadId ?? articulo.unidadBaseId;
    const cantidadEscrita = aDiezmilesimas(solicitado.cantidad);
    return {
      articuloId: articulo.id,
      loteId: this.loteDe(solicitado, articulo, catalogos),
      cantidad: convertirABase({
        cantidad: cantidadEscrita,
        unidad: this.unidad(unidadId, catalogos),
        base: this.unidad(articulo.unidadBaseId, catalogos),
        conversiones: catalogos.conversiones.get(articulo.id) ?? [],
      }),
      cantidadEscrita,
      unidadEscritaId: unidadId,
      costoTotal: aCentavosEnteros(solicitado.costoTotal ?? '0'),
    };
  }

  private unidad(id: string, { unidades }: Catalogos): UnidadParaConvertir {
    const unidad = unidades.get(id);
    if (!unidad) throw new RecursoNoEncontrado('La unidad');
    return unidad;
  }

  private loteDe(solicitado: RenglonSolicitado, articulo: ArticuloParaMovimiento, { lotes }: Catalogos): string | null {
    if (!articulo.manejaLotes) {
      if (solicitado.loteId) throw new DocumentoInvalido(`El artículo ${articulo.codigo} no maneja lotes.`);
      return null;
    }
    if (!solicitado.loteId) throw new LoteObligatorio(articulo.codigo);
    if (lotes.get(solicitado.loteId)?.articuloId !== articulo.id) throw new RecursoNoEncontrado('El lote');
    return solicitado.loteId;
  }
}
