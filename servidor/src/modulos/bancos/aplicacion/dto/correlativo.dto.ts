/** Quién, cuándo y por qué se eliminó o cambió de tipo el comprobante que tenía un número. */
export interface ExplicacionDeHuecoDto {
  accion: 'eliminar' | 'corregir';
  usuarioId: string | null;
  usuarioNombre: string | null;
  /** Cuándo quedó en la auditoría (ISO 8601). */
  fecha: string;
  motivo: string | null;
}

/** Un número que falta en el rango: `explicado` si la auditoría dice qué pasó; si no, `alerta`. */
export interface HuecoDto {
  numero: number;
  estado: 'explicado' | 'alerta';
  explicaciones: ExplicacionDeHuecoDto[];
}

/** El correlativo de una clave (y de un año, si la empresa lo reinicia): hasta dónde llegó y qué números faltan. */
export interface CorrelativoDto {
  clave: string;
  nombre: string;
  /** 0 si el correlativo no se reinicia cada año. */
  anio: number;
  /** El último número asignado. */
  ultimo: number;
  /** Cuántos números siguen en uso (los que no son hueco). */
  emitidos: number;
  huecos: HuecoDto[];
}

export interface ReporteDeCorrelativosDto {
  correlativos: CorrelativoDto[];
}

/** Qué claves incluir; sin `clave`, todas las de Bancos. */
export interface FiltroDeCorrelativos {
  clave?: string;
}
