import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/**
 * Por qué un documento queda fuera del libro (casilla «Se muestra en reportes SAT» desmarcada). Solo se
 * desmarcan los documentos sin FEL a nombre de la empresa: toda FEL al NIT de la empresa va en el libro,
 * porque la SAT la tiene en sus DTE recibidos y la cruza con él.
 */
export const MOTIVOS_FUERA_DEL_LIBRO = ['sin_fel', 'fel_a_consumidor_final', 'fel_a_otro_nit'] as const;
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

/** Lo que el dominio sabe del proveedor (de `terceros`) para dar los avisos. */
export interface ProveedorParaFueraDelLibro {
  tipoDePersona: 'individual' | 'juridica';
  /** El NIT del tercero, ya normalizado; `null` si no tiene. */
  nit: string | null;
}

export interface DatosDeFueraDelLibro {
  /** `null` = el documento va en el libro. */
  motivo: MotivoFueraDelLibro | null;
  autorizacionFel: string | null;
  /** NIT del receptor que dice el documento, normalizado. */
  nitReceptor: string | null;
  /** NIT de la empresa activa, normalizado. */
  nitDeLaEmpresa: string | null;
  proveedor: ProveedorParaFueraDelLibro;
}

export interface ResultadoFueraDelLibro {
  /** Lo que se guarda en `documentos.muestra_en_reportes_sat`: solo es `false` con motivo. */
  muestraEnReportesSat: boolean;
  /** Avisos que no bloquean, para mostrar al usuario. */
  avisos: string[];
}

export const AVISO_NO_DEDUCIBLE = 'Sin un documento válido, este gasto no es deducible del ISR.';
export const AVISO_FACTURA_ESPECIAL =
  'La ley obliga a emitir factura especial (Ley del IVA art. 52); sin ella el gasto no es deducible del ISR.';

function exigirCoherenciaConLaFel(datos: DatosDeFueraDelLibro): void {
  const tieneFel = datos.autorizacionFel !== null;
  if (datos.motivo === 'sin_fel' && tieneFel) {
    throw new MotivoFueraDelLibroIncoherente('Un documento sin FEL no puede traer número de autorización.');
  }
  if (datos.motivo !== 'sin_fel' && !tieneFel) {
    throw new MotivoFueraDelLibroIncoherente('Escriba la autorización de la FEL.');
  }
}

/** Una persona individual sin NIT no está inscrita: la ley obliga a emitirle factura especial. */
const seSugiereFacturaEspecial = (proveedor: ProveedorParaFueraDelLibro): boolean =>
  proveedor.tipoDePersona === 'individual' && proveedor.nit === null;

/**
 * Regla pura de la casilla «Se muestra en reportes SAT»: dice si el documento puede quedar fuera del libro y
 * con qué avisos. Sin motivo va en el libro y no hay avisos.
 * @throws MotivoFueraDelLibroIncoherente si el motivo contradice la autorización FEL.
 * @throws FelAlNitDeLaEmpresaNoSeDesmarca si es una FEL emitida al NIT de la empresa.
 */
export function evaluarFueraDelLibro(datos: DatosDeFueraDelLibro): ResultadoFueraDelLibro {
  if (datos.motivo === null) return { muestraEnReportesSat: true, avisos: [] };
  exigirCoherenciaConLaFel(datos);
  const esAlNitDeLaEmpresa = datos.nitReceptor !== null && datos.nitReceptor === datos.nitDeLaEmpresa;
  if (datos.motivo !== 'sin_fel' && esAlNitDeLaEmpresa) throw new FelAlNitDeLaEmpresaNoSeDesmarca();
  const avisos = [AVISO_NO_DEDUCIBLE];
  if (seSugiereFacturaEspecial(datos.proveedor)) avisos.push(AVISO_FACTURA_ESPECIAL);
  return { muestraEnReportesSat: false, avisos };
}
