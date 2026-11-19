import { fechaLocalEn } from '../../../compartido/dominio/fecha-local.js';
import { RangoDeCargaInvalido } from '../../dominio/errores.js';
import { sumarDiasAFecha } from '../../dominio/fechas-de-publicacion.js';
import { vueltaQueToca, type IntentoHecho, type VueltaProgramada } from '../../dominio/horario-de-carga.js';
import { CargaDelBanguatEnCurso } from '../errores.js';
import type { CargasDeTipos, CerrojoDeCarga } from '../puertos/cargas-de-tipos.js';
import type { ActualizarMonedasDelBanguat } from './actualizar-monedas-del-banguat.js';
import type { ResumenDeConsulta } from './consultar-al-banguat.js';
import type { VueltasDeCarga } from './vueltas-de-carga.js';

/** El reloj de la instalación: el instante, su zona horaria y qué fecha es hoy en ella. */
export interface RelojDeCarga {
  ahora(): Date;
  zona(): Promise<string>;
}

interface Dependencias {
  cerrojo: CerrojoDeCarga;
  cargas: CargasDeTipos;
  vueltas: VueltasDeCarga;
  lista: ActualizarMonedasDelBanguat;
  reloj: RelojDeCarga;
  /** Se avisa cuando se guardó algo, para que el servicio de tipos olvide lo que tenía leído. */
  alGuardar: () => void;
}

/** Lo que pide soporte en «Cargar ahora»: sin fechas, hoy. */
export interface PedidoDeCargaManual {
  usuarioId: string;
  desde?: string;
  hasta?: string;
}

const MAXIMO_DE_DIAS_MANUAL = 366;
const HORAS_DE_LA_BITACORA_A_REVISAR = 36;
const MAXIMO_DE_VUELTAS_POR_REVISION = 3;
const LUNES = 1;

/**
 * La carga de tipos de cambio del Banguat. Una sola a la vez en toda la instalación (cerrojo de PostgreSQL): lo que
 * llegue mientras corre otra no hace nada, y «Cargar ahora» responde 409. Quien la programa es `principal.ts`.
 */
export class CargarTiposDeCambio {
  /** Vueltas que no tuvieron nada que pedir (no dejan fila en la bitácora): se recuerdan para no repetirlas el mismo día. */
  private readonly sinTrabajo: IntentoHecho[] = [];

  constructor(private readonly dependencias: Dependencias) {}

  /** Lo llama el temporizador de 15 minutos: corre las vueltas que toquen a esta hora. Devuelve la última que corrió. */
  async siTocaAhora(): Promise<VueltaProgramada | null> {
    const corrida = await this.dependencias.cerrojo.ejecutarSiLibre(() => this.correrLoQueToca());
    return corrida ?? null;
  }

  /** Al arrancar: la lista de monedas si está vacía o vieja, y el relleno de los últimos 45 días con huecos. */
  async alArrancar(): Promise<void> {
    await this.dependencias.cerrojo.ejecutarSiLibre(async () => {
      const { lista, vueltas } = this.dependencias;
      if (await lista.hayQueActualizarAlArrancar()) await lista.ejecutar();
      await vueltas.rellenar('arranque', await this.hoy());
      this.dependencias.alGuardar();
    });
  }

  /**
   * «Cargar ahora»: el rango pedido (hasta 366 días, sin pasar de mañana) para las monedas activas con código.
   * @throws CargaDelBanguatEnCurso si otra carga corre.
   * @throws RangoDeCargaInvalido si el rango no sirve.
   */
  async cargarAhora(pedido: PedidoDeCargaManual): Promise<ResumenDeConsulta[]> {
    const hoy = await this.hoy();
    const { desde = hoy, hasta = hoy } = pedido;
    revisarRango({ hoy, desde, hasta });
    const hecho = await this.dependencias.cerrojo.ejecutarSiLibre(async () => ({
      resumenes: await this.dependencias.vueltas.manual({ hoy, desde, hasta, usuarioId: pedido.usuarioId }),
    }));
    if (hecho === null) throw new CargaDelBanguatEnCurso();
    this.dependencias.alGuardar();
    return hecho.resumenes;
  }

  private async hoy(): Promise<string> {
    return fechaLocalEn(this.dependencias.reloj.ahora(), await this.dependencias.reloj.zona());
  }

  private async correrLoQueToca(): Promise<VueltaProgramada | null> {
    let ultima: VueltaProgramada | null = null;
    for (let corridas = 0; corridas < MAXIMO_DE_VUELTAS_POR_REVISION; corridas++) {
      const vuelta = await this.vueltaQueToca();
      if (!vuelta) break;
      await this.correr(vuelta);
      ultima = vuelta;
    }
    return ultima;
  }

  private async vueltaQueToca(): Promise<VueltaProgramada | null> {
    const { cargas, reloj } = this.dependencias;
    const ahora = reloj.ahora();
    const zona = await reloj.zona();
    const desde = new Date(ahora.getTime() - HORAS_DE_LA_BITACORA_A_REVISAR * 3_600_000);
    const hoy = fechaLocalEn(ahora, zona);
    return vueltaQueToca({
      ahora,
      zona,
      intentos: [...(await cargas.consultasDesde(desde)), ...this.sinTrabajo],
      hayDolarDeHoy: await this.hayDolarDeHoy(hoy),
    });
  }

  /** Sin el dólar activo con código no hay nada que esperar de él. */
  private async hayDolarDeHoy(hoy: string): Promise<boolean> {
    const { cargas } = this.dependencias;
    if (!(await cargas.monedasACargar()).some((m) => m.moneda === 'USD')) return true;
    return (await cargas.fechasConTipoDelBanguat('USD', hoy, hoy)).length > 0;
  }

  private async correr(vuelta: VueltaProgramada): Promise<void> {
    const { vueltas, lista, reloj } = this.dependencias;
    const hoy = await this.hoy();
    const resumenes = await vueltas[vuelta](hoy);
    if (vuelta === 'manana') {
      await vueltas.rellenar('relleno', hoy);
      if (new Date(`${hoy}T00:00:00Z`).getUTCDay() === LUNES) await lista.ejecutar();
    }
    if (resumenes.length === 0) this.sinTrabajo.push({ vuelta, iniciadaEn: reloj.ahora() });
    this.dependencias.alGuardar();
  }
}

function revisarRango({ hoy, desde, hasta }: { hoy: string; desde: string; hasta: string }): void {
  if (desde > hasta) throw new RangoDeCargaInvalido('La fecha inicial no puede ser posterior a la final.');
  if (hasta > sumarDiasAFecha(hoy, 1)) throw new RangoDeCargaInvalido('La fecha final no puede pasar de mañana.');
  if (sumarDiasAFecha(desde, MAXIMO_DE_DIAS_MANUAL) <= hasta)
    throw new RangoDeCargaInvalido(`El rango no puede pasar de ${MAXIMO_DE_DIAS_MANUAL} días.`);
}
