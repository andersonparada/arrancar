import { randomUUID } from 'node:crypto';
import type { LoteDto, SolicitudDeLote } from '../aplicacion/dto/lote.dto.js';
import type { SaldoInicialDto } from '../aplicacion/dto/saldo-inicial.dto.js';
import type { AlmacenDeLotes } from '../aplicacion/puertos/almacen-de-lotes.js';
import type {
  ConflictosConLaFechaDeInicio,
  ConsultasDeSaldosIniciales,
  LlaveDeRenglon,
  ResumenDeSaldosIniciales,
} from '../aplicacion/puertos/consultas-de-saldos-iniciales.js';
import type { MovimientoDelKardex } from '../dominio/costeo/movimientos-del-kardex.js';
import { deCentavosEnteros, deDiezmilesimas, deMillonesimas } from '../dominio/decimales.js';
import { diaAnterior } from '../dominio/fechas.js';
import type { KardexEnMemoria } from './dobles-del-kardex.js';

const sinSigno = (valor: bigint): bigint => (valor < 0n ? -valor : valor);

/** Los lotes de los artículos en memoria. */
export class LotesEnMemoria implements AlmacenDeLotes {
  readonly lotes: LoteDto[] = [];

  constructor(private readonly kardex: KardexEnMemoria) {}

  async listar(articuloId: string): Promise<LoteDto[]> {
    return this.lotes.filter((lote) => lote.articuloId === articuloId);
  }

  async agregar(_empresaId: string, articuloId: string, datos: SolicitudDeLote): Promise<LoteDto> {
    const lote = { ...datos, id: randomUUID(), articuloId };
    this.lotes.push(lote);
    this.kardex.lotesDelCatalogo.set(lote.id, { id: lote.id, articuloId });
    return lote;
  }
}

/** Las lecturas de los saldos iniciales sobre el kardex en memoria; reconoce un saldo por su `fechaDeCapa`. */
export class SaldosEnMemoria implements ConsultasDeSaldosIniciales {
  constructor(
    private readonly kardex: KardexEnMemoria,
    private readonly lotes: LotesEnMemoria,
  ) {}

  private renglones() {
    return this.kardex.movimientos.filter((m) => m.vigente && m.fechaDeCapa);
  }

  async listar(): Promise<SaldoInicialDto[]> {
    return this.renglones().map((m) => this.aDto(m.id)!);
  }

  async obtener(movimientoId: string): Promise<SaldoInicialDto | null> {
    return this.aDto(movimientoId);
  }

  private aDto(id: string): SaldoInicialDto | null {
    const m = this.renglones().find((x) => x.id === id);
    const documento = m && this.kardex.documentosGuardados.get(m.documentoId);
    if (!m || !documento || documento.estado !== 'vigente') return null;
    const articulo = this.kardex.articulosDelCatalogo.get(m.articuloId)!;
    const cantidad = deDiezmilesimas(sinSigno(m.cantidad));
    return {
      id: m.id,
      documentoId: documento.id,
      documentoNumero: documento.numero,
      articuloId: articulo.id,
      articuloCodigo: articulo.codigo,
      articuloNombre: articulo.nombre,
      tipoDeInventario: articulo.tipoDeInventario,
      ...this.bodegaYLote(m),
      cantidad,
      unidadId: articulo.unidadBaseId,
      unidadNombre: 'Libra',
      cantidadBase: cantidad,
      unidadBaseNombre: 'Libra',
      costoTotal: deCentavosEnteros(m.costoTotal),
      costoUnitario: deMillonesimas(m.costoUnitario),
      fechaDeCapa: m.fechaDeCapa!,
    };
  }

