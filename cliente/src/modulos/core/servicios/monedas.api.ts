import { clienteHttp, type ClienteHttp } from './cliente-http';

/** Una moneda del catálogo de la instalación, como la entrega `GET /api/monedas`. */
export interface Moneda {
  codigo: string;
  nombre: string;
  simbolo: string;
  decimales: number;
  activa: boolean;
  codigoBanguat: number | null;
  letrasSingular: string | null;
  letrasPlural: string | null;
  descripcionBanguat: string | null;
  /** Ya hay tipos del Banguat cargados con su código: solo se puede dejar el mismo o quitarlo. */
  tieneSerieDelBanguat: boolean;
}

/** Una opción del selector «Moneda del Banguat». */
export interface OpcionDelBanguat {
  codigo: number;
  descripcion: string;
  disponible: boolean;
  excluida: boolean;
  /** La moneda que ya tiene este código, si alguna. */
  asignadaA: string | null;
  vistaPorUltimaVez: string;
}

export type ResultadoDeConsulta =
  'exito' | 'sin_datos' | 'error' | 'valor_fuera_de_rango' | 'valor_ambiguo' | 'variacion_excesiva';

/** Cómo terminó la actualización de la lista de monedas del Banguat. */
export interface ConsultaDeLaLista {
  resultado: ResultadoDeConsulta;
  nuevas: number;
  noDisponibles: number;
  detalle: string | null;
  hechaEn: string;
}

export interface ListaActualizada {
  consulta: ConsultaDeLaLista;
  lista: OpcionDelBanguat[];
}

/** Los valores de los últimos 7 días de un código del Banguat; no se guardan. */
export interface MuestraDelBanguat {
  codigo: number;
  descripcion: string;
  moneda: string | null;
  desde: string;
  hasta: string;
  resultado: ResultadoDeConsulta;
  valores: { fecha: string; referencia: string }[];
  rechazadas: { fecha: string; motivo: string }[];
  mensaje: string | null;
}

/** Lo que soporte puede cambiar de una moneda; lo que no viene no se toca. */
export interface CambiosDeMoneda {
  activa?: boolean;
  codigoBanguat?: number | null;
  letrasSingular?: string | null;
  letrasPlural?: string | null;
}

/** Monedas del catálogo y su unión con el Banguat (soporte). */
export class ApiMonedas {
  constructor(private readonly http: ClienteHttp) {}

  listar() {
    return this.http.obtener<Moneda[]>('/monedas');
  }

  editar(codigo: string, cambios: CambiosDeMoneda) {
    return this.http.modificar<Moneda>(`/monedas/${codigo}`, cambios);
  }

  delBanguat() {
    return this.http.obtener<OpcionDelBanguat[]>('/monedas/banguat');
  }

  actualizarLista() {
    return this.http.crear<ListaActualizada>('/monedas/banguat/actualizar');
  }

  muestra(codigoBanguat: number, moneda?: string) {
    return this.http.obtener<MuestraDelBanguat>(`/monedas/banguat/${codigoBanguat}/muestra`, { moneda });
  }
}

export const apiMonedas = new ApiMonedas(clienteHttp);
