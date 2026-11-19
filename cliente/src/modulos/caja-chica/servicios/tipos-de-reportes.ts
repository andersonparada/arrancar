/** Lo que responden los reportes de Caja chica. El dinero viaja como texto con dos decimales; lo que resta, con signo. */

export type ClaseDeComprobante = 'documento' | 'vale_de_gasto' | 'faltante' | 'sobrante';

export interface FilaDeComprobante {
  id: string;
  clase: ClaseDeComprobante;
  documento: string;
  proveedor: string;
  fecha: string;
  concepto: string;
  deducible: boolean;
  monto: string;
  /** Solo en CC-R3. */
  motivo: string | null;
}

export interface GrupoDeFondo {
  fondoId: string;
  fondoNombre: string;
  cantidad: number;
  deducible: string;
  noDeducible: string;
  total: string;
  filas: FilaDeComprobante[];
}

export interface TotalDeComprobantes {
  cantidad: number;
  deducible: string;
  noDeducible: string;
  total: string;
}

/** CC-R1: pendientes de reponer al corte. */
export interface ReporteDePendientes {
  corte: string;
  fondos: GrupoDeFondo[];
  total: TotalDeComprobantes;
  leyendas: string[];
}

/** CC-R3: gastos sin documento fiscal. */
export interface ReporteSinDocumento {
  desde: string;
  hasta: string;
  fondos: GrupoDeFondo[];
  total: TotalDeComprobantes;
  leyendas: string[];
}

export interface ReposicionDeReporte {
  id: string;
  numero: number;
  fecha: string;
  forma: 'cheque' | 'nota_de_debito' | 'compensada_al_cerrar';
  respaldo: string;
  monto: string;
}

export interface ConceptoDeReposiciones {
  concepto: string;
  deducible: string;
  noDeducible: string;
  total: string;
}

export interface FondoDeReposiciones {
  fondoId: string;
  fondoNombre: string;
  reposiciones: ReposicionDeReporte[];
  conceptos: ConceptoDeReposiciones[];
  deducible: string;
  noDeducible: string;
  total: string;
}

/** CC-R2: reposiciones del período. */
export interface ReporteDeReposiciones {
  desde: string;
  hasta: string;
  fondos: FondoDeReposiciones[];
  total: TotalDeComprobantes;
  leyendas: string[];
}

export interface EstadoDeFondoAlCorte {
  fondoId: string;
  nombre: string;
  custodio: string | null;
  monto: string;
  efectivoEsperado: string;
  pendienteDeReponer: string;
  valesAbiertos: string;
  ultimoArqueo: string | null;
  diferenciaDelArqueo: string | null;
}

/** CC-R4: estado de los fondos al corte. */
export interface ReporteDeEstadoDeFondos {
  corte: string;
  fondos: EstadoDeFondoAlCorte[];
  total: { monto: string; efectivoEsperado: string; pendienteDeReponer: string; valesAbiertos: string };
  leyendas: string[];
}

export interface FilaDeArqueo {
  id: string;
  numero: number;
  realizadoEn: string;
  custodio: string;
  efectivoContado: string;
  efectivoEsperado: string;
  diferencia: string;
  resultado: 'cuadrado' | 'faltante' | 'sobrante';
  destino: 'perdida' | 'cobrar_al_custodio' | null;
  motivo: string | null;
}

export interface FondoDeArqueos {
  fondoId: string;
  fondoNombre: string;
  cantidad: number;
  faltantes: string;
  sobrantes: string;
  filas: FilaDeArqueo[];
}

/** CC-R5: arqueos del período. */
export interface ReporteDeArqueos {
  desde: string;
  hasta: string;
  fondos: FondoDeArqueos[];
  total: { cantidad: number; faltantes: string; sobrantes: string };
  leyendas: string[];
}
