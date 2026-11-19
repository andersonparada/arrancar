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

/** Cómo publica el Banguat un código; lo fija una migración, nunca el usuario. */
export type ConvencionDelBanguat = 'quetzales_por_unidad' | 'usd_por_unidad' | 'unidades_por_usd';

/** Una opción del selector «Moneda del Banguat». */
export interface OpcionDelBanguat {
  codigo: number;
  descripcion: string;
  disponible: boolean;
  excluida: boolean;
  /** Nula es «sin comprobar»: el código no se ofrece ni se carga. */
  convencion: ConvencionDelBanguat | null;
  /** Se puede unir a una moneda: disponible, no excluida y con convención. Solo estas se habilitan. */
  ofrecida: boolean;
  /** La moneda que ya tiene este código, si alguna. */
  asignadaA: string | null;
  vistaPorUltimaVez: string;
}

export type ResultadoDeConsulta =
  | 'exito'
  | 'sin_datos'
  | 'error'
  | 'valor_fuera_de_rango'
  | 'valor_ambiguo'
  | 'variacion_excesiva'
  | 'sin_dolar_del_dia'
  | 'convencion_dudosa'
  | 'sin_convencion';

/** Cómo terminó la actualización de la lista de monedas del Banguat. */
export interface ConsultaDeLaLista {
  resultado: ResultadoDeConsulta;
  nuevas: number;
  noDisponibles: number;
  detalle: string | null;
  hechaEn: string;
}

/** La respuesta al iniciar «Cargar ahora» o «Actualizar lista»: siguen en segundo plano; `iniciadaEn` es la hora del servidor. */
export interface CargaIniciada {
  enCurso: boolean;
  iniciadaEn: string;
}

/** Un día de la muestra: lo publicado, el dólar de ese día y lo que da en quetzales. Los decimales viajan como texto. */
export interface ValorDeLaMuestra {
  fecha: string;
  compra: string | null;
  venta: string | null;
  /** El promedio de compra y venta, en la convención del código. */
  promedio: string;
  /** El dólar del Banguat guardado de esa fecha; nulo si aún no está. */
  dolar: string | null;
  /** Quetzales por unidad; nulo si falta el dólar de ese día. */
  referencia: string | null;
}

/** Los valores de los últimos 7 días de un código del Banguat; no se guardan. */
export interface MuestraDelBanguat {
  codigo: number;
  descripcion: string;
  moneda: string | null;
  desde: string;
  hasta: string;
  resultado: ResultadoDeConsulta;
  convencion: ConvencionDelBanguat;
  valores: ValorDeLaMuestra[];
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
    return this.http.crear<CargaIniciada>('/monedas/banguat/actualizar');
  }

  muestra(codigoBanguat: number, moneda?: string) {
    return this.http.obtener<MuestraDelBanguat>(`/monedas/banguat/${codigoBanguat}/muestra`, { moneda });
  }
}

export const apiMonedas = new ApiMonedas(clienteHttp);
