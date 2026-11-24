import { DocumentoInvalido } from './errores-de-kardex.js';
import { exigirRenglones, textoOpcional, type EscritoComun, type PlanDeDocumento } from './plan-de-documento.js';

export type SaldoInicialEscrito = EscritoComun;

function exigirCostosYCapas(datos: SaldoInicialEscrito): void {
  for (const renglon of datos.renglones) {
    if (renglon.costoTotal < 0n) throw new DocumentoInvalido('El costo no puede ser negativo.');
    if (renglon.fechaDeCapa && renglon.fechaDeCapa > datos.fecha) {
      throw new DocumentoInvalido(
        'La fecha de la capa debe ser anterior a la fecha de inicio de la empresa: es el día de la compra real.',
      );
    }
  }
}

/**
 * Revisa el documento de saldo inicial de una bodega (§8): entradas a su costo escrito, con la fecha del día anterior al
 * inicio de la empresa. El costo cero se admite (la revisión del cierre de la carga avisa); cada renglón puede traer la
 * fecha de su capa (la compra real) y, si no, usa la del documento. No lleva soporte ni causa.
 * @throws DocumentoInvalido si no hay renglones, una cantidad no es positiva, un costo es negativo o una capa es posterior.
 */
export function planDeSaldoInicial(datos: SaldoInicialEscrito): PlanDeDocumento {
  exigirRenglones(datos.renglones);
  exigirCostosYCapas(datos);
  return {
    clase: 'saldo_inicial',
    fecha: datos.fecha,
    bodegaId: datos.bodegaId,
    causa: null,
    destino: null,
    conceptoDeGastoId: null,
    localidadId: null,
    departamentoId: null,
    activoFijoId: null,
    entregadoA: null,
    soporte: null,
    observaciones: textoOpcional(datos.observaciones, 'Observaciones', 500),
    renglones: datos.renglones.map((renglon) => ({ ...renglon, fechaDeCapa: renglon.fechaDeCapa ?? datos.fecha })),
    avisos: [],
  };
}
