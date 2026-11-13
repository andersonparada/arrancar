import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import {
  exigirCargoDisponible,
  exigirFechaDeAplicacion,
  exigirLineasValidas,
  exigirMontosQueCaben,
  exigirNotaQueSeAplica,
  referenciaDelAcuerdo,
  type CargoConSaldoParaAplicar,
  type NotaConSaldoParaAplicar,
} from '../../../dominio/aplicacion-manual.js';
import { CargoNoDisponible } from '../../../dominio/errores-de-aplicaciones.js';
import type { AplicacionACargo } from '../../../dominio/reparto-de-nota-de-credito.js';
import type { FichaDelDocumentoPorPagarDto } from '../../dto/documento-por-pagar.dto.js';
import { bloquear } from '../acciones/dependencias-de-acciones.js';
import { puntoDeVistaDe } from '../consultas/dependencias-de-consultas.js';
import { fichaDeUnDocumento } from '../consultas/ficha-de-un-documento.js';
import { filaExistente, saldoDeLaFila, type DependenciasDeAplicaciones } from './dependencias-de-aplicaciones.js';

export interface PeticionDeAplicacion {
  notaId: string;
  /** La del acuerdo (`AAAA-MM-DD`); hoy si falta. */
  fecha?: string;
  referencia?: string | null;
  /** Dinero como texto con dos decimales. */
  aplicaciones: Array<{ cargoId: string; monto: string }>;
}

/**
 * Aplica a mano el saldo libre de una nota de crédito a uno o varios cargos del mismo proveedor, todo o nada, en una sola
 * transacción. Pide la carga inicial (bloqueo compartido) antes de bloquear nada aquí, luego bloquea la nota y después
 * los cargos en orden de id. Es un alta (queda `creado_por`): no audita ni publica eventos.
 */
export class AplicarNota {
  constructor(private readonly dependencias: DependenciasDeAplicaciones) {}

  /**
   * @throws RecursoNoEncontrado si la nota no existe.
   * @throws NoEsNotaConSaldo, CargoNoDisponible, CargoRepetido, MontoDeAplicacionInvalido, AplicacionMayorQueElSaldo,
   * AplicacionMayorQueElSaldoLibre, FechaDeAplicacionInvalida, ReferenciaDeAplicacionInvalida
   */
  ejecutar(operador: Operador, pedido: PeticionDeAplicacion): Promise<FichaDelDocumentoPorPagarDto> {
    const { unidadDeTrabajo, cargaInicial, aplicaciones } = this.dependencias;
    const lineas = pedido.aplicaciones.map(({ cargoId, monto }) => ({ cargoId, montoCentavos: aCentavos(monto) }));
    exigirLineasValidas(lineas);
    const referencia = referenciaDelAcuerdo(pedido.referencia);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { fechaDeInicio } = await cargaInicial.obtener(operador);
      const nota = await this.cargarNota(pedido.notaId);
      const cargos = await this.cargarCargos(nota, lineas);
      exigirMontosQueCaben(nota, cargos, lineas);
      const fecha = await this.fechaValida(operador, pedido.fecha, { nota, cargos, fechaDeInicio });
      await aplicaciones.agregar(nota.documento, lineas, { forma: 'manual', fecha, referencia });
      return this.ficha(operador, pedido.notaId, fechaDeInicio);
    });
  }

  private async cargarNota(notaId: string): Promise<NotaConSaldoParaAplicar> {
    const { documentos, consultas } = this.dependencias;
    await bloquear(documentos, notaId);
    const fila = await filaExistente(consultas, notaId);
    exigirNotaQueSeAplica(fila.documento);
    return { documento: fila.documento, saldoLibreCentavos: saldoDeLaFila(fila) };
  }

  /** Bloquea los cargos en orden de id (para no cruzarse con otra aplicación) y los lee ya bloqueados. */
  private async cargarCargos(
    nota: NotaConSaldoParaAplicar,
    lineas: readonly AplicacionACargo[],
  ): Promise<Map<string, CargoConSaldoParaAplicar>> {
    const { documentos, consultas } = this.dependencias;
    const indices = new Map(lineas.map(({ cargoId }, indice) => [cargoId, indice]));
    const cargos = new Map<string, CargoConSaldoParaAplicar>();
    for (const id of [...indices.keys()].sort()) {
      const indice = indices.get(id)!;
      if (!(await documentos.buscarPorId(id, true))) throw new CargoNoDisponible(null, indice);
      const fila = await filaExistente(consultas, id);
      exigirCargoDisponible(nota.documento, fila.documento, indice);
      cargos.set(id, { documento: fila.documento, saldoCentavos: saldoDeLaFila(fila) });
    }
    return cargos;
  }

  private async fechaValida(
    operador: Operador,
    pedida: string | undefined,
    {
      nota,
      cargos,
      fechaDeInicio,
    }: { nota: NotaConSaldoParaAplicar; cargos: Map<string, unknown>; fechaDeInicio: string | null },
  ): Promise<string> {
    const hoy = await this.dependencias.reloj.hoy(operador);
    const fecha = pedida ?? hoy;
    const ids = [nota.documento.id, ...cargos.keys()];
    const entradas = await this.dependencias.fechasDeEntrada.deDocumentos(ids);
    exigirFechaDeAplicacion(fecha, hoy, { recepciones: ids.map((id) => entradas.get(id) ?? null), fechaDeInicio });
    return fecha;
  }

  private async ficha(
    operador: Operador,
    notaId: string,
    fechaDeInicio: string | null,
  ): Promise<FichaDelDocumentoPorPagarDto> {
    const { consultas, reloj, topeDeDiferencia } = this.dependencias;
    const extras = { fechaDeInicio, topeDiferenciaMenorCentavos: await topeDeDiferencia.centavos(operador) };
    const fila = await filaExistente(consultas, notaId);
    return fichaDeUnDocumento(consultas, fila, { vista: await puntoDeVistaDe(reloj, operador), extras });
  }
}
