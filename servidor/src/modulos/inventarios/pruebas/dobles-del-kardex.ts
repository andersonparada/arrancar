import { randomUUID } from 'node:crypto';
import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type {
  AlmacenDelKardex,
  DerivadoDePeps,
  NuevoMovimiento,
  NuevoRecalculo,
} from '../aplicacion/puertos/almacen-del-kardex.js';
import type {
  ArticuloParaMovimiento,
  BodegaParaMovimiento,
  CatalogosDelKardex,
  LoteParaMovimiento,
} from '../aplicacion/puertos/catalogos-del-kardex.js';
import type { CambioDeMovimiento, SaldoDelArticulo } from '../dominio/costeo/cambios-del-recorrido.js';
import type { MovimientoDelKardex } from '../dominio/costeo/movimientos-del-kardex.js';
import type { ConversionDeArticulo } from '../dominio/conversion.js';
import type { UnidadParaConvertir } from '../dominio/conversion-a-base.js';
import type { DocumentoDto, RenglonDeDocumentoDto } from '../aplicacion/dto/documento.dto.js';
import type {
  AnulacionDeDocumento,
  DocumentoGuardado,
  RepositorioDeDocumentos,
} from '../aplicacion/puertos/repositorio-de-documentos.js';
import type { CambioDeExistencia, ExistenciasPorBodega } from '../aplicacion/puertos/existencias-por-bodega.js';
import type { MetodoGuardado, RepositorioDeMetodos } from '../aplicacion/puertos/repositorio-de-metodos.js';
import type { MetodoDeCosteo } from '../dominio/costeo/tipos.js';
import type { ArticuloDeKardex, ConsultasDelKardex, FilaDeKardex } from '../aplicacion/puertos/consultas-del-kardex.js';
import type { ExistenciaDto } from '../aplicacion/dto/existencia.dto.js';
import { aCentavosEnteros, deCentavosEnteros, deDiezmilesimas, deMillonesimas } from '../dominio/decimales.js';

interface MovimientoGuardado extends MovimientoDelKardex {
  vigente: boolean;
}

/**
 * El kardex entero en memoria: hace de almacén, existencias, documentos, métodos, catálogos y consultas, con la misma
 * semántica que la base real salvo la seguridad por filas. Las pruebas de los casos de uso lo comparten.
 */
