import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { ConsultasDeRecepciones } from '../aplicacion/puertos/consultas-de-recepciones.js';
import type { LineasDeCompra } from '../aplicacion/puertos/lineas-de-compra.js';
import type {
  CambioDeMarcaEnElLibro,
  MarcaDeInventarioEnElLibro,
} from '../aplicacion/puertos/marca-de-inventario-en-el-libro.js';
import type {
  DescarteDeLinea,
  NuevoDescarte,
  RepositorioDeDescartes,
} from '../aplicacion/puertos/repositorio-de-descartes.js';
import type { EntradaDevolvible } from '../dominio/devolucion.js';
import { NOMBRE_DE_CLASE } from '../dominio/documento.js';
import type { LineaDeCompra } from '../dominio/linea-de-compra.js';
import type { EntradaParaRepartir } from '../dominio/rebaja.js';
import type { KardexEnMemoria } from './dobles-del-kardex.js';

type LineaDelLibro = Omit<LineaDeCompra, 'aplicadoCentavos' | 'descartada'>;

/**
 * El Libro de compras en memoria, visto desde Inventarios: las líneas con lo que el kardex ya les aplicó, los descartes
 * y la orden de la marca. Calcula lo aplicado de los movimientos del kardex en memoria, como lo hace la base real.
 */
export class LibroEnMemoria
  implements LineasDeCompra, ConsultasDeRecepciones, RepositorioDeDescartes, MarcaDeInventarioEnElLibro
{
  readonly lineasDelLibro = new Map<string, LineaDelLibro>();
  readonly descartes: Array<DescarteDeLinea & { vigente: boolean }> = [];
  readonly cambiosDeMarca: CambioDeMarcaEnElLibro[] = [];
  readonly bloqueos: string[][] = [];
  /** Si se pone, la orden de la marca falla con este error (el libro rechazó el cambio). */
  falloDeLaMarca: Error | null = null;

  constructor(private readonly kardex: KardexEnMemoria) {}

  // LineasDeCompra
  async bloquear(lineaIds: readonly string[]): Promise<void> {
    this.kardex.orden.push('bloquear_lineas');
    this.bloqueos.push([...new Set(lineaIds)].sort());
  }

  async buscar(lineaIds: readonly string[]): Promise<LineaDeCompra[]> {
    return lineaIds.flatMap((id) => {
      const linea = this.lineasDelLibro.get(id);
      if (!linea) return [];
      const descartada = this.descartes.some((d) => d.lineaId === id && d.vigente);
      return [{ ...linea, aplicadoCentavos: this.aplicadoDe(linea), descartada }];
    });
  }

  /** Lo recibido de una factura, o lo que una nota ya devolvió y rebajó, en centavos y en positivo. */
  private aplicadoDe(linea: LineaDelLibro): bigint {
    const vigentes = this.kardex.movimientos.filter((m) => m.vigente && m.lineaDeCompraId === linea.lineaId);
    if (linea.tipoDeDocumento !== 'nota_de_credito') {
      return vigentes.filter((m) => m.tipo === 'entrada').reduce((suma, m) => suma + m.costoTotal, 0n);
    }
    return vigentes.reduce((suma, m) => {
      if (m.tipo === 'salida') return suma - m.costoTotal;
      return m.tipo === 'valor' ? suma - (m.parteDeReparto ?? 0n) : suma;
    }, 0n);
  }

  // ConsultasDeRecepciones
  async entradasDevolvibles(movimientoIds: readonly string[]): Promise<EntradaDevolvible[]> {
    return this.kardex.movimientos
      .filter((m) => m.vigente && m.tipo === 'entrada' && movimientoIds.includes(m.id))
      .filter((m) => this.kardex.documentosGuardados.get(m.documentoId)?.clase === 'recepcion_de_compra')
      .map((m) => ({
        movimientoId: m.id,
        articuloId: m.articuloId,
        bodegaId: m.bodegaId!,
        loteId: m.loteId,
        documentoId: m.documentoId,
        documentoDeCompraId: this.kardex.documentosGuardados.get(m.documentoId)!.documentoDeCompraId!,
        fecha: m.fecha,
        cantidad: m.cantidad,
        costoCentavos: m.costoTotal,
        devuelta: this.devueltaDe(m.id),
      }));
  }

  private devueltaDe(entradaId: string): bigint {
    return this.kardex.movimientos
      .filter((m) => m.vigente && m.tipo === 'salida' && m.movimientoDeOrigenId === entradaId)
      .reduce((suma, m) => suma - m.cantidad, 0n);
  }

  async entradasDeLaFactura(documentoDeCompraId: string): Promise<EntradaParaRepartir[]> {
    return this.kardex.movimientos
      .filter((m) => m.vigente && m.tipo === 'entrada' && m.documentoDeCompraId === documentoDeCompraId)
      .map((m) => ({
        movimientoId: m.id,
        articuloId: m.articuloId,
        fecha: m.fecha,
        cantidad: m.cantidad,
        costoTotal: m.costoTotal,
      }));
  }

  async documentosQueDependenDe(documentoId: string): Promise<string[]> {
    const deLaEntrada = new Set(this.kardex.movimientos.filter((m) => m.documentoId === documentoId).map((m) => m.id));
    const dependientes = this.kardex.movimientos.filter(
      (m) => m.vigente && m.movimientoDeOrigenId && deLaEntrada.has(m.movimientoDeOrigenId),
    );
    return this.etiquetas(dependientes.map((m) => m.documentoId));
  }

  async documentosDeLaCompra(documentoDeCompraId: string): Promise<string[]> {
    const vigentes = this.kardex.movimientos.filter((m) => m.vigente && m.documentoDeCompraId === documentoDeCompraId);
    return this.etiquetas(vigentes.map((m) => m.documentoId));
  }

  private etiquetas(documentoIds: readonly string[]): string[] {
    return [...new Set(documentoIds)].map((id) => {
      const documento = this.kardex.documentosGuardados.get(id)!;
      return `${NOMBRE_DE_CLASE[documento.clase]} ${documento.numero}`;
    });
  }

  // RepositorioDeDescartes
  async vigente(lineaId: string): Promise<DescarteDeLinea | null> {
    const descarte = this.descartes.find((d) => d.lineaId === lineaId && d.vigente);
    return descarte ? { ...descarte } : null;
  }

  async agregar(descarte: NuevoDescarte): Promise<void> {
    const { lineaId, documentoId, motivo, quitoLaMarca } = descarte;
    this.descartes.push({
      id: `descarte-${this.descartes.length + 1}`,
      lineaId,
      documentoId,
      motivo,
      quitoLaMarca,
      vigente: true,
    });
  }

  async devolver(descarteId: string): Promise<void> {
    this.descartes.find((d) => d.id === descarteId)!.vigente = false;
  }

  // MarcaDeInventarioEnElLibro
  async cambiar(_operador: Operador, cambio: CambioDeMarcaEnElLibro): Promise<void> {
    if (this.falloDeLaMarca) throw this.falloDeLaMarca;
    this.cambiosDeMarca.push(cambio);
    const linea = this.lineasDelLibro.get(cambio.lineaId);
    if (linea) linea.esInventario = cambio.esInventario;
  }
}
