import { normalizarSerieONumero } from './documento-de-compra.js';
import { FacturaAnteriorInvalida } from './errores-de-factura-anterior.js';
import {
  FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO,
  INICIO_DEL_PRIMARIO_Y_PECUARIO,
  MOTIVO_DE_LA_FAMILIA,
  type MotivoSinCredito,
  type TipoDeDocumento,
} from './tipos-de-documento.js';

/** Los datos de una factura del sistema anterior, tal como se guardan. Montos en centavos. */
export interface DatosDeFacturaAnterior {
  /** Una familia de factura que admite notas. */
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  autorizacionFel: string | null;
  fechaEmision: string;
  total: number;
  iva: number;
  /** Notas de débito del sistema anterior sobre esta factura: suben el tope de las notas de crédito. */
  notasDeDebitoAnterioresTotal: number;
  notasDeDebitoAnterioresIva: number;
  /** Por qué no dio crédito fiscal; `null` si lo dio. */
  motivoSinCredito: MotivoSinCredito | null;
  /** Obligatorio con `otra_causa_sin_credito`. */
  detalleDelMotivo: string | null;
}

/** Una factura anterior guardada (una fila por factura, no por nota). */
export interface FacturaAnterior extends DatosDeFacturaAnterior {
  id: string;
  proveedorId: string;
}

/** Los motivos que puede escribir el usuario; el de una familia sin IVA lo pone el servidor. */
export const MOTIVOS_DE_LA_FACTURA_ANTERIOR: readonly MotivoSinCredito[] = [
  'fuera_de_plazo',
  'no_vinculado',
  'exento',
  'empresa_sin_credito',
  'otra_causa_sin_credito',
];

const MAXIMO_DEL_DETALLE = 500;

function exigirMontos(datos: DatosDeFacturaAnterior): void {
  if (datos.total <= 0) throw new FacturaAnteriorInvalida('El total de la factura debe ser mayor que cero.', 'total');
  if (datos.iva < 0) throw new FacturaAnteriorInvalida('El IVA de la factura no puede ser negativo.', 'iva');
  if (datos.iva > datos.total) {
    throw new FacturaAnteriorInvalida('El IVA de la factura no puede ser mayor que su total.', 'iva');
  }
  const { notasDeDebitoAnterioresTotal: total, notasDeDebitoAnterioresIva: iva } = datos;
  if (total < 0 || iva < 0) {
    throw new FacturaAnteriorInvalida(
      'El total y el IVA de las notas de débito anteriores no pueden ser negativos.',
      'notasDeDebitoAnterioresIva',
    );
  }
  if (iva > total) {
    throw new FacturaAnteriorInvalida(
      'El IVA de las notas de débito anteriores no puede ser mayor que su total.',
      'notasDeDebitoAnterioresIva',
    );
  }
}

/** El motivo de la familia sin IVA manda; si no, el que escribió el usuario, que debe ser uno de los permitidos. */
function motivoDeLaFactura(datos: DatosDeFacturaAnterior): MotivoSinCredito | null {
  const deLaFamilia = MOTIVO_DE_LA_FAMILIA[datos.tipo];
  if (deLaFamilia) return deLaFamilia;
  if (datos.motivoSinCredito !== null && !MOTIVOS_DE_LA_FACTURA_ANTERIOR.includes(datos.motivoSinCredito)) {
    throw new FacturaAnteriorInvalida('Ese motivo no corresponde a una factura anterior.', 'motivoSinCredito');
  }
  return datos.motivoSinCredito;
}

function exigirSinIvaSiCorresponde(datos: DatosDeFacturaAnterior, motivo: MotivoSinCredito | null): void {
  const sinIva = motivo === 'exento' || (motivo !== null && motivo === MOTIVO_DE_LA_FAMILIA[datos.tipo]);
  if (sinIva && (datos.iva > 0 || datos.notasDeDebitoAnterioresIva > 0)) {
    throw new FacturaAnteriorInvalida('Una factura sin IVA (exenta o de su familia) no lleva IVA.', 'iva');
  }
}

function detalleDelMotivo(datos: DatosDeFacturaAnterior, motivo: MotivoSinCredito | null): string | null {
  if (motivo !== 'otra_causa_sin_credito') return null;
  const detalle = datos.detalleDelMotivo?.trim() ?? '';
  if (detalle.length === 0 || detalle.length > MAXIMO_DEL_DETALLE) {
    throw new FacturaAnteriorInvalida(
      'Explique en 1 a 500 caracteres por qué no dio crédito fiscal.',
      'detalleDelMotivo',
    );
  }
  return detalle;
}

function exigirFamiliaYFecha(datos: DatosDeFacturaAnterior): void {
  if (!FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO.includes(datos.tipo)) {
    throw new FacturaAnteriorInvalida('La factura debe ser de una familia de factura que admita notas.', 'tipo');
  }
  if (datos.tipo === 'factura_primario_pecuario' && datos.fechaEmision < INICIO_DEL_PRIMARIO_Y_PECUARIO) {
    throw new FacturaAnteriorInvalida('Esta factura no existía en esa fecha.', 'fechaEmision');
  }
}

/**
 * Deja la factura anterior como se guarda (serie y número en mayúsculas y sin espacios, motivo y detalle coherentes) o
 * dice qué dato no sirve.
 * @throws FacturaAnteriorInvalida.
 */
export function normalizarFacturaAnterior(datos: DatosDeFacturaAnterior): DatosDeFacturaAnterior {
  exigirFamiliaYFecha(datos);
  exigirMontos(datos);
  const motivoSinCredito = motivoDeLaFactura(datos);
  exigirSinIvaSiCorresponde(datos, motivoSinCredito);
  const serie = datos.serie ? normalizarSerieONumero(datos.serie) : '';
  return {
    ...datos,
    serie: serie || null,
    numero: normalizarSerieONumero(datos.numero),
    motivoSinCredito,
    detalleDelMotivo: detalleDelMotivo(datos, motivoSinCredito),
  };
}

const CAMPOS_DE_LA_FACTURA_ANTERIOR = [
  'tipo',
  'numero',
  'autorizacionFel',
  'fechaEmision',
  'total',
  'iva',
  'notasDeDebitoAnterioresTotal',
  'notasDeDebitoAnterioresIva',
  'motivoSinCredito',
] as const satisfies readonly (keyof DatosDeFacturaAnterior)[];

/** Las dos descripciones dicen lo mismo en todo lo que se guarda. */
export function tienenLosMismosDatos(a: DatosDeFacturaAnterior, b: DatosDeFacturaAnterior): boolean {
  return (
    CAMPOS_DE_LA_FACTURA_ANTERIOR.every((campo) => a[campo] === b[campo]) &&
    (a.serie ?? '') === (b.serie ?? '') &&
    (a.detalleDelMotivo ?? '') === (b.detalleDelMotivo ?? '')
  );
}
