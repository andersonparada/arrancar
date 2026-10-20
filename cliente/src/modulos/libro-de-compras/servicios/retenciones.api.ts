import { clienteHttp, type ArchivoDescargado, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export const GRUPOS_DE_ENTERO = [
  'iva_agentes',
  'isr_opcional',
  'iva_factura_especial',
  'isr_factura_especial',
] as const;
export type GrupoDeEntero = (typeof GRUPOS_DE_ENTERO)[number];

export type EstadoDelEntero = 'sin_retenciones' | 'pendiente' | 'vencido' | 'enterado' | 'con_diferencia';
export type ResolucionDeRetencion = 'pendiente' | 'constancia_anulada' | 'rectificada' | 'no_requiere';
export type AccionSugerida = 'anular_constancia' | 'rectificar_entero' | 'anular_constancia_y_rectificar' | 'confirmar';
export type FiltroDeConstancia = 'con' | 'sin' | 'todas';
export type FiltroDeDocumentos = 'vigentes' | 'anulados' | 'todos';

/** Una retención con su documento y proveedor; el dinero viaja como texto. */
export interface RetencionDelMes {
  id: string;
  impuesto: 'iva' | 'isr';
  regla: string;
  grupo: GrupoDeEntero;
  fecha: string;
  base: string;
  /** Con dos decimales; `null` en el ISR por escalones. */
  porcentaje: string | null;
  propuesto: string;
  retenido: string;
  /** Se dejó en cero: no se retuvo nada. */
  enCero: boolean;
  motivoDelAjuste: string | null;
  constanciaNumero: string | null;
  constanciaFecha: string | null;
  documento: {
    id: string;
    estado: 'vigente' | 'anulado';
    tipoDte: string | null;
    serie: string | null;
    numero: string;
    uuid: string | null;
    fechaEmision: string;
  };
  proveedor: { id: string; nit: string | null; nombre: string };
}

export interface PagoDeEntero {
  id: string;
  mes: string;
  grupo: GrupoDeEntero;
  fechaDePago: string;
  documentoDePago: string;
  monto: string;
  retenidoAlMarcar: string;
  observaciones: string | null;
  estado: 'vigente' | 'anulado';
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  registradoPor: string | null;
}

interface CantidadDeRetenciones {
  cantidad: number;
  monto: string;
}

/** Un grupo de entero en un mes: lo retenido, el plazo, lo pagado y su estado. */
export interface GrupoDelMes {
  grupo: GrupoDeEntero;
  nombre: string;
  /** Primer día del mes (`AAAA-MM-01`). */
  mes: string;
  plazo: string;
  retenido: string;
  pagado: string;
  /** Retenido menos pagado; puede ser negativo. */
  diferencia: string;
  estado: EstadoDelEntero;
  aviso: string | null;
  conConstancia: CantidadDeRetenciones;
  sinConstancia: CantidadDeRetenciones;
  pagos: PagoDeEntero[];
}

export interface ReporteDeRetenciones {
  mes: string;
  grupos: GrupoDelMes[];
  retenciones: RetencionDelMes[];
  anuladas: RetencionDelMes[];
}

export interface RetencionPorResolver extends RetencionDelMes {
  resolucion: ResolucionDeRetencion;
  nota: string | null;
  resueltaEn: string | null;
  resueltaPor: string | null;
  motivoDeAnulacionDelDocumento: string | null;
  enterada: boolean;
  accionSugerida: AccionSugerida;
}

export interface MatrizDeEnteros {
  anio: number;
  meses: Array<{ mes: string; grupos: GrupoDelMes[] }>;
}

export interface FiltrosDelReporte {
  mes: string;
  grupo: GrupoDeEntero | '';
  constancia: FiltroDeConstancia;
  documentos: FiltroDeDocumentos;
}

export interface ConstanciaPorAnotar {
  numero: string;
  fecha: string;
}

export interface DatosDelPago {
  fechaDePago: string;
  documentoDePago: string;
  monto: string;
  observaciones: string | null;
}

export interface ResultadoDePago {
  entero: PagoDeEntero;
  avisos: string[];
}

const RUTA = '/libro-de-compras/retenciones';

/** Retenciones del mes, constancias, lo por resolver y los enteros (pagos) de lo retenido. */
export class ApiRetenciones {
  constructor(private readonly http: ClienteHttp) {}

  reporte(filtros: FiltrosDelReporte) {
    return this.http.obtener<ReporteDeRetenciones>(RUTA, { ...filtros });
  }

  exportar(filtros: FiltrosDelReporte): Promise<ArchivoDescargado> {
    return this.http.descargar(`${RUTA}/exportar`, { ...filtros });
  }

  anotarConstancia(retencionId: string, constancia: ConstanciaPorAnotar) {
    return this.http.reemplazar<{ avisos: string[] }>(`${RUTA}/${retencionId}/constancia`, { ...constancia });
  }

  /** Todo o nada: si una fila falla, el error trae `detalles.filas` con la fila y el campo. */
  anotarConstancias(constancias: Array<ConstanciaPorAnotar & { retencionId: string }>) {
    return this.http.crear<{ cantidad: number; avisos: string[] }>(`${RUTA}/constancias`, { constancias });
  }

  quitarConstancia(retencionId: string, motivo: string) {
    return this.http.eliminar<{ avisos: string[] }>(`${RUTA}/${retencionId}/constancia`, { motivo });
  }

  porResolver(estado: 'pendiente' | 'resueltas') {
    return this.http.obtener<RetencionPorResolver[]>(`${RUTA}/por-resolver`, { estado });
  }

  resolver(retencionId: string, resolucion: ResolucionDeRetencion, nota: string | null) {
    return this.http.reemplazar<RetencionPorResolver>(`${RUTA}/${retencionId}/resolucion`, { resolucion, nota });
  }

  enteros(anio: number) {
    return this.http.obtener<MatrizDeEnteros>(`${RUTA}/enteros`, { anio });
  }

  registrarPago(mes: string, grupo: GrupoDeEntero, datos: DatosDelPago) {
    return this.http.crear<ResultadoDePago>(`${RUTA}/enteros`, { mes, grupo, ...datos });
  }

  corregirPago(id: string, datos: DatosDelPago) {
    return this.http.reemplazar<ResultadoDePago>(`${RUTA}/enteros/${id}`, { ...datos });
  }

  anularPago(id: string, motivo: string) {
    return this.http.crear<ResultadoDePago>(`${RUTA}/enteros/${id}/anular`, { motivo });
  }
}

export const apiRetenciones = new ApiRetenciones(clienteHttp);
