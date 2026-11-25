import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export type CausaDeBaja =
  | 'venta'
  | 'destruccion'
  | 'robo'
  | 'extravio'
  | 'donacion'
  | 'obsolescencia'
  | 'faltante_de_inventario'
  | 'devuelto_al_dueno'
  | 'otra';

export type OrigenDelCostoFiscal = 'en_libros' | 'documentado' | 'sin_documento' | 'criterio_del_contador';

/** Un aviso que el servidor da al registrar: se muestra, nunca bloquea. */
export interface AvisoDeBaja {
  codigo: string;
  mensaje: string;
}

/** La venta: a quién, por cuánto y la factura (FEL) que se emitió afuera; el dinero como texto. */
export interface DatosDeVenta {
  comprador: string;
  nitDelComprador: string;
  precio: string;
  iva: string;
  serieFel: string | null;
  numeroFel: string;
  autorizacionFel: string;
}

/** Lo que se manda para dar de baja o vender un activo. */
export interface DatosDeBaja {
  activoId: string;
  fecha: string;
  causa: CausaDeBaja;
  descripcion: string;
  autorizadaPor: string;
  destinoDelBien: string | null;
  numeroDeDenuncia: string | null;
  venta: DatosDeVenta | null;
  /** Solo al vender un bien de control y solo con el permiso del contador. */
  costoFiscalDelContador: { monto: string; motivo: string } | null;
}

/** Lo que se muestra de una baja ya registrada. */
export interface Baja {
  id: string;
  numero: number;
  anioDeNumero: number;
  causa: CausaDeBaja;
  precio: string | null;
  iva: string | null;
  costoFiscal: string;
  resultadoContable: string | null;
  resultadoFiscal: string | null;
  origenDelCostoFiscal: OrigenDelCostoFiscal | null;
  motivoDelCostoFiscal: string | null;
  avisos: AvisoDeBaja[];
}

export class ApiBajas {
  constructor(private readonly http: ClienteHttp) {}

  registrar(datos: DatosDeBaja) {
    return this.http.crear<Baja>('/activos-fijos/bajas', datos);
  }
}

export const apiBajas = new ApiBajas(clienteHttp);
