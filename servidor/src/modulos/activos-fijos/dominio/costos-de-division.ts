import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Costo, type CostoId, type PropiedadesDeCosto } from './costo.js';
import type { CifrasDeDivision } from './depreciacion/division.js';

export interface EntradaDeCostosDeDivision {
  empresaId: Identificador<'Empresa'>;
  divisionId: string;
  activoOrigenId: string;
  activoNuevoId: string;
  fecha: string;
  /** Lo que se lleva el activo nuevo. */
  nuevo: CifrasDeDivision;
  descripcion: string;
}

const MOTIVO_FUERA_DEL_LIBRO = 'Parte de un costo que no aplica al libro fiscal (división)';

type ParteComun = Omit<PropiedadesDeCosto, 'id' | 'activoId' | 'claseDeCosto' | 'montoCentavos'>;

/** Lo que tienen igual el costo cedido y el recibido de un mismo grupo. */
function parteComun(entrada: EntradaDeCostosDeDivision, aplica: boolean): ParteComun {
  return {
    empresaId: entrada.empresaId,
    origen: 'division',
    documentoDeCompraId: null,
    lineaDeDocumentoId: null,
    mejoraId: null,
    divisionId: entrada.divisionId,
    fecha: entrada.fecha,
    aplicaAlLibroFiscal: aplica,
    motivoFueraDelLibroFiscal: aplica ? null : MOTIVO_FUERA_DEL_LIBRO,
    noEsEdificacion: false,
    documentoDeSoporte: null,
    archivoId: null,
    descripcion: entrada.descripcion,
    estado: 'vigente',
    anuladoEn: null,
    anuladoPor: null,
    motivoDeAnulacion: null,
  };
}

function costo(
  comun: ParteComun,
  resto: Pick<PropiedadesDeCosto, 'activoId' | 'claseDeCosto' | 'montoCentavos'>,
): Costo {
  return Costo.reconstruir({ ...comun, ...resto, id: Identificador.nuevo() as CostoId });
}

function parDeCostos(entrada: EntradaDeCostosDeDivision, montoCentavos: number, aplica: boolean): Costo[] {
  if (montoCentavos <= 0) return [];
  const comun = parteComun(entrada, aplica);
  return [
    costo(comun, { activoId: entrada.activoOrigenId, claseDeCosto: 'division_cedida', montoCentavos: -montoCentavos }),
    costo(comun, { activoId: entrada.activoNuevoId, claseDeCosto: 'division_recibida', montoCentavos }),
  ];
}

/**
 * Los costos de una división (§5.4): por cada grupo (los que aplican al libro fiscal y los que no) con monto, uno
 * negativo `division_cedida` en el origen y uno positivo `division_recibida` en el activo nuevo. Así el costo de cada
 * activo sigue siendo Σ de sus costos vigentes y la regla de la línea del libro no cambia (no llevan línea).
 */
export function costosDeDivision(entrada: EntradaDeCostosDeDivision): Costo[] {
  return [
    ...parDeCostos(entrada, entrada.nuevo.costoQueAplicaCentavos, true),
    ...parDeCostos(entrada, entrada.nuevo.costoQueNoAplicaCentavos, false),
  ];
}
