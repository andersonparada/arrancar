import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import type { TipoDeDocumento, TipoDte } from './tipos-de-documento.js';

/**
 * Por qué un documento queda fuera del libro (casilla «Se muestra en reportes SAT» desmarcada). Solo se
 * desmarcan los documentos sin FEL a nombre de la empresa: toda **factura** FEL al NIT de la empresa va en el libro,
 * porque la SAT la tiene en sus DTE recibidos y la cruza con él. La excepción es el recibo FEL (`RECI`, `RDON`) al
 * NIT de la empresa (`recibo_fel`): no es una compra gravada, así que queda fuera del libro de IVA, sin crédito ni
 * retenciones. Un recibo FEL a **otro NIT** va con `fel_a_otro_nit`, como una factura.
 */
export const MOTIVOS_FUERA_DEL_LIBRO = ['sin_fel', 'fel_a_consumidor_final', 'fel_a_otro_nit', 'recibo_fel'] as const;
export type MotivoFueraDelLibro = (typeof MOTIVOS_FUERA_DEL_LIBRO)[number];

/** Una FEL emitida al NIT de la empresa no puede quedar fuera del libro. */
export class FelAlNitDeLaEmpresaNoSeDesmarca extends ReglaDeNegocioInfringida {
  readonly codigo = 'fel_al_nit_de_la_empresa_no_se_desmarca';

  constructor() {
    super(
      'La FEL está a nombre de la empresa: la SAT la tiene en sus documentos recibidos, así que debe ir en el libro.',
    );
  }
}

/** El motivo no concuerda con la autorización FEL (sin FEL no hay autorización; con FEL, es obligatoria). */
export class MotivoFueraDelLibroIncoherente extends DatoInvalido {
  readonly codigo = 'motivo_fuera_del_libro_incoherente';
}

/** El motivo `recibo_fel` solo vale para un recibo `RECI` o `RDON` emitido al NIT de la empresa. */
export class ReciboFelIncoherente extends DatoInvalido {
  readonly codigo = 'recibo_fel_incoherente';
}

/** Lo que el dominio sabe del proveedor (de `terceros`) para dar los avisos. */
export interface ProveedorParaFueraDelLibro {
  tipoDePersona: 'individual' | 'juridica';
  /** El NIT del tercero, ya normalizado; `null` si no tiene. */
  nit: string | null;
}

export interface DatosDeFueraDelLibro {
  tipo: TipoDeDocumento;
  /** El código de la SAT; `null` sin FEL. */
  tipoDte: TipoDte | null;
  /** `null` = el documento va en el libro. */
  motivo: MotivoFueraDelLibro | null;
  autorizacionFel: string | null;
  /** NIT del receptor que dice el documento, normalizado. */
  nitReceptor: string | null;
  /** NIT de la empresa activa, normalizado. */
  nitDeLaEmpresa: string | null;
  proveedor: ProveedorParaFueraDelLibro;
  /** Sin ISR sobre utilidades los avisos de deducibilidad quedan sin la parte del ISR. */
  empresaConIsrSobreUtilidades: boolean;
}

export interface ResultadoFueraDelLibro {
  /** Lo que se guarda en `documentos.muestra_en_reportes_sat`: solo es `false` con motivo. */
  muestraEnReportesSat: boolean;
  /** Avisos que no bloquean, para mostrar al usuario. */
  avisos: string[];
}

export const AVISO_NO_DEDUCIBLE = 'Sin un documento válido, este gasto no es deducible del ISR.';
export const AVISO_NO_DEDUCIBLE_SIN_ISR = 'Sin un documento válido, este gasto no queda respaldado en la contabilidad.';
export const AVISO_DE_DONACION =
  'Donación: deducible solo en el ISR sobre utilidades, a entidades autorizadas y con límite anual; no es una compra.';
export const AVISO_FACTURA_ESPECIAL =
  'La ley obliga a emitir factura especial (Ley del IVA art. 52); sin ella el gasto no es deducible del ISR.';

/** Desde este total (Q2,500.00, en centavos) una FEL a consumidor final merece un aviso. */
export const UMBRAL_DE_CONSUMIDOR_FINAL = 250000;
export const AVISO_DE_CONSUMIDOR_FINAL_GRANDE =
  'La FEL a consumidor final es de Q2,500.00 o más: desde ese monto la factura debe llevar el NIT del comprador. Pídale al proveedor que la emita a nombre de la empresa; si no, el gasto puede no ser deducible. Consulte a su contador.';
