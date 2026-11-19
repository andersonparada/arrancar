import type { ClaseDeComprobante } from '../../dominio/comprobantes.js';
import type { FormaDeReposicion } from '../../dominio/reposiciones.js';

/** Un comprobante en un reporte. El dinero viaja como texto con dos decimales; lo que resta va con signo negativo. */
export interface FilaDeComprobanteDto {
  id: string;
  clase: ClaseDeComprobante;
  /** «Factura A-12», «Vale 5», «Faltante de arqueo»… */
  documento: string;
  proveedor: string;
  fecha: string;
  concepto: string;
  deducible: boolean;
  monto: string;
  /** Solo en CC-R3: por qué no tiene documento fiscal válido. */
  motivo: string | null;
}

/** Los comprobantes de un fondo (CC-R1 y CC-R3), con el subtotal de cada parte. */
export interface GrupoDeFondoDto {
  fondoId: string;
  fondoNombre: string;
  cantidad: number;
  deducible: string;
  noDeducible: string;
  total: string;
  filas: FilaDeComprobanteDto[];
}

export interface TotalDeComprobantesDto {
  cantidad: number;
  deducible: string;
  noDeducible: string;
  total: string;
}

/** CC-R1: lo que al corte ya se gastó del fondo y todavía no se había repuesto. */
export interface ReporteDePendientesDto {
  corte: string;
  fondos: GrupoDeFondoDto[];
  total: TotalDeComprobantesDto;
  leyendas: string[];
}

/** CC-R3: los gastos del período sin documento fiscal válido (vales de gasto y documentos fuera del libro). */
export interface ReporteSinDocumentoDto {
  desde: string;
  hasta: string;
  fondos: GrupoDeFondoDto[];
  total: TotalDeComprobantesDto;
  leyendas: string[];
}

/** Una reposición del período con el cheque o la nota de Bancos que la respalda. */
export interface ReposicionDeReporteDto {
  id: string;
  numero: number;
  fecha: string;
  forma: FormaDeReposicion;
  /** «Cheque 1234», «Nota de débito 5» o «Compensada al cerrar». */
  respaldo: string;
  monto: string;
}

/** Lo repuesto de un concepto de gasto, dividido en deducible y no deducible. */
export interface ConceptoDeReposicionesDto {
  concepto: string;
  deducible: string;
  noDeducible: string;
  total: string;
}

export interface FondoDeReposicionesDto {
  fondoId: string;
  fondoNombre: string;
  reposiciones: ReposicionDeReporteDto[];
  conceptos: ConceptoDeReposicionesDto[];
  deducible: string;
  noDeducible: string;
  total: string;
}

/** CC-R2: lo repuesto en el período, por fondo y concepto de gasto. */
export interface ReporteDeReposicionesDto {
  desde: string;
  hasta: string;
  fondos: FondoDeReposicionesDto[];
  total: { cantidad: number; deducible: string; noDeducible: string; total: string };
  leyendas: string[];
}

/** Un fondo al corte (CC-R4). */
export interface EstadoDeFondoAlCorteDto {
  fondoId: string;
  nombre: string;
  custodio: string | null;
  monto: string;
  efectivoEsperado: string;
  pendienteDeReponer: string;
  valesAbiertos: string;
  /** Fecha y hora del último arqueo vigente al corte. */
  ultimoArqueo: string | null;
  diferenciaDelArqueo: string | null;
}

export interface ReporteDeEstadoDeFondosDto {
  corte: string;
  fondos: EstadoDeFondoAlCorteDto[];
  total: { monto: string; efectivoEsperado: string; pendienteDeReponer: string; valesAbiertos: string };
  leyendas: string[];
}

export type ResultadoDelArqueo = 'cuadrado' | 'faltante' | 'sobrante';

/** Un arqueo del período con su diferencia y lo que se hizo con ella. */
export interface FilaDeArqueoDto {
  id: string;
  numero: number;
  realizadoEn: string;
  custodio: string;
  efectivoContado: string;
  efectivoEsperado: string;
  diferencia: string;
  resultado: ResultadoDelArqueo;
  /** Solo en un faltante: `perdida` o `cobrar_al_custodio`. */
  destino: 'perdida' | 'cobrar_al_custodio' | null;
  motivo: string | null;
}

export interface FondoDeArqueosDto {
  fondoId: string;
  fondoNombre: string;
  cantidad: number;
  faltantes: string;
  sobrantes: string;
  filas: FilaDeArqueoDto[];
}

/** CC-R5: los arqueos del período, con sus diferencias y su destino. */
export interface ReporteDeArqueosDto {
  desde: string;
  hasta: string;
  fondos: FondoDeArqueosDto[];
  total: { cantidad: number; faltantes: string; sobrantes: string };
  leyendas: string[];
}
