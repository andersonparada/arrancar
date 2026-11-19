/** Lo que el servidor manda de un fondo; el dinero viaja como texto con dos decimales. */

export type EstadoDelFondo = 'abierto' | 'cerrado';
export type FormaDeEntrega = 'cheque' | 'nota_de_debito';
export type TipoDeCambioDeMonto = 'apertura' | 'aumento' | 'disminucion' | 'cierre';
export type FormaDeCambioDeMonto = 'cheque' | 'nota_de_debito' | 'nota_de_credito' | 'saldo_inicial' | 'sin_deposito';

export interface CustodioDelFondo {
  custodio: string;
  custodioUsuarioId: string | null;
  desde: string;
  hasta: string | null;
  motivoDelCambio: string | null;
}

export interface CambioDeMonto {
  id: string;
  tipo: TipoDeCambioDeMonto;
  forma: FormaDeCambioDeMonto;
  fecha: string;
  monto: string;
  estado: 'vigente' | 'anulado';
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

export interface FondoResumen {
  id: string;
  nombre: string;
  localidadId: string | null;
  localidadNombre: string | null;
  custodio: string | null;
  custodioUsuarioId: string | null;
  estado: EstadoDelFondo;
  fechaDeApertura: string;
  aperturaAnulada: boolean;
  monto: string;
  efectivoEsperado: string;
  pendienteDeReponer: string;
  valesAbiertos: string;
  ultimoArqueo: string | null;
  avisos: string[];
}

export interface Fondo extends FondoResumen {
  topePorComprobante: string | null;
  cuentaBancariaId: string | null;
  fechaDeCierre: string | null;
  motivoDeCierre: string | null;
  observaciones: string | null;
  custodios: CustodioDelFondo[];
  cambiosDeMonto: CambioDeMonto[];
  puedeAumentar: boolean;
  puedeDisminuir: boolean;
  puedeCambiarCustodio: boolean;
  puedeAnularApertura: boolean;
}

export interface PaginaDeFondos {
  elementos: FondoResumen[];
  total: number;
}

export interface FiltroDeFondos {
  estado: EstadoDelFondo | 'todos';
  localidadId?: string;
}

/** Cómo sale el dinero del banco: un cheque de una chequera o una nota de débito a una cuenta. */
export type EntregaSolicitada =
  | { forma: 'cheque'; chequeraId: string; beneficiario?: string | null; noNegociable?: boolean }
  | { forma: 'nota_de_debito'; cuentaBancariaId: string; referencia?: string | null };

export interface MontoYFecha {
  monto: string;
  fecha?: string;
  observaciones?: string | null;
}

export type AperturaSolicitada = EntregaSolicitada &
  MontoYFecha & {
    nombre: string;
    localidadId?: string | null;
    custodio?: string | null;
    custodioUsuarioId?: string | null;
    topePorComprobante?: string | null;
  };

export type AumentoSolicitado = EntregaSolicitada & MontoYFecha;

export interface DisminucionSolicitada extends MontoYFecha {
  cuentaBancariaId?: string | null;
  referencia?: string | null;
}

export interface CustodioSolicitado {
  custodio?: string | null;
  custodioUsuarioId?: string | null;
  fecha?: string;
  motivo: string;
}

export interface EdicionSolicitada {
  nombre?: string;
  localidadId?: string | null;
  topePorComprobante?: string | null;
  cuentaBancariaId?: string | null;
  motivo?: string | null;
}

export interface AnulacionDeAperturaSolicitada {
  motivo: string;
  fecha?: string;
}
