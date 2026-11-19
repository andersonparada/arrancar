import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { AvisosEntreModulos } from '../../../../core/contratos/mediador.contratos.js';
import { MovimientoDeCajaChica } from '../../../dominio/errores-de-fondos.js';
import { LectorDelFondo } from '../fondos/lector-del-fondo.js';
import { AnuladorDeReposiciones } from './anulador-de-reposiciones.js';
import type { DependenciasDeReposiciones } from './dependencias-de-reposiciones.js';

/** Lo que trae el aviso `bancos.movimiento_por_cambiar`. */
type AvisoDeMovimientoPorCambiar = AvisosEntreModulos['bancos.movimiento_por_cambiar'];

/**
 * Responde al aviso `bancos.movimiento_por_cambiar` (§5.9) cuando el cheque o la nota es el de una reposición: si Bancos la
 * anula, anula la reposición con la forma y la fecha del aviso, sin volver a ordenar a Bancos (el banco pagado, el fondo
 * cerrado o el efectivo que no alcanza lo rechazan); cualquier otro cambio se rechaza con `MovimientoDeCajaChica`. Devuelve
 * `false` si el movimiento no es de una reposición que el usuario vea, para que lo atienda el manejador de los fondos. Los
 * eventos se publican al confirmar la transacción de Bancos.
 */
export class AtenderMovimientoDeReposicionPorCambiar {
  private readonly lectorDelFondo: LectorDelFondo;
  private readonly anulador: AnuladorDeReposiciones;

  constructor(private readonly dependencias: DependenciasDeReposiciones) {
    this.lectorDelFondo = new LectorDelFondo({
      fondos: dependencias.fondos,
      consultas: dependencias.consultasDeFondos,
    });
    this.anulador = new AnuladorDeReposiciones(dependencias);
  }

  /** @throws MovimientoDeCajaChica, FondoNoDisponible, ReposicionDelCierre, ReposicionCobrada, ComprobantesMayoresQueElEfectivo */
  async ejecutar(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<boolean> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const atendido = await unidadDeTrabajo.ejecutar(operador, () => this.atender(operador, aviso));
    await publicadorEventos.publicar(atendido.eventos);
    return atendido.eraDeUnaReposicion;
  }

  private async atender(operador: Operador, aviso: AvisoDeMovimientoPorCambiar) {
    const visto = await this.dependencias.reposiciones.delMovimiento(aviso.movimientoId);
    if (!visto) return { eraDeUnaReposicion: false, eventos: [] as EventoDominio[] };
    if (aviso.cambio !== 'anular') throw new MovimientoDeCajaChica();
    if (visto.estado === 'anulada') return { eraDeUnaReposicion: true, eventos: [] as EventoDominio[] };
    const fondo = await this.lectorDelFondo.bloquear(visto.fondoId);
    const reposicion = (await this.dependencias.reposiciones.bloquear(visto.id)) ?? visto;
    await this.anulador.revisar({ fondo, reposicion });
    const datos = {
      motivo: aviso.motivo ?? 'Anulado desde Bancos',
      enBancos: aviso.formaDeAnulacion ?? 'sin_inverso',
      fechaDelInverso: aviso.fecha,
    };
    return { eraDeUnaReposicion: true, eventos: await this.anulador.anular(operador, { reposicion, datos }) };
  }
}
