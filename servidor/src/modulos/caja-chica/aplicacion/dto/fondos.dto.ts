import type { EstadoDelFondo, FormaDeCambioDeMonto, TipoDeCambioDeMonto } from '../../dominio/fondos.js';

export interface CustodioDto {
  custodio: string;
  custodioUsuarioId: string | null;
  desde: string;
  hasta: string | null;
  motivoDelCambio: string | null;
}

export interface CambioDeMontoDto {
  id: string;
  tipo: TipoDeCambioDeMonto;
  forma: FormaDeCambioDeMonto;
  fecha: string;
  monto: string;
  movimientoId: string | null;
  estado: 'vigente' | 'anulado';
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

/** Una fila de la lista de fondos. El dinero viaja como texto con dos decimales. */
export interface FondoResumenDto {
  id: string;
  nombre: string;
  localidadId: string | null;
  localidadNombre: string | null;
  custodio: string | null;
  custodioUsuarioId: string | null;
  estado: EstadoDelFondo;
  fechaDeApertura: string;
  /** La apertura se anuló (el fondo quedó cerrado sin haberse usado). */
  aperturaAnulada: boolean;
  monto: string;
  efectivoEsperado: string;
  pendienteDeReponer: string;
  valesAbiertos: string;
  /** La fecha del vale provisional abierto más viejo, si hay alguno. */
  valeMasViejo: string | null;
  ultimoArqueo: string | null;
  avisos: string[];
}

/** La ficha del fondo con su historial de custodios y de cambios de monto. */
export interface FondoDto extends FondoResumenDto {
  topePorComprobante: string | null;
  cuentaBancariaId: string | null;
  /** El nombre de esa cuenta, para mostrarlo sin pedirle a Bancos. */
  cuentaBancariaNombre: string | null;
  fechaDeCierre: string | null;
  motivoDeCierre: string | null;
  observaciones: string | null;
  custodios: CustodioDto[];
  cambiosDeMonto: CambioDeMontoDto[];
  /** Se pueden editar el nombre, la localidad, el tope y la cuenta (solo un fondo abierto). */
  puedeEditar: boolean;
  puedeAumentar: boolean;
  puedeDisminuir: boolean;
  puedeCambiarCustodio: boolean;
  puedeAnularApertura: boolean;
}

export interface PaginaDeFondosDto {
  elementos: FondoResumenDto[];
  total: number;
}
