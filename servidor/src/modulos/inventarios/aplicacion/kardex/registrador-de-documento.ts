import { randomUUID } from 'node:crypto';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import type { EventoDominio } from '../../../core/compartido/dominio/evento-dominio.js';
import type { MovimientoDelKardex } from '../../dominio/costeo/movimientos-del-kardex.js';
import type { MetodoDeCosteo } from '../../dominio/costeo/tipos.js';
import {
  DocumentoInvalido,
  ElementoInactivo,
  FechaAnteriorAlInicio,
  MesCerrado,
} from '../../dominio/errores-de-kardex.js';
import type { PlanDeDocumento } from '../../dominio/plan-de-documento.js';
import type { ArticuloParaMovimiento } from '../puertos/catalogos-del-kardex.js';
import type { DocumentoGuardado } from '../puertos/repositorio-de-documentos.js';
import type { DependenciasDelKardex } from './dependencias-del-kardex.js';
import { eventoDeRecalculo } from './eventos-del-kardex.js';
import { MetodoDeLaEmpresa } from './metodo-de-la-empresa.js';
import { cambiosDeExistencia, nuevoMovimiento } from './movimientos-del-plan.js';
import { RecalculadorDeArticulo } from './recalculador-de-articulo.js';

export interface PedidoDeRegistro {
  plan: PlanDeDocumento;
  articulos: ReadonlyMap<string, ArticuloParaMovimiento>;
}

/** Lo que dejó el registro: el documento, sus movimientos ya costeados y los eventos por publicar tras confirmar. */
export interface ResultadoDeRegistro {
  documento: DocumentoGuardado;
  movimientos: MovimientoDelKardex[];
  eventosDeRecalculo: EventoDominio[];
}

export const periodoDe = (fecha: string): string => `${fecha.slice(0, 7)}-01`;

/**
 * Guarda un documento nuevo en el kardex (§6): toma los candados, revisa la fecha y la bodega, numera el documento,
 * guarda sus movimientos, recalcula el costo de cada artículo y mueve las existencias. Corre **dentro** de la unidad de
 * trabajo del caso de uso: si algo falla (por ejemplo, una existencia negativa) no queda nada.
 */
export class RegistradorDeDocumento {
  private readonly metodo: MetodoDeLaEmpresa;
  private readonly recalculador: RecalculadorDeArticulo;

  constructor(private readonly dependencias: DependenciasDelKardex) {
    this.metodo = new MetodoDeLaEmpresa(dependencias);
    this.recalculador = new RecalculadorDeArticulo(dependencias.almacen);
  }

  /**
   * @throws RecursoNoEncontrado si la bodega no existe o el usuario no la ve.
   * @throws ElementoInactivo si la bodega está inactiva.
   * @throws DocumentoInvalido si la fecha es futura.
   * @throws FechaAnteriorAlInicio si es anterior al inicio de la empresa.
   * @throws MesCerrado si el mes ya se cerró.
   * @throws ExistenciaNegativa si alguna existencia quedaría negativa en alguna fecha.
   */
  async registrar(operador: Operador, { plan }: PedidoDeRegistro): Promise<ResultadoDeRegistro> {
    const { almacen } = this.dependencias;
    await almacen.bloquear(plan.renglones.map((renglon) => renglon.articuloId));
    if (plan.bodegaId) await this.revisarBodega(plan.bodegaId);
    await this.revisarFecha(operador, plan.fecha);
    const metodo = await this.metodo.usarParaMover(operador, plan.fecha);
    const documento = await this.guardarDocumento(plan);
    const nuevos = await almacen.agregarMovimientos(plan.renglones.map((r) => nuevoMovimiento(documento, r)));
    const eventos = await this.recalcularArticulos({ operador, documento, nuevos, metodo });
    await this.dependencias.existencias.mover(cambiosDeExistencia(documento, plan.renglones));
    return { documento, movimientos: await almacen.movimientosDelDocumento(documento.id), eventosDeRecalculo: eventos };
  }

  private async revisarBodega(bodegaId: string): Promise<void> {
    const bodega = await this.dependencias.catalogos.bodega(bodegaId);
    if (!bodega) throw new RecursoNoEncontrado('La bodega');
    if (!bodega.activo) throw new ElementoInactivo(`La bodega ${bodega.nombre}`);
  }

  private async revisarFecha(operador: Operador, fecha: string): Promise<void> {
    const { reloj, cargaInicial, cierres } = this.dependencias;
    if (fecha > (await reloj.hoy(operador))) throw new DocumentoInvalido('La fecha no puede ser futura.');
    const { fechaDeInicio } = await cargaInicial.obtener(operador);
    if (fechaDeInicio && fecha < fechaDeInicio) throw new FechaAnteriorAlInicio(fechaDeInicio);
    if (await cierres.estaCerrado(periodoDe(fecha))) throw new MesCerrado(periodoDe(fecha));
  }

  private async guardarDocumento(plan: PlanDeDocumento): Promise<DocumentoGuardado> {
    const { correlativos, documentos } = this.dependencias;
    const { numero } = await correlativos.siguiente(`inventarios.${plan.clase}`, plan.fecha);
    const { renglones, avisos, ...datos } = plan;
    const documento: DocumentoGuardado = {
      ...datos,
      documentoDeCompraId: datos.documentoDeCompraId ?? null,
      documentoRelacionadoId: datos.documentoRelacionadoId ?? null,
      bodegaDeDestinoId: datos.bodegaDeDestinoId ?? null,
      estadoDeTraslado: datos.estadoDeTraslado ?? null,
      id: randomUUID(),
      numero,
      requiereFactura: false,
      estado: 'vigente',
    };
    await documentos.agregar(documento);
    return documento;
  }

  /** Cada artículo se recalcula una vez, en orden por id; los eventos de lo que cambió salen después de confirmar. */
  private async recalcularArticulos(datos: {
    operador: Operador;
    documento: DocumentoGuardado;
    nuevos: readonly MovimientoDelKardex[];
    metodo: MetodoDeCosteo;
  }): Promise<EventoDominio[]> {
    const { operador, documento, nuevos, metodo } = datos;
    const causa = 'registro_con_fecha_anterior';
    const movimientosNuevos = new Set(nuevos.map((m) => m.id));
    const eventos: EventoDominio[] = [];
    for (const articuloId of [...new Set(nuevos.map((m) => m.articuloId))].sort()) {
      const pedido = { articuloId, metodo, causa, documentoCausaId: documento.id, movimientosNuevos } as const;
      const cambios = await this.recalculador.recalcular(pedido);
      const evento = eventoDeRecalculo({ empresaId: operador.empresaId, causa, documentoId: documento.id, ...cambios });
      if (evento) eventos.push(evento);
    }
    return eventos;
  }
}
