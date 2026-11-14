import type { EstadoDeDocumento, OrigenDelDocumento, TipoDeDocumento } from './tipos';

export type EstadoDeContrasena = 'vigente' | 'anulada';
export type EstadoBuscadoDeContrasena = EstadoDeContrasena | 'todas';

/** Un cargo que puede entrar (o ya entró) en una contraseña; el dinero viaja como texto con dos decimales. */
export interface CargoDeContrasena {
  documentoId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  origen: OrigenDelDocumento;
  fechaEmision: string;
  vencimiento: string | null;
  estado: EstadoDeDocumento;
  total: string;
  retenciones: string;
  rebajado: string;
  saldo: string;
  retencionesPorPracticar: string | null;
  sobreUmbralDeBancarizacion: boolean;
}

/** Una nota de crédito con saldo a favor que puede entrar en la contraseña. */
export interface NotaDisponible {
  documentoId: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  saldoLibre: string;
}

export interface DocumentosDisponibles {
  cargos: CargoDeContrasena[];
  notas: NotaDisponible[];
  fechaDePagoPropuesta: string;
  /** Desde cuánto se exige pagar por el sistema bancario, con dos decimales. */
  umbralDeBancarizacion: string;
}

export interface ContrasenaResumen {
  id: string;
  numero: string;
  fecha: string;
  fechaDePago: string;
  proveedorNombre: string;
  documentos: number;
  saldo: string;
  estado: EstadoDeContrasena;
  pagoVencido: boolean;
}

export interface PaginaDeContrasenas {
  elementos: ContrasenaResumen[];
  total: number;
  pagina: number;
  limite: number;
}

export interface ConsultaDeContrasenas {
  proveedorId?: string;
  estado: EstadoBuscadoDeContrasena;
  desde?: string;
  hasta?: string;
  pagoDesde?: string;
  pagoHasta?: string;
  pagina: number;
  limite: number;
}

export interface DatosDeContrasena {
  proveedorId: string;
  fecha: string;
  fechaDePago: string;
  observaciones: string | null;
  documentos: string[];
}

/** Lo que el cliente necesita de la contraseña recién creada. */
export interface ContrasenaCreada {
  id: string;
  numero: string;
}

/** Una nota dentro de la contraseña, con lo que compensó en ella y lo que le queda libre. */
export interface NotaDeContrasena {
  documentoId: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  aplicadoEnLaContrasena: string;
  saldoLibre: string;
}

export interface TotalesDeContrasena {
  total: string;
  retenciones: string;
  rebajado: string;
  saldo: string;
}

export interface AnulacionDeContrasena {
  motivo: string;
  anuladaPorNombre: string | null;
  anuladaEn: string;
}

/** La ficha de una contraseña con sus montos de hoy; `puedeEditar` y `puedeAnular` los dice el servidor. */
export interface FichaDeContrasena {
  id: string;
  numero: string;
  fecha: string;
  fechaDePago: string;
  proveedorId: string;
  proveedorNombre: string;
  proveedorNit: string | null;
  observaciones: string | null;
  estado: EstadoDeContrasena;
  cargos: CargoDeContrasena[];
  notas: NotaDeContrasena[];
  totales: TotalesDeContrasena;
  impresa: boolean;
  impresaEn: string | null;
  anulacion: AnulacionDeContrasena | null;
  creadoPorNombre: string | null;
  creadoEn: string;
  puedeEditar: boolean;
  puedeAnular: boolean;
}

/** Lo que se cambia de una contraseña vigente; el motivo es obligatorio si cambia la fecha prometida. */
export interface CambiosDeContrasena {
  fechaDePago?: string;
  observaciones?: string | null;
  motivo?: string;
}

export interface HojaDeImpresion {
  rotulo: string;
  firmaElProveedor: boolean;
}

export interface CargoImpreso {
  documentoId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  total: string;
  retenciones: string;
  rebajado: string;
  saldo: string;
}

export interface CompensacionImpresa {
  documentoId: string;
  monto: string;
  texto: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
}

export interface RetencionPorEmitirImpresa {
  documentoId: string;
  monto: string;
  texto: string;
}

/** Todo lo que lleva el papel; la pantalla solo lo dibuja. */
export interface ImpresionDeContrasena {
  empresa: { nombre: string; nit: string | null; razonSocial: string | null; nombreComercial: string | null };
  contrasena: {
    id: string;
    numero: string;
    fecha: string;
    fechaDePago: string;
    observaciones: string | null;
    estado: EstadoDeContrasena;
  };
  proveedor: { nombre: string; nit: string | null };
  hojas: HojaDeImpresion[];
  cargos: CargoImpreso[];
  totales: TotalesDeContrasena;
  compensaciones: CompensacionImpresa[];
  retencionesPorEmitir: RetencionPorEmitirImpresa[];
  hayRetenciones: boolean;
  leyendaDeRetenciones: string | null;
  leyenda: string | null;
  /** Fecha (`AAAA-MM-DD`) de los montos vivos. */
  alDia: string;
  reimpresion: boolean;
  impresoPorNombre: string | null;
  impresoEn: string;
  anulacion: AnulacionDeContrasena | null;
}
