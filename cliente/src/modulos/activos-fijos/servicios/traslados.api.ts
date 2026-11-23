import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

/** Un activo en la boleta; si es componente, de cuál activo principal. */
export interface RenglonDeBoleta {
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

/** La boleta de traslado (la responsiva): los activos que se trasladaron juntos, con su destino. */
export interface Boleta {
  grupoId: string;
  numero: number;
  anioDeNumero: number;
  /** El nombre que la empresa le da a la responsiva. */
  titulo: string;
  fecha: string;
  localidadNombre: string | null;
  departamentoNombre: string | null;
  responsable: string | null;
  recibidoPor: string;
  motivo: string;
  aBodega: boolean;
  estado: 'vigente' | 'anulado';
  anuladoEn: string | null;
  motivoDeAnulacion: string | null;
  renglones: RenglonDeBoleta[];
}

/** Lo que se manda para trasladar uno o varios activos con una sola boleta. */
export interface DatosDeTraslado {
  fecha: string;
  localidadId: string | null;
  departamentoId: string | null;
  responsable: string | null;
  recibidoPor: string;
  motivo: string;
  aBodega: boolean;
  marcarOcioso: boolean;
  renglones: { activoId: string }[];
}

export class ApiTraslados {
  constructor(private readonly http: ClienteHttp) {}

  trasladar(datos: DatosDeTraslado) {
    return this.http.crear<Boleta>('/activos-fijos/traslados', datos);
  }

  anular(grupoId: string, motivo: string) {
    return this.http.crear<Boleta>(`/activos-fijos/traslados/${grupoId}/anular`, { motivo });
  }

  boleta(grupoId: string) {
    return this.http.obtener<Boleta>(`/activos-fijos/traslados/${grupoId}/boleta`);
  }
}

export const apiTraslados = new ApiTraslados(clienteHttp);
