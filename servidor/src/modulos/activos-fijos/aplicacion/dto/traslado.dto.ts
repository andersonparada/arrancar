import type { EstadoDeTraslado } from '../../dominio/traslado.js';

/** Un activo en la boleta; si es componente, de cuál activo principal. */
export interface RenglonDeBoletaDto {
  activoId: string;
  codigo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  numeroDeSerie: string | null;
  placa: string | null;
  cantidad: number;
  componenteDe: string | null;
}

/** La boleta de traslado (la responsiva): todos los activos que se trasladaron juntos, con su destino. */
export interface BoletaDto {
  grupoId: string;
  numero: number;
  anioDeNumero: number;
  /** El nombre que la empresa le da a la responsiva (`activos-fijos.documentos.nombre_de_responsiva`). */
  titulo: string;
  fecha: string;
  localidadNombre: string | null;
  departamentoNombre: string | null;
  responsable: string | null;
  recibidoPor: string;
  motivo: string;
  aBodega: boolean;
  estado: EstadoDeTraslado;
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  renglones: RenglonDeBoletaDto[];
}

/** Un activo que se traslada. `cantidad` solo se acepta si es la del activo entero (la parcial llega con AFI-6). */
export interface RenglonDeTraslado {
  activoId: string;
  cantidad?: number;
}

/** Lo que se recibe para trasladar uno o varios activos con una sola boleta. */
export interface SolicitudDeTraslado {
  fecha: string;
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string | null;
  recibidoPor: string;
  motivo: string;
  aBodega: boolean;
  /** Solo con `aBodega`: marca los bienes como ociosos (con la fecha y el motivo del traslado). */
  marcarOcioso: boolean;
  renglones: RenglonDeTraslado[];
}
