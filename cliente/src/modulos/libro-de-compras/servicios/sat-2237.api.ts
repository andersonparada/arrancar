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
