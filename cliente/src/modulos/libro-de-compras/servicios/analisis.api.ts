import { clienteHttp, type ArchivoDescargado, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

/** Los cinco análisis; la clave es también la ruta del servidor. */
export type ClaveDeAnalisis =
  'compras-por-proveedor' | 'compras-por-concepto' | 'iva-al-costo' | 'activos-fijos' | 'combustibles';

/** Todo el dinero viaja como texto con dos decimales y con signo. */
export interface CompraDeProveedor {
  proveedorId: string;
  nit: string | null;
  nombre: string;
  documentos: number;
  total: string;
  base: string;
  ivaConCredito: string;
  ivaSinCredito: string;
  exentoYNoAfecto: string;
  idp: string;
  retenido: string;
  neto: string;
}

export interface CompraDeConcepto {
  conceptoId: string;
  concepto: string;
  tipo: 'bien' | 'servicio';
  lineas: number;
  base: string;
  ivaConCredito: string;
  ivaAlCosto: string;
  costo: string;
}

/** El documento al que pertenece una línea de un análisis. */
export interface DocumentoDeLinea {
  documentoId: string;
  periodo: string;
  fecha: string;
  tipoDte: string | null;
  serie: string | null;
  numero: string;
  nitDelProveedor: string | null;
  proveedor: string;
}

export interface LineaDeIvaAlCosto extends DocumentoDeLinea {
  numeroDeLinea: number;
  concepto: string;
  ivaAlCosto: string;
}

export interface ActivoFijoComprado extends DocumentoDeLinea {
  numeroDeLinea: number;
  concepto: string;
  descripcion: string | null;
  costo: string;
  ivaConCredito: string;
}

export interface SumasDeCombustible {
  galones: string;
  idp: string;
  base: string;
  iva: string;
  exentoYNoAfecto: string;
}

export interface MesDeCombustible extends SumasDeCombustible {
  periodo: string;
  exentoPorDecreto: boolean;
  aviso: string | null;
}

export interface GrupoDeMotivo {
  motivo: string | null;
  lineas: LineaDeIvaAlCosto[];
  subtotal: string;
}

export interface GrupoDeCombustible {
  combustible: string | null;
  meses: MesDeCombustible[];
  subtotal: SumasDeCombustible;
}

type SumasDeProveedor = Omit<CompraDeProveedor, 'proveedorId' | 'nit' | 'nombre'>;
type SumasDeConcepto = Omit<CompraDeConcepto, 'conceptoId' | 'concepto' | 'tipo'>;

export interface ResultadosDelAnalisis {
  'compras-por-proveedor': { filas: CompraDeProveedor[]; total: SumasDeProveedor };
  'compras-por-concepto': { filas: CompraDeConcepto[]; total: SumasDeConcepto };
  'iva-al-costo': { motivos: GrupoDeMotivo[]; total: string };
  'activos-fijos': { filas: ActivoFijoComprado[]; total: { costo: string; ivaConCredito: string } };
  combustibles: { combustibles: GrupoDeCombustible[]; total: SumasDeCombustible };
}

/** Lo que se pide a un análisis: el rango (`AAAA-MM`) y, solo en «por proveedor», los documentos fuera del libro. */
export interface ConsultaDeAnalisis {
  desde: string;
  hasta: string;
  incluirFueraDelLibro?: boolean;
}

const RAIZ = '/libro-de-compras/analisis';

/** Los análisis de compras por rango de períodos. */
export class ApiAnalisis {
  constructor(private readonly http: ClienteHttp) {}

  obtener<C extends ClaveDeAnalisis>(clave: C, consulta: ConsultaDeAnalisis): Promise<ResultadosDelAnalisis[C]> {
    return this.http.obtener<ResultadosDelAnalisis[C]>(`${RAIZ}/${clave}`, { ...consulta });
  }

  exportar(clave: ClaveDeAnalisis, consulta: ConsultaDeAnalisis): Promise<ArchivoDescargado> {
    return this.http.descargar(`${RAIZ}/${clave}/exportar`, { ...consulta });
  }
}

export const apiAnalisis = new ApiAnalisis(clienteHttp);
