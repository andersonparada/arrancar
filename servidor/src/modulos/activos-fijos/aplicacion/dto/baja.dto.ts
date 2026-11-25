import type { AvisoDeBaja } from '../../dominio/avisos-de-baja.js';
import type { CausaDeBaja, EstadoDeBaja, OrigenDelCostoFiscal, TipoDeActa } from '../../dominio/tipos-de-baja.js';

/** El activo que se dio de baja, lo necesario para imprimir el acta. */
export interface ActivoDeBajaDto {
  id: string;
  codigo: string;
  descripcion: string;
  claseNombre: string;
  marca: string | null;
  modelo: string | null;
  numeroDeSerie: string | null;
  placa: string | null;
  cantidad: number;
}

/** Un componente que se dio de baja junto con su activo principal. */
export interface ComponenteDeBajaDto {
  activoId: string;
  codigo: string;
  descripcion: string;
}

/** Una baja o venta tal como se muestra y se imprime en el acta (dinero como texto con dos decimales). */
export interface BajaDto {
  id: string;
  numero: number;
  anioDeNumero: number;
  activo: ActivoDeBajaDto;
  fecha: string;
  causa: CausaDeBaja;
  descripcion: string;
  autorizadaPor: string;
  destinoDelBien: string | null;
  numeroDeDenuncia: string | null;
  inventarioId: string | null;
  tipoDeActa: TipoDeActa | null;
  tieneActa: boolean;
  tieneDenuncia: boolean;
  costo: string;
  depreciacionAcumuladaContable: string;
  valorEnLibros: string;
  costoFiscal: string;
  baseFiscal: string;
  depreciacionAcumuladaFiscal: string;
  valorFiscalPorDepreciar: string;
  cuotaDelMesContable: string;
  cuotaDelMesFiscal: string;
  comprador: string | null;
  nitDelComprador: string | null;
  precio: string | null;
  iva: string | null;
  serieFel: string | null;
  numeroFel: string | null;
  autorizacionFel: string | null;
  resultadoContable: string | null;
  resultadoFiscal: string | null;
  /** Solo en una venta: de dónde sale el costo fiscal (`criterio_del_contador` lleva su motivo). */
  origenDelCostoFiscal: OrigenDelCostoFiscal | null;
  motivoDelCostoFiscal: string | null;
  estado: EstadoDeBaja;
  anuladaEn: string | null;
  motivoDeAnulacion: string | null;
  /** Los componentes que se dieron de baja junto con este activo (la misma acta). */
  componentes: ComponenteDeBajaDto[];
  avisos: AvisoDeBaja[];
}

/** El precio y el IVA de la venta, como texto con hasta dos decimales. */
export interface SolicitudDeVenta {
  comprador: string;
  nitDelComprador: string;
  precio: string;
  iva: string;
  serieFel: string | null;
  numeroFel: string;
  autorizacionFel: string;
}

/** El costo fiscal que sostiene el contador al vender un bien de control, con su motivo y el documento que lo respalda. */
export interface SolicitudDeCostoFiscalDelContador {
  monto: string;
  motivo: string;
}

/** Lo que se recibe para dar de baja o vender un activo (con sus componentes). */
export interface SolicitudDeBaja {
  activoId: string;
  /** Solo se acepta la del activo entero (la parcial llega con AFI-6). */
  cantidad?: number;
  fecha: string;
  causa: CausaDeBaja;
  descripcion: string;
  autorizadaPor: string;
  destinoDelBien: string | null;
  numeroDeDenuncia: string | null;
  inventarioId: string | null;
  venta: SolicitudDeVenta | null;
  /** Solo al vender un bien de control, y solo con el permiso `activos-fijos.bajas.costo-fiscal-manual`. */
  costoFiscalDelContador?: SolicitudDeCostoFiscalDelContador | null;
  /** Códigos de los componentes de terceros cuya pérdida o destrucción con el principal se confirma. */
  tercerosConfirmados?: string[];
}
