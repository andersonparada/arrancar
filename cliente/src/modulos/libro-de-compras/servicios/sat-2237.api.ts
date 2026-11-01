import { clienteHttp, type ArchivoDescargado, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export interface MontoDeRubro {
  base: string;
  iva: string;
}

export interface RubroDelSat2237 {
  clave: string;
  nombre: string;
  nota: string | null;
  facturas: MontoDeRubro;
  notasDeDebito: MontoDeRubro;
  notasDeCredito: MontoDeRubro;
  neto: MontoDeRubro;
}

export interface OperacionDelSegmento9 {
  clave: string;
  nombre: string;
  tiposDte: string[];
  cantidad: number;
  base: string;
}

export interface ProveedorDelSat2237 {
  nit: string | null;
  nombre: string;
  cantidadDeFacturas: number;
  cantidadDeNotasDeCredito: number;
  cantidadDeNotasDeDebito: number;
  base: string;
  credito: string;
  aviso: string | null;
}

export interface DetalleDeProveedores {
  filas: ProveedorDelSat2237[];
  total: { cantidadDeFacturas: number; base: string; credito: string };
}

export interface CasillaDelSat2237 {
  clave: string;
  nombre: string;
  /** El IVA de la casilla es crédito fiscal; si no, es el que fue al costo. */
  ivaDeCredito: boolean;
  /** La prellena la SAT: Arrancar no la llena. */
  llenaLaSat: boolean;
  rubros: string[];
  neto: MontoDeRubro;
}

/** Las secciones 5, 6 y 9 del formulario; con `confirmado: false` los nombres vienen de las guías. */
export interface VistaDelFormularioSat2237 {
  version: string;
  confirmado: boolean;
  seccion5: { nombre: string; casillas: CasillaDelSat2237[] };
  seccion6: { nombre: string; maximo: number; filas: ProveedorDelSat2237[]; sinLugar: number };
  seccion9: { nombre: string; cantidad: string; monto: string; lineas: OperacionDelSegmento9[] };
}

interface Encabezado {
  periodo: string;
  empresa: { nombre: string; nit: string | null };
}

export interface Sat2237 extends Encabezado {
  aplica: true;
  formulario: 'SAT-2237';
  rubros: RubroDelSat2237[];
  segmento9: OperacionDelSegmento9[];
  proveedores: DetalleDeProveedores;
  facturasEspeciales: DetalleDeProveedores;
  comoEnElFormulario: VistaDelFormularioSat2237;
  avisos: string[];
}

export interface Sat2237NoAplica extends Encabezado {
  aplica: false;
  formulario: 'SAT-2046' | null;
  mensaje: string;
}

export type RespuestaDelSat2237 = Sat2237 | Sat2237NoAplica;

/** Los datos para llenar el SAT-2237 de un período (`AAAA-MM`). */
export class ApiSat2237 {
  constructor(private readonly http: ClienteHttp) {}

  obtener(periodo: string) {
    return this.http.obtener<RespuestaDelSat2237>('/libro-de-compras/libro/sat-2237', { periodo });
  }

  exportar(periodo: string): Promise<ArchivoDescargado> {
    return this.http.descargar('/libro-de-compras/libro/sat-2237/exportar', { periodo });
  }
}

export const apiSat2237 = new ApiSat2237(clienteHttp);
