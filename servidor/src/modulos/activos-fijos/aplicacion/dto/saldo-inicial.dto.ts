import type { IncisoFiscal } from '../../dominio/incisos-fiscales.js';
import type { UbicacionDeActivo } from '../../dominio/activo.js';
import type { DatosDeActivo } from '../../dominio/reglas-de-activo.js';

/**
 * Lo que se recibe para cargar el saldo inicial de un activo (§8). Lo que no se escribe se propone: el costo fiscal es el
 * costo, la base fiscal sale de la clase (con el tope del inmueble o sin el ganado común), el porcentaje y el residual
 * son los de la clase. Los montos viajan como texto con dos decimales.
 */
export type SolicitudDeSaldoInicial = Omit<
  DatosDeActivo,
  'codigo' | 'tipoDeRegistro' | 'origen' | 'propietario' | 'formaDeTenencia'
> &
  UbicacionDeActivo & {
    codigo: string | null;
    /** `null` si la obra no se terminó (entra al balance sin depreciar). */
    fechaDeInicioDeUso: string | null;
    enConstruccion: boolean;
    costo: string;
    depreciacionAcumuladaContable: string;
    costoFiscal: string | null;
    baseFiscal: string | null;
    depreciacionAcumuladaFiscal: string;
    porcentajeFiscal: string | null;
    vidaUtilRestanteMeses: number | null;
    valorResidual: string | null;
  };

/** Un activo de saldo inicial tal como lo ve la pantalla, con los nombres de la clase, el padre y la ubicación. */
export interface SaldoInicialDto {
  activoId: string;
  codigo: string;
  descripcion: string;
  claseId: string;
  claseNombre: string;
  incisoFiscal: IncisoFiscal;
  activoPadreId: string | null;
  activoPadreCodigo: string | null;
  enConstruccion: boolean;
  fechaDeCorte: string;
  fechaDeAdquisicion: string;
  fechaDeInicioDeUso: string | null;
  cantidad: number;
  costo: string;
  depreciacionAcumuladaContable: string;
  valorEnLibros: string;
  costoFiscal: string;
  baseFiscal: string;
  depreciacionAcumuladaFiscal: string;
  porcentajeFiscal: string | null;
  vidaUtilRestanteMeses: number | null;
  valorResidual: string | null;
  valorComoGanadoComun: string | null;
  valorDeMatricula: string | null;
  valorCatastral: string | null;
  valoresDelInmuebleCompleto: boolean;
  marca: string | null;
  modelo: string | null;
  numeroDeSerie: string | null;
  placa: string | null;
  enBodega: boolean;
  localidadId: string | null;
  localidadNombre: string | null;
  departamentoId: string | null;
  departamentoNombre: string | null;
  responsable: string | null;
  observaciones: string | null;
}

/** Lo que suman los saldos iniciales (montos con dos decimales). */
export interface TotalesDeSaldosIniciales {
  activos: number;
  costo: string;
  depreciacionAcumuladaContable: string;
  valorEnLibros: string;
  costoFiscal: string;
  baseFiscal: string;
  depreciacionAcumuladaFiscal: string;
}

export interface TotalDeClaseDeSaldos {
  claseId: string;
  clase: string;
  costo: string;
  depreciacionAcumuladaContable: string;
}

/** La pantalla de saldos iniciales: el estado de la carga, el cuadre y cada activo. */
export interface ListaDeSaldosInicialesDto {
  fechaDeInicio: string | null;
  fechaDeCorte: string | null;
  cargaCerrada: boolean;
  totales: TotalesDeSaldosIniciales;
  porClase: TotalDeClaseDeSaldos[];
  saldos: SaldoInicialDto[];
}
