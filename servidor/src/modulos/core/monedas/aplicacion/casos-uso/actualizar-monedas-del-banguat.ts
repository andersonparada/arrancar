import { FuenteNoDisponible, RespuestaInvalida } from '../../dominio/errores.js';
import type { MonedaDelBanguat } from '../../dominio/publicacion.js';
import { CargaDelBanguatEnCurso } from '../errores.js';
import type {
  CargasDeTipos,
  CerrojoDeCarga,
  ConsultaHecha,
  ResultadoDeActualizarLista,
  ResultadoDeLaConsulta,
} from '../puertos/cargas-de-tipos.js';
import type { FuenteDeTiposDeCambio } from '../puertos/fuente-de-tipos-de-cambio.js';

interface Dependencias {
  fuente: FuenteDeTiposDeCambio;
  cargas: CargasDeTipos;
  cerrojo: CerrojoDeCarga;
  ahora: () => Date;
}

export interface OpcionesDeActualizacion {
  disparadaPor?: string | null;
}

interface Intento {
  iniciadaEn: Date;
  disparadaPor: string | null;
}

const LARGO_DE_LA_DESCRIPCION = 120;
const DIAS_PARA_CONSIDERARLA_VIEJA = 7;
const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;

/** Quita lo que no sirve de la lista del Banguat: códigos repetidos o inválidos y descripciones vacías (se recortan a 120). */
function listaLimpia(lista: readonly MonedaDelBanguat[]): MonedaDelBanguat[] {
  const limpias = new Map<number, MonedaDelBanguat>();
  for (const { codigo, descripcion } of lista) {
    const texto = descripcion.trim().slice(0, LARGO_DE_LA_DESCRIPCION).trim();
    if (Number.isInteger(codigo) && codigo > 0 && codigo <= 32767 && texto && !limpias.has(codigo))
      limpias.set(codigo, { codigo, descripcion: texto });
  }
  return [...limpias.values()];
}

/**
 * Pone al día `core.monedas_del_banguat` con `VariablesDisponibles`. Una respuesta vacía o con error no toca nada (un
 * Banguat caído no deja la lista «no disponible»); cada intento queda en la bitácora con la vuelta `lista`.
 */
export class ActualizarMonedasDelBanguat {
  constructor(private readonly dependencias: Dependencias) {}

  /** Sin el cerrojo: lo usa quien ya lo tiene (la carga del arranque y la vuelta de la mañana). */
  async ejecutar(opciones: OpcionesDeActualizacion = {}): Promise<ResultadoDeActualizarLista | null> {
    const { fuente, cargas, ahora } = this.dependencias;
    const intento: Intento = { iniciadaEn: ahora(), disparadaPor: opciones.disparadaPor ?? null };
    try {
      const lista = listaLimpia(await fuente.monedasDisponibles());
      if (lista.length === 0) return await this.sinCambios(intento, 'sin_datos', null);
      return await cargas.actualizarLista(lista, ahora(), this.consulta(intento, 'exito', null));
    } catch (error) {
      if (!(error instanceof FuenteNoDisponible || error instanceof RespuestaInvalida)) throw error;
      return this.sinCambios(intento, 'error', error.message);
    }
  }

  /** A pedido de soporte: si otra carga corre, falla con 409. */
  async ejecutarAPedido(usuarioId: string): Promise<ResultadoDeActualizarLista | null> {
    const resultado = await this.dependencias.cerrojo.ejecutarSiLibre(() =>
      this.ejecutar({ disparadaPor: usuarioId }).then((hecho) => ({ hecho })),
    );
    if (resultado === null) throw new CargaDelBanguatEnCurso();
    return resultado.hecho;
  }

  /** Al arrancar: si la lista solo tiene la semilla o se vio por última vez hace más de 7 días. */
  async hayQueActualizarAlArrancar(): Promise<boolean> {
    const { monedas, vistaPorUltimaVez } = await this.dependencias.cargas.estadoDeLaLista();
    if (monedas <= 1 || !vistaPorUltimaVez) return true;
    return (
      this.dependencias.ahora().getTime() - vistaPorUltimaVez.getTime() > DIAS_PARA_CONSIDERARLA_VIEJA * UN_DIA_EN_MS
    );
  }

  private async sinCambios(intento: Intento, resultado: ResultadoDeLaConsulta, detalle: string | null): Promise<null> {
    await this.dependencias.cargas.guardar(this.consulta(intento, resultado, detalle), []);
    return null;
  }

  private consulta(intento: Intento, resultado: ResultadoDeLaConsulta, detalle: string | null): ConsultaHecha {
    return {
      iniciadaEn: intento.iniciadaEn,
      terminadaEn: this.dependencias.ahora(),
      operacion: 'VariablesDisponibles',
      vuelta: 'lista',
      moneda: null,
      codigoBanguat: null,
      desde: null,
      hasta: null,
      resultado,
      filasRechazadas: 0,
      detalle: detalle?.slice(0, 500) ?? null,
      disparadaPor: intento.disparadaPor,
    };
  }
}
