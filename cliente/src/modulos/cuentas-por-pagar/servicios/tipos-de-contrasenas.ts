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
