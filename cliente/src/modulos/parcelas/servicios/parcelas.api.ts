import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';
import type { Medicion } from './mediciones.api';

export type FormaDeTenencia =
  'propia' | 'posesion' | 'copropiedad' | 'arrendada' | 'usufructo' | 'comodato' | 'aparceria' | 'otra';

/** Parcela tal como la manda el servidor; las superficies viajan como texto, en m² con dos decimales. */
export interface Parcela {
  id: string;
  localidadId: string;
  localidadNombre: string;
  parcelaMadreId: string | null;
  parcelaMadreCodigo: string | null;
  nivel: number;
  tipoId: string;
  tipoNombre: string;
  codigo: string;
  nombre: string;
  formaDeTenencia: FormaDeTenencia;
  superficieTotalM2: string | null;
  superficieUtilM2: string | null;
  latitud: string | null;
  longitud: string | null;
  colindanciaNorte: string | null;
  colindanciaSur: string | null;
  colindanciaOriente: string | null;
  colindanciaPoniente: string | null;
  activo: boolean;
  observaciones: string | null;
  /** Avisos que no bloquean (el punto fuera de Guatemala, por ejemplo); el servidor los redacta. */
  avisos: string[];
}

/** Una parcela con sus subparcelas, para armar el árbol de una localidad. */
export interface NodoDeParcela extends Parcela {
  hijas: NodoDeParcela[];
}

/** Un inmueble registral ligado a la parcela, con los m² de esa finca que abarca (si se conocen). */
export interface InmuebleDeParcela {
  inmuebleId: string;
  inmuebleNombre: string;
  superficieM2: string | null;
}

export interface FichaDeParcela extends Parcela {
  mediciones: Medicion[];
  inmuebles: InmuebleDeParcela[];
  hijasActivas: number;
}

export interface LigaConInmueble {
  inmuebleId: string;
  superficieM2: string | null;
}

/** Lo que se puede cambiar de una parcela ya creada. */
export type CambioDeParcela = Pick<
  Parcela,
  | 'tipoId'
  | 'nombre'
  | 'formaDeTenencia'
  | 'latitud'
  | 'longitud'
  | 'colindanciaNorte'
  | 'colindanciaSur'
  | 'colindanciaOriente'
  | 'colindanciaPoniente'
  | 'observaciones'
> & { inmuebles: LigaConInmueble[] };

/** La primera medición, tal como se manda al crear la parcela. */
export interface DatosDeMedicion {
  vigenteDesde: string;
  fuente: 'escritura' | 'plano_topografico' | 'gps' | 'estimacion' | 'otra';
  cantidadOriginal: string;
  unidadOriginal: 'm2' | 'hectarea' | 'manzana' | 'cuerda' | 'vara_cuadrada' | 'caballeria';
  varasPorLadoDeCuerda: number | null;
  cantidadUtil: string | null;
  documento: string | null;
}

export interface DatosDeParcela extends CambioDeParcela {
  localidadId: string;
  parcelaMadreId: string | null;
  codigo: string;
  medicion: DatosDeMedicion | null;
}

/** Los filtros de la lista; `soloActivas` se manda como texto. */
export interface FiltrosDeParcelas {
  localidadId?: string | null;
  parcelaMadreId?: string;
  texto?: string;
  soloActivas?: boolean;
}

const RUTA = '/parcelas/parcelas';

/** Los filtros como consulta de la URL: solo lo que tiene valor. */
function consultaDe(filtros: FiltrosDeParcelas): Record<string, string> {
  const consulta: Record<string, string> = {};
  if (filtros.localidadId) consulta.localidadId = filtros.localidadId;
  if (filtros.parcelaMadreId) consulta.parcelaMadreId = filtros.parcelaMadreId;
  if (filtros.texto?.trim()) consulta.texto = filtros.texto.trim();
  if (filtros.soloActivas) consulta.soloActivas = 'true';
  return consulta;
}

export class ApiParcelas {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar(filtros: FiltrosDeParcelas = {}) {
    return this.http.obtener<Parcela[]>(RUTA, consultaDe(filtros));
  }

  /** Las parcelas armadas como árbol (las de nivel 1 con sus subparcelas), por localidad. */
  arbol(filtros: FiltrosDeParcelas = {}) {
    return this.http.obtener<NodoDeParcela[]>(RUTA, { ...consultaDe(filtros), arbol: 'true' });
  }

  obtener(id: string) {
    return this.http.obtener<FichaDeParcela>(`${RUTA}/${id}`);
  }

  crear(datos: DatosDeParcela) {
    return this.http.crear<FichaDeParcela>(RUTA, datos);
  }

  actualizar(id: string, datos: CambioDeParcela) {
    return this.http.reemplazar<FichaDeParcela>(`${RUTA}/${id}`, datos);
  }

  inactivar(id: string) {
    return this.http.crear<Parcela>(`${RUTA}/${id}/inactivar`, {});
  }

  reactivar(id: string) {
    return this.http.crear<Parcela>(`${RUTA}/${id}/reactivar`, {});
  }

  eliminar(id: string) {
    return this.http.eliminar(`${RUTA}/${id}`);
  }
}

export const apiParcelas = new ApiParcelas(clienteHttp);
