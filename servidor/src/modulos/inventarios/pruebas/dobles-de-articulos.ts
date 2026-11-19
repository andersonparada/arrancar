import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { Correlativos, NumeroAsignado } from '../../core/compartido/aplicacion/correlativos.js';
import type { Reloj } from '../../core/compartido/aplicacion/reloj.js';
import type { ArticuloDto } from '../aplicacion/dto/articulo.dto.js';
import type { ConversionDto, SolicitudDeConversiones } from '../aplicacion/dto/conversion.dto.js';
import type { LoteDto, SolicitudDeLote } from '../aplicacion/dto/lote.dto.js';
import type { AlmacenDeConversiones } from '../aplicacion/puertos/almacen-de-conversiones.js';
import type { AlmacenDeLotes } from '../aplicacion/puertos/almacen-de-lotes.js';
import type { ConsultasArticulos } from '../aplicacion/puertos/consultas-articulos.js';
import type { LectorDePrefijoDeCodigos } from '../aplicacion/puertos/lector-de-prefijo-de-codigos.js';
import type { RepositorioArticulos } from '../aplicacion/puertos/repositorio-articulos.js';
import type { Articulo, ArticuloId } from '../dominio/articulo.js';

function aDto(articulo: Articulo): ArticuloDto {
  const { id, empresaId, ...datos } = articulo.instantanea();
  return { ...datos, id: id.valor, categoriaNombre: null, unidadBaseNombre: null, conceptoDeGastoNombre: null };
}

/** Guarda los artículos en memoria y responde tanto de repositorio como de consultas. */
export class ArticulosEnMemoria implements RepositorioArticulos, ConsultasArticulos {
  private readonly registros = new Map<string, Articulo>();

  async buscar(id: ArticuloId): Promise<Articulo | null> {
    return this.registros.get(id.valor) ?? null;
  }

  async agregar(articulo: Articulo): Promise<void> {
    this.registros.set(articulo.id.valor, articulo);
  }

  async guardar(articulo: Articulo): Promise<void> {
    this.registros.set(articulo.id.valor, articulo);
  }

  async eliminar(articulo: Articulo): Promise<void> {
    this.registros.delete(articulo.id.valor);
  }

  async listar(): Promise<ArticuloDto[]> {
    const porNombre = (a: ArticuloDto, b: ArticuloDto) => String(a.codigo).localeCompare(String(b.codigo));
    return [...this.registros.values()].map(aDto).sort(porNombre);
  }

  async obtener(articuloId: string): Promise<ArticuloDto> {
    const articulo = this.registros.get(articuloId);
    if (!articulo) throw new RecursoNoEncontrado('El artículo');
    return aDto(articulo);
  }

  /** En memoria, todo lo elegido existe. */
  exigirReferencias(): Promise<void> {
    return Promise.resolve();
  }

  async existeCodigo(codigo: string): Promise<boolean> {
    return [...this.registros.values()].some(
      (articulo) => articulo.instantanea().codigo.toUpperCase() === codigo.toUpperCase(),
    );
  }
}

/** Las conversiones de los artículos en memoria. */
export class ConversionesEnMemoria implements AlmacenDeConversiones {
  private readonly porArticulo = new Map<string, SolicitudDeConversiones['conversiones']>();

  /** Las unidades que «existen»; vacío significa que todas. */
  readonly unidadesConocidas = new Set<string>();

  async listar(articuloId: string): Promise<ConversionDto[]> {
    return (this.porArticulo.get(articuloId) ?? []).map((conversion) => ({
      ...conversion,
      unidadNombre: conversion.unidadId,
    }));
  }

  async exigirUnidades(unidadIds: readonly string[]): Promise<void> {
    if (this.unidadesConocidas.size === 0) return;
    if (unidadIds.some((id) => !this.unidadesConocidas.has(id))) throw new RecursoNoEncontrado('La unidad de medida');
  }

  async reemplazar(articuloId: string, _empresaId: string, conversiones: SolicitudDeConversiones['conversiones']) {
    this.porArticulo.set(articuloId, conversiones);
  }
}

/** Los lotes de los artículos en memoria. */
export class LotesEnMemoria implements AlmacenDeLotes {
  private readonly lotes: LoteDto[] = [];

  async listar(articuloId: string): Promise<LoteDto[]> {
    return this.lotes.filter((lote) => lote.articuloId === articuloId);
  }

  async agregar(_empresaId: string, articuloId: string, datos: SolicitudDeLote): Promise<LoteDto> {
    const lote = { ...datos, id: crypto.randomUUID(), articuloId };
    this.lotes.push(lote);
    return lote;
  }
}

/** Un correlativo que cuenta desde 1. */
export class CorrelativosEnMemoria implements Correlativos {
  private numero = 0;

  async siguiente(): Promise<NumeroAsignado> {
    this.numero += 1;
    return { numero: this.numero, anio: 0 };
  }
}

export const relojDePrueba: Reloj = { hoy: async () => '2026-11-18' };

export const prefijoDePrueba: LectorDePrefijoDeCodigos = { paraEmpresa: async () => 'ART-' };
