import { calcularLineas, type LineaCalculada, type LineaEscrita } from './calculo-de-linea.js';
import { esFamiliaSinIva } from './familia-del-documento.js';
import { determinarMotivoSinCredito } from './motivo-sin-credito.js';
import { avisosDelPeriodo, exigirPeriodoValido } from './periodo-del-libro.js';
import { exigirNotaCoherenteConLaFactura, type DatosDeLaFacturaAfectada } from './reglas-de-notas-de-credito.js';
import { exigirNotaDeDebitoCoherente } from './reglas-de-notas-de-debito.js';
import { esNota, MOTIVOS_SIN_IVA, type MotivoSinCredito, type TipoDeDocumento } from './tipos-de-documento.js';
import { totalesDelDocumento, type TotalesDelDocumento } from './totales-del-documento.js';

/** Lo que escribe el usuario en el documento (las fechas como `AAAA-MM-DD`; los montos, en centavos). */
export interface DatosParaCalcular extends DatosDeLaFacturaAfectada {
  tipo: TipoDeDocumento;
  muestraEnReportesSat: boolean;
  noVinculado: boolean;
  /** La empresa acredita el IVA de sus compras en el período (`DatosFiscalesDeEmpresa.daCreditoFiscal()`). */
  empresaConCreditoFiscal: boolean;
  /** La empresa paga el ISR sobre utilidades (`tieneIsrSobreUtilidades()`): cambia el texto de los avisos. */
  empresaConIsrSobreUtilidades: boolean;
  fechaDeEmision: string;
  fechaDeRecepcion: string;
  /** Primer día del mes del libro. */
  periodo: string;
  lineas: readonly LineaEscrita[];
  /** Tasa del IVA en centésimas (`aCentesimasDeConfiguracion(config 'libro-de-compras.iva.tasa')`). */
  tasaDeIva: number;
  ivaDeLaFel?: number | null;
  /** Primer día del mes actual (lo da quien llama): con él se avisa si el período ya pasó. */
  mesActual: string;
}

/** Todo lo que se guarda del documento y sus líneas, más los avisos para el usuario. */
export interface DocumentoCalculado {
  lineas: LineaCalculada[];
  totales: TotalesDelDocumento;
  motivoSinCredito: MotivoSinCredito | null;
  avisos: string[];
}

const IVA_AL_COSTO: readonly (MotivoSinCredito | null)[] = [
  'fuera_de_plazo',
  'no_vinculado',
  'empresa_sin_credito',
  'nota_de_debito_tardia',
];

/** Una nota se valida contra su factura: exenta, topes del IVA y, la de débito, su fecha y las familias sin IVA. */
function validarNota(datos: DatosParaCalcular, iva: number): void {
  if (!esNota(datos.tipo)) return;
  if (datos.tipo === 'nota_de_debito') exigirNotaDeDebitoCoherente(datos);
  exigirNotaCoherenteConLaFactura(datos, { tipo: datos.tipo, iva });
}

/** Sin IVA: casilla SAT desmarcada, familias sin IVA (o nota de una factura de ellas) y recibos. */
function cobraIva(datos: DatosParaCalcular): boolean {
  const notaDeFamiliaSinIva = !!datos.motivoDeLaFactura && MOTIVOS_SIN_IVA.includes(datos.motivoDeLaFactura);
  return datos.muestraEnReportesSat && !esFamiliaSinIva(datos.tipo) && !notaDeFamiliaSinIva;
}

/**
 * Calcula el documento completo: valida el período, calcula y reparte el IVA entre las
 * líneas, decide el motivo sin crédito fiscal con los totales resultantes y, si el IVA va
 * al costo (`fuera_de_plazo`, `no_vinculado`, `empresa_sin_credito` o `nota_de_debito_tardia`), lo pasa a
 * `ivaNoAcreditable` en cada línea.
 * La nota de crédito hereda el motivo de su factura y se valida contra ella (exenta, IVA acumulado); la nota de
 * débito se evalúa como un documento propio y se valida contra su factura (exenta, fecha, familia sin IVA).
 * Es lo que usan `POST …/documentos/calcular` y `RegistrarDocumento`.
 */
export function calcularDocumento(datos: DatosParaCalcular): DocumentoCalculado {
  exigirPeriodoValido(datos);
  const calculadas = calcularLineas(datos.lineas, {
    cobraIva: cobraIva(datos),
    tasaDeIva: datos.tasaDeIva,
    ivaNoAcreditable: false,
    ivaDeLaFel: datos.ivaDeLaFel,
  });
  const { motivo, avisos } = determinarMotivoSinCredito({
    ...datos,
    ...totalesDelDocumento(calculadas),
  });
  validarNota(datos, totalesDelDocumento(calculadas).iva);
  const lineas = IVA_AL_COSTO.includes(motivo)
    ? calculadas.map((linea) => ({ ...linea, ivaNoAcreditable: linea.iva }))
    : calculadas;
  return {
    lineas,
    totales: totalesDelDocumento(lineas),
    motivoSinCredito: motivo,
    avisos: [...avisos, ...avisosDelPeriodo(datos)],
  };
}
