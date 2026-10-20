import { clienteHttp, type ArchivoDescargado, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { MotivoSinCredito } from './documentos.api';

export type TipoDeLibro = 'completo' | 'simplificado';

/** Las columnas de dinero de una fila: texto con dos decimales y con signo. */
export const COLUMNAS_DE_DINERO = [
  'bienes',
  'servicios',
  'combustibles',
  'pequenoContribuyente',
  'primarioPecuario',
  'exentoYNoAfecto',
  'idp',
  'ivaConCredito',
  'ivaSinCredito',
  'ivaInformativo',
  'total',
] as const;
export type ColumnaDeDinero = (typeof COLUMNAS_DE_DINERO)[number];
export type MontosDelLibro = Record<ColumnaDeDinero, string>;

export interface FilaDelLibro extends MontosDelLibro {
  documentoId: string;
  numeroDeFila: number;
  fecha: string;
  tipoDte: string | null;
  serie: string | null;
  numero: string;
  nit: string | null;
  nombre: string;
  motivo: MotivoSinCredito | null;
  siglaDelMotivo: string | null;
}

export interface ResumenDelLibro {
  totales: MontosDelLibro;
  porTipoDte: Array<{ tipoDte: string | null; cantidad: number; total: string }>;
  creditoFiscalDelPeriodo: string;
  ivaSinCreditoPorMotivo: Array<{ motivo: MotivoSinCredito; ivaSinCredito: string }>;
  combustibles: { base: string; idp: string; iva: string; exentoPorDecreto: string };
}

export interface LibroDelPeriodo {
  tipoDeLibro: TipoDeLibro;
  periodo: string;
  empresa: { nombre: string; nit: string | null };
  filas: FilaDelLibro[];
  resumen: ResumenDelLibro;
  avisos: string[];
  leyenda: Array<{ sigla: string; descripcion: string }>;
}

/** Un documento anulado del período (anexo del libro); los montos van positivos. */
export interface AnuladoDelLibro {
  id: string;
  tipoDte: string | null;
  fechaEmision: string;
  serie: string | null;
  numero: string;
  nitDelProveedor: string | null;
  nombreDelProveedor: string;
  total: string;
  iva: string;
  causaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
  anuladoEn: string | null;
  anuladoPor: string | null;
}

/** Una emisión del libro con folios; `sustituida` si hay otra posterior del mismo período. */
export interface EmisionDelLibro {
  id: string;
  /** Primer día del mes (`AAAA-MM-01`). */
  periodo: string;
  tipoDeLibro: TipoDeLibro;
  folioDesde: number;
  folioHasta: number;
  paginas: number;
  motivo: string | null;
  creadoEn: string;
  sustituida: boolean;
}

export interface EmisionesDelLibro {
  ultimoFolio: number;
  emisiones: EmisionDelLibro[];
}

/** El libro de compras de un período (`AAAA-MM`) y su anexo de anulados. */
export class ApiLibro {
  constructor(private readonly http: ClienteHttp) {}

  obtener(periodo: string) {
    return this.http.obtener<LibroDelPeriodo>('/libro-de-compras/libro', { periodo });
  }

  anulados(periodo: string) {
    return this.http.obtener<AnuladoDelLibro[]>('/libro-de-compras/libro/anulados', { periodo });
  }

  exportar(periodo: string): Promise<ArchivoDescargado> {
    return this.http.descargar('/libro-de-compras/libro/exportar', { periodo });
  }

  /** El PDF sin folios: no gasta nada. */
  borrador(periodo: string): Promise<ArchivoDescargado> {
    return this.http.descargar('/libro-de-compras/libro/pdf', { periodo });
  }

  emisiones(periodo: string) {
    return this.http.obtener<EmisionesDelLibro>('/libro-de-compras/libro/emisiones', { periodo });
  }

  /** Emite el PDF con folios y gasta las hojas; el motivo es obligatorio si el período ya se emitió. */
  emitir(periodo: string, motivo: string | null) {
    return this.http.crear<EmisionDelLibro>('/libro-de-compras/libro/emisiones', {
      periodo,
      motivo: motivo || undefined,
    });
  }

  copia(emisionId: string): Promise<ArchivoDescargado> {
    return this.http.descargar(`/libro-de-compras/libro/emisiones/${emisionId}/pdf`);
  }

  corregirFolio(ultimoFolio: number, motivo: string) {
    return this.http.reemplazar<{ ultimoFolio: number }>('/libro-de-compras/libro/foliacion', { ultimoFolio, motivo });
  }
}

export const apiLibro = new ApiLibro(clienteHttp);