  private bodegaYLote(m: MovimientoDelKardex) {
    const lote = this.lotes.lotes.find((l) => l.id === m.loteId);
    return {
      bodegaId: m.bodegaId!,
      bodegaCodigo: m.bodegaId!,
      bodegaNombre: this.kardex.bodegasDelCatalogo.get(m.bodegaId!)?.nombre ?? '',
      loteId: m.loteId,
      loteCodigo: lote?.codigo ?? null,
      loteVencimiento: lote?.fechaDeVencimiento ?? null,
    };
  }

  async existeRenglon(llave: LlaveDeRenglon): Promise<boolean> {
    return this.renglones().some(
      (m) =>
        m.articuloId === llave.articuloId &&
        m.bodegaId === llave.bodegaId &&
        m.loteId === llave.loteId &&
        m.fechaDeCapa === llave.fechaDeCapa,
    );
  }

  async resumenParaLaRevision(fechaDeInicio: string): Promise<ResumenDeSaldosIniciales> {
    const existencias = new Map<string, ResumenDeSaldosIniciales['existencias'][number]>();
    for (const m of this.renglones()) {
      const articulo = this.kardex.articulosDelCatalogo.get(m.articuloId)!;
      const clave = `${m.articuloId}|${m.bodegaId}`;
      const antes = existencias.get(clave);
      existencias.set(clave, {
        articuloId: m.articuloId,
        articuloCodigo: articulo.codigo,
        tipoDeInventario: articulo.tipoDeInventario,
        bodegaId: m.bodegaId!,
        bodegaNombre: this.kardex.bodegasDelCatalogo.get(m.bodegaId!)?.nombre ?? '',
        cantidad: (antes?.cantidad ?? 0n) + m.cantidad,
        valor: (antes?.valor ?? 0n) + m.costoTotal,
      });
    }
    const vencidos = this.renglones().filter((m) => {
      const vencimiento = this.lotes.lotes.find((l) => l.id === m.loteId)?.fechaDeVencimiento;
      return !!vencimiento && vencimiento < fechaDeInicio;
    });
    const valor = vencidos.reduce((suma, m) => suma + m.costoTotal, 0n);
    return { existencias: [...existencias.values()], lotesVencidos: { lotes: vencidos.length, valor } };
  }

  conteos = false;

  async hayConteos(): Promise<boolean> {
    return this.conteos;
  }

  async conflictosConLaFechaDeInicio(nueva: string): Promise<ConflictosConLaFechaDeInicio> {
    const vigentes = this.kardex.movimientos.filter((m) => m.vigente);
    return {
      movimientosAnteriores: vigentes.filter((m) => !m.fechaDeCapa && m.fecha < nueva).length,
      capasPosteriores: vigentes.filter((m) => m.fechaDeCapa && m.fechaDeCapa !== m.fecha && m.fechaDeCapa >= nueva)
        .length,
      llavesQueSeJuntarian: this.llavesQueSeJuntarian(nueva),
    };
  }

  private llavesQueSeJuntarian(nueva: string): number {
    const dia = diaAnterior(nueva);
    const cuentas = new Map<string, number>();
    for (const m of this.renglones()) {
      const capa = m.fechaDeCapa === m.fecha ? dia : m.fechaDeCapa! < dia ? m.fechaDeCapa! : dia;
      const llave = `${m.articuloId}|${m.bodegaId}|${m.loteId}|${capa}`;
      cuentas.set(llave, (cuentas.get(llave) ?? 0) + 1);
    }
    return [...cuentas.values()].filter((n) => n > 1).length;
  }

  async reubicar(nuevaFechaDeInicio: string): Promise<void> {
    const dia = diaAnterior(nuevaFechaDeInicio);
    for (const m of this.kardex.movimientos.filter((x) => x.fechaDeCapa)) {
      const propia = m.fechaDeCapa !== m.fecha && m.fechaDeCapa! < dia;
      Object.assign(m, { fechaDeCapa: propia ? m.fechaDeCapa : dia, fecha: dia });
    }
    for (const d of this.kardex.documentosGuardados.values()) if (d.clase === 'saldo_inicial') d.fecha = dia;
  }
}