export class KardexEnMemoria
  implements
    AlmacenDelKardex,
    ExistenciasPorBodega,
    RepositorioDeDocumentos,
    RepositorioDeMetodos,
    CatalogosDelKardex,
    ConsultasDelKardex
{
  readonly bloqueos: string[][] = [];
  readonly movimientos: MovimientoGuardado[] = [];
  readonly documentosGuardados = new Map<string, DocumentoGuardado>();
  readonly saldos = new Map<string, SaldoDelArticulo>();
  readonly recalculos: NuevoRecalculo[] = [];
  readonly capas = new Map<string, DerivadoDePeps>();
  readonly existenciasPorClave = new Map<string, bigint>();
  readonly metodos: MetodoGuardado[] = [];
  readonly articulosDelCatalogo = new Map<string, ArticuloParaMovimiento>();
  readonly unidadesDelCatalogo = new Map<string, UnidadParaConvertir>();
  readonly conversiones = new Map<string, ConversionDeArticulo[]>();
  readonly lotesDelCatalogo = new Map<string, LoteParaMovimiento>();
  readonly bodegasDelCatalogo = new Map<string, BodegaParaMovimiento>();
  /** El orden de los candados y de la lectura de artículos, para probar que el candado va primero. */
  readonly orden: string[] = [];
  private secuencia = 0;

  // AlmacenDelKardex
  async bloquear(articuloIds: readonly string[]): Promise<void> {
    this.orden.push('bloquear');
    this.bloqueos.push([...new Set(articuloIds)].sort());
  }

  async movimientosVigentes(articuloId: string): Promise<MovimientoDelKardex[]> {
    return this.movimientos.filter((m) => m.vigente && m.articuloId === articuloId).map((m) => ({ ...m }));
  }

  async movimientosDelDocumento(documentoId: string): Promise<MovimientoDelKardex[]> {
    return this.movimientos.filter((m) => m.documentoId === documentoId).map((m) => ({ ...m }));
  }

  async agregarMovimientos(nuevos: readonly NuevoMovimiento[]): Promise<MovimientoDelKardex[]> {
    const agregados = nuevos.map((n) => ({
      ...n,
      id: randomUUID(),
      secuencia: ++this.secuencia,
      saldoCantidad: 0n,
      saldoValor: 0n,
      montoAResultados: 0n,
      vigente: true,
    }));
    this.movimientos.push(...agregados);
    return agregados.map((m) => ({ ...m }));
  }

  async actualizarMovimientos(cambios: readonly CambioDeMovimiento[]): Promise<void> {
    for (const cambio of cambios)
      Object.assign(
        this.movimientos.find((m) => m.id === cambio.id)!,
        cambio,
      );
  }

  async desactivarMovimientosDelDocumento(documentoId: string): Promise<void> {
    for (const m of this.movimientos.filter((x) => x.documentoId === documentoId)) m.vigente = false;
  }

  async reemplazarCapas(articuloId: string, derivado: DerivadoDePeps): Promise<void> {
    this.capas.set(articuloId, derivado);
  }

  async guardarSaldo(articuloId: string, saldo: SaldoDelArticulo): Promise<void> {
    this.saldos.set(articuloId, saldo);
  }

  async agregarRecalculo(recalculo: NuevoRecalculo): Promise<void> {
    this.recalculos.push(recalculo);
  }

  // ExistenciasPorBodega
  async mover(cambios: readonly CambioDeExistencia[]): Promise<void> {
    for (const c of cambios) {
      const clave = `${c.bodegaId}|${c.articuloId}|${c.loteId ?? ''}`;
      const nueva = (this.existenciasPorClave.get(clave) ?? 0n) + c.cantidad;
      if (nueva < 0n) throw new Error('El check de existencias lo habría rechazado.');
      this.existenciasPorClave.set(clave, nueva);
    }
  }

  existenciaDe(bodegaId: string, articuloId: string, loteId: string | null = null): bigint {
    return this.existenciasPorClave.get(`${bodegaId}|${articuloId}|${loteId ?? ''}`) ?? 0n;
  }

  // RepositorioDeDocumentos
  async agregar(documento: DocumentoGuardado): Promise<void>;
  async agregar(metodo: MetodoGuardado): Promise<void>;
  async agregar(valor: DocumentoGuardado | MetodoGuardado): Promise<void> {
    if ('metodo' in valor) this.metodos.unshift(valor);
    else this.documentosGuardados.set(valor.id, valor);
  }

  async buscar(id: string): Promise<DocumentoGuardado | null> {
    return this.documentosGuardados.get(id) ?? null;
  }

  async anular(id: string, _anulacion: AnulacionDeDocumento): Promise<void> {
    this.documentosGuardados.get(id)!.estado = 'anulado';
  }

  // RepositorioDeMetodos
  async listar(): Promise<MetodoGuardado[]> {
    return [...this.metodos].sort((a, b) => b.desde.localeCompare(a.desde));
  }

  async fijar(id: string, ahora: Date): Promise<void> {
    this.metodos.find((m) => m.id === id)!.fijadoEn = ahora;
  }

  async cambiar(id: string, metodo: MetodoDeCosteo): Promise<boolean> {
    const fila = this.metodos.find((m) => m.id === id)!;
    if (fila.fijadoEn) return false;
    fila.metodo = metodo;
    return true;
  }

  async bloquearPolitica(): Promise<void> {}

  // CatalogosDelKardex
  async articulos(ids: readonly string[]): Promise<ArticuloParaMovimiento[]> {
    this.orden.push('leer_articulos');
    return ids.flatMap((id) => this.articulosDelCatalogo.get(id) ?? []);
  }

  async unidades(ids: readonly string[]): Promise<UnidadParaConvertir[]> {
    return ids.flatMap((id) => this.unidadesDelCatalogo.get(id) ?? []);
  }

  async conversionesDe(articuloIds: readonly string[]): Promise<Map<string, ConversionDeArticulo[]>> {
    return new Map(articuloIds.map((id) => [id, this.conversiones.get(id) ?? []]));
  }

  async lotes(ids: readonly string[]): Promise<LoteParaMovimiento[]> {
    return ids.flatMap((id) => this.lotesDelCatalogo.get(id) ?? []);
  }

  async bodega(id: string): Promise<BodegaParaMovimiento | null> {
    return this.bodegasDelCatalogo.get(id) ?? null;
  }

  async exigirReferencias(): Promise<void> {}

  // ConsultasDelKardex
  async documentos(): Promise<DocumentoDto[]> {
    return Promise.all([...this.documentosGuardados.keys()].map((id) => this.documento(id)));
  }

  async documento(id: string): Promise<DocumentoDto> {
    const d = this.documentosGuardados.get(id);
    if (!d) throw new RecursoNoEncontrado('El documento');
    const renglones = this.movimientos.filter((m) => m.documentoId === id).map((m) => this.renglonDe(m));
    const total = renglones.reduce((suma, r) => suma + aCentavosEnteros(r.costoTotal ?? '0'), 0n);
    return {
      ...d,
      bodegaNombre: this.bodegasDelCatalogo.get(d.bodegaId)?.nombre ?? '',
      conceptoDeGastoNombre: null,
      motivoDeAnulacion: null,
      avisos: [],
      costoTotal: deCentavosEnteros(total),
      renglones,
    };
  }

  private renglonDe(m: MovimientoDelKardex): RenglonDeDocumentoDto {
    const abs = (v: bigint) => (v < 0n ? -v : v);
    const articulo = this.articulosDelCatalogo.get(m.articuloId);
    return {
      movimientoId: m.id,
      articuloId: m.articuloId,
      articuloCodigo: articulo?.codigo ?? '',
      articuloNombre: articulo?.nombre ?? '',
      loteId: m.loteId,
      loteCodigo: null,
      cantidad: deDiezmilesimas(abs(m.cantidad)),
      unidadBaseNombre: 'Libra',
      cantidadEscrita: null,
      unidadEscritaSimbolo: null,
      costoUnitario: deMillonesimas(m.costoUnitario),
      costoTotal: deCentavosEnteros(abs(m.costoTotal)),
    };
  }

  async existencias(): Promise<ExistenciaDto[]> {
    return [];
  }

  async articulo(id: string): Promise<ArticuloDeKardex> {
    const a = this.articulosDelCatalogo.get(id);
    if (!a) throw new RecursoNoEncontrado('El artículo');
    return { id: a.id, codigo: a.codigo, nombre: a.nombre, unidadBaseNombre: 'Libra' };
  }

  async filasDeKardex(): Promise<FilaDeKardex[]> {
    return [];
  }
}
