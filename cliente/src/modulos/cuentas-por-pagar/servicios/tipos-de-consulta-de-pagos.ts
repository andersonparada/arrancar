import type { ContrasenaDelPago, EstadoDeUnPago, FormaDePago, LineaSolicitada } from './tipos-de-pagos';
import type { OrigenDelDocumento, TipoDeDocumento } from './tipos';

/** Una fila de la lista de pagos. Dinero como texto con dos decimales. */
export interface PagoResumen {
  id: string;
  numero: string;
  proveedor: { id: string; nombre: string; nit: string | null };
  contrasenas: ContrasenaDelPago[];
  forma: FormaDePago;
  fecha: string;
  posfechado: boolean;
  monto: string;
  estado: EstadoDeUnPago;
  fechaDeAnulacion: string | null;
  movimiento: { cuentaBancariaId: string; cuentaBancariaNombre: string; numero: number | null } | null;
  retiro: { id: string; numero: string; custodio: string } | null;
}

export interface PaginaDePagos {
  elementos: PagoResumen[];
  total: number;
}

export type EstadoBuscadoDePago = 'vigente' | 'anulado' | 'todos';

/** Lo que se manda a `GET /pagos`; lo que falta es «todos». */
export interface ConsultaDePagos {
  proveedorId?: string;
  forma?: FormaDePago;
  estado: EstadoBuscadoDePago;
  posfechado?: boolean;
  desde?: string;
  hasta?: string;
  cuentaBancariaId?: string;
  pagina: number;
  limite: number;
}

export interface RetencionDeLaLinea {
  impuesto: 'iva' | 'isr';
  monto: string;
  fecha: string;
  constanciaNumero: string | null;
  porEmitir: boolean;
}

/** Lo que el pago entrega a un cargo, con lo que la ficha muestra de él hoy. */
export interface LineaDeLaFicha {
  documentoId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  origen: OrigenDelDocumento;
  total: string;
  retenciones: string;
  contrasena: ContrasenaDelPago;
  retencionDescontada: string;
  monto: string;
  cubre: string;
  notasAplicadas: string;
  saldoDelDocumento: string;
  /** Residuo de centavos que se puede dar por saldado; `0.00` si no hay o no se puede. */
  diferenciaOfrecible: string;
  retencionesDelLibro: RetencionDeLaLinea[];
}

export interface MovimientoDeLaFicha {
  id: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  tipo: 'cheque' | 'nota_de_debito' | 'nota_de_credito';
  numero: number;
  fecha: string;
  conciliado: boolean;
  anulado: boolean;
}

/** El pago completo para su ficha, con lo que el servidor dice que se puede hacer con él. */
export interface FichaDePago {
  id: string;
  numero: string;
  contrasenas: ContrasenaDelPago[];
  proveedor: { id: string; nombre: string; nit: string | null };
  beneficiario: string;
  forma: FormaDePago;
  fecha: string;
  posfechado: boolean;
  monto: string;
  observaciones: string | null;
  motivo: string | null;
  conCargaCerrada: boolean | null;
  retiroId: string | null;
  recibidoPor: string | null;
  motivoSinBancarizar: string | null;
  estado: EstadoDeUnPago;
  anulacion: { fecha: string; motivo: string } | null;
  diferencias: LineaSolicitada[];
  referencia: string | null;
  movimiento: MovimientoDeLaFicha | null;
  conciliado: boolean;
  retiro: { id: string; numero: string; custodio: string; estado: string } | null;
  aplicaciones: LineaDeLaFicha[];
  creadoPorNombre: string | null;
  creadoEn: string;
  puedeAnular: boolean;
  puedeReaplicar: boolean;
  puedeSaldarDiferencia: boolean;
}

export interface SolicitudDeAnulacion {
  motivo: string;
  fecha?: string;
}

export interface SolicitudDeReaplicacion {
  motivo: string;
  aplicaciones: LineaSolicitada[];
}

export interface SolicitudDeDiferencia {
  cargoId: string;
  monto: string;
  fecha?: string;
}

export interface DocumentoDelComprobante {
  documentoId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  origen: OrigenDelDocumento;
  total: string;
  retenciones: string;
  notasAplicadas: string;
  retencionDescontada: string;
  constancias: RetencionDeLaLinea[];
  pagado: string;
  cubre: string;
  saldo: string;
}

export interface ContrasenaDelComprobante {
  id: string;
  numero: string;
  documentos: DocumentoDelComprobante[];
  pagado: string;
}

export interface FirmaDelComprobante {
  rotulo: string;
  nombre: string | null;
}

/** El comprobante listo para imprimir en original y copia. No es un documento tributario. */
export interface ComprobanteDePago {
  titulo: string;
  esReciboDeEfectivo: boolean;
  hojas: ['Original', 'Copia'];
  empresa: { nombre: string; nit: string | null; razonSocial: string | null; nombreComercial: string | null };
  proveedor: { id: string; nombre: string; nit: string | null };
  beneficiario: string;
  pago: {
    id: string;
    numero: string;
    forma: FormaDePago;
    fecha: string;
    posfechado: boolean;
    estado: EstadoDeUnPago;
    anulacion: { fecha: string; motivo: string } | null;
    referencia: string | null;
    motivo: string | null;
    observaciones: string | null;
  };
  medio: { cuentaBancariaNombre: string; tipo: string; numero: number } | null;
  retiro: { numero: string; custodio: string } | null;
  contrasenas: ContrasenaDelComprobante[];
  totalPagado: string;
  totalRetenciones: string;
  totalCubierto: string;
  totalEnLetras: string;
  leyendas: string[];
  firmas: { entrega: FirmaDelComprobante; recibe: FirmaDelComprobante };
}