export const AVISO_DE_CONSUMIDOR_FINAL_GRANDE_SIN_ISR =
  'La FEL a consumidor final es de Q2,500.00 o más: desde ese monto la factura debe llevar el NIT del comprador. Pídale al proveedor que la emita a nombre de la empresa. Consulte a su contador.';

function exigirCoherenciaConLaFel(datos: DatosDeFueraDelLibro): void {
  const tieneFel = datos.autorizacionFel !== null;
  if (datos.motivo === 'sin_fel' && tieneFel) {
    throw new MotivoFueraDelLibroIncoherente('Un documento sin FEL no puede traer número de autorización.');
  }
  if (datos.motivo !== 'sin_fel' && !tieneFel) {
    throw new MotivoFueraDelLibroIncoherente('Escriba la autorización de la FEL.');
  }
}

/** Un recibo FEL (`RECI`, `RDON`) a la empresa: fuera del libro de IVA; la donación lleva su aviso. */
function evaluarReciboFel(datos: DatosDeFueraDelLibro): ResultadoFueraDelLibro {
  const esReciboFel = datos.tipo === 'recibo' && (datos.tipoDte === 'RECI' || datos.tipoDte === 'RDON');
  if (!esReciboFel) throw new ReciboFelIncoherente('El motivo «recibo FEL» es solo para un recibo RECI o RDON.');
  exigirCoherenciaConLaFel(datos);
  if (datos.nitReceptor !== null && datos.nitReceptor !== datos.nitDeLaEmpresa) {
    throw new ReciboFelIncoherente(
      'El recibo FEL debe estar a nombre de la empresa; si está a otro NIT, elija «La FEL está a nombre de otro NIT».',
    );
  }
  return { muestraEnReportesSat: false, avisos: datos.tipoDte === 'RDON' ? [AVISO_DE_DONACION] : [] };
}

/** Una persona individual sin NIT no está inscrita: la ley obliga a emitirle factura especial. */
const seSugiereFacturaEspecial = (proveedor: ProveedorParaFueraDelLibro): boolean =>
  proveedor.tipoDePersona === 'individual' && proveedor.nit === null;

/**
 * Regla pura de la casilla «Se muestra en reportes SAT»: dice si el documento puede quedar fuera del libro y
 * con qué avisos. Sin motivo va en el libro y no hay avisos.
 * @throws MotivoFueraDelLibroIncoherente si el motivo contradice la autorización FEL.
 * @throws FelAlNitDeLaEmpresaNoSeDesmarca si es una FEL emitida al NIT de la empresa.
 * @throws ReciboFelIncoherente si `recibo_fel` no es un RECI o RDON a nombre de la empresa.
 */
export function evaluarFueraDelLibro(datos: DatosDeFueraDelLibro): ResultadoFueraDelLibro {
  if (datos.motivo === null) return { muestraEnReportesSat: true, avisos: [] };
  if (datos.motivo === 'recibo_fel') return evaluarReciboFel(datos);
  exigirCoherenciaConLaFel(datos);
  const esAlNitDeLaEmpresa = datos.nitReceptor !== null && datos.nitReceptor === datos.nitDeLaEmpresa;
  if (datos.motivo !== 'sin_fel' && esAlNitDeLaEmpresa) throw new FelAlNitDeLaEmpresaNoSeDesmarca();
  const avisos = [datos.empresaConIsrSobreUtilidades ? AVISO_NO_DEDUCIBLE : AVISO_NO_DEDUCIBLE_SIN_ISR];
  if (seSugiereFacturaEspecial(datos.proveedor)) avisos.push(AVISO_FACTURA_ESPECIAL);
  return { muestraEnReportesSat: false, avisos };
}

/** Aviso (no error) de una FEL a consumidor final de Q2,500.00 o más; `total` en centavos. */
export function avisosDeConsumidorFinal(
  { motivo, total }: { motivo: MotivoFueraDelLibro | null; total: number },
  empresaConIsrSobreUtilidades: boolean,
): string[] {
  if (motivo !== 'fel_a_consumidor_final' || total < UMBRAL_DE_CONSUMIDOR_FINAL) return [];
  return [empresaConIsrSobreUtilidades ? AVISO_DE_CONSUMIDOR_FINAL_GRANDE : AVISO_DE_CONSUMIDOR_FINAL_GRANDE_SIN_ISR];
}
