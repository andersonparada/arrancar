import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
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

/** El libro de compras de un período (`AAAA-MM`) y su anexo de anulados. */
export class ApiLibro {
  constructor(private readonly http: ClienteHttp) {}

  obtener(periodo: string) {
    return this.http.obtener<LibroDelPeriodo>('/libro-de-compras/libro', { periodo });
  }

  anulados(periodo: string) {
    return this.http.obtener<AnuladoDelLibro[]>('/libro-de-compras/libro/anulados', { periodo });
  }
}

export const apiLibro = new ApiLibro(clienteHttp);
