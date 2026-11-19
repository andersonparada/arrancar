import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import type { AvisosEntreModulos } from '../../../../core/contratos/mediador.contratos.js';
import { MovimientoDeCajaChica } from '../../../dominio/errores-de-fondos.js';
import { MODULO_DE_ORIGEN, type CambioDeMonto } from '../../../dominio/fondos.js';
import { exigirFondoAbierto } from '../../../dominio/reglas-del-fondo.js';
import { AnuladorDeCambios } from './anulador-de-cambios.js';
import type { DependenciasDeFondos } from './dependencias-de-fondos.js';
import { LectorDelFondo } from './lector-del-fondo.js';

/** Lo que trae el aviso `bancos.movimiento_por_cambiar`. */
export type AvisoDeMovimientoPorCambiar = AvisosEntreModulos['bancos.movimiento_por_cambiar'];

const SIN_ACCESO_AL_FONDO =
  'Ese movimiento es de un fondo de Caja chica que usted no tiene asignado: pida a quien lo lleva que lo corrija desde Caja chica.';

/**
 * Responde al aviso `bancos.movimiento_por_cambiar` (§5.9 del diseño), que llega dentro de la transacción de Bancos antes
 * de que cambie nada. Busca el cambio de monto cuyo cheque o nota es ese movimiento; sin él no hace nada (idempotente),
 * salvo que el movimiento diga ser de Caja chica y el usuario no vea ese fondo (RLS): entonces se rechaza para no dejar
 * el fondo con un cambio sin respaldo. Si Bancos anula la apertura o un aumento, se rechaza con el fondo usado y, si no,
 * se anula el cambio (y el fondo, si era la apertura) con la forma y la fecha del aviso, sin volver a ordenar a Bancos.
 * Un fondo cerrado rechaza todo (`fondo_no_disponible`). La disminución, el depósito del cierre y cualquier otro cambio se rechazan. Los eventos se publican al confirmar la
 * transacción de Bancos.
 */
export class AtenderMovimientoDeFondoPorCambiar {
  private readonly lector: LectorDelFondo;
  private readonly anulador: AnuladorDeCambios;

  constructor(private readonly dependencias: DependenciasDeFondos) {
    this.lector = new LectorDelFondo(dependencias);
    this.anulador = new AnuladorDeCambios(dependencias);
  }

  /** @throws MovimientoDeCajaChica, FondoConMovimientos, FondoNoDisponible (fondo cerrado) */
  async ejecutar(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<void> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const eventos = await unidadDeTrabajo.ejecutar(operador, () => this.atender(operador, aviso));
    await publicadorEventos.publicar(eventos);
  }

  private async atender(operador: Operador, aviso: AvisoDeMovimientoPorCambiar): Promise<EventoDominio[]> {
    const encontrado = await this.dependencias.fondos.cambioDelMovimiento(aviso.movimientoId);
    if (!encontrado) return this.sinCambio(aviso);
    const { cambio } = encontrado;
    if (aviso.cambio !== 'anular' || !['apertura', 'aumento'].includes(cambio.tipo)) throw new MovimientoDeCajaChica();
    if (cambio.estado === 'anulado') return [];
    return this.anular(operador, { fondoId: encontrado.fondoId, cambio, aviso });
  }

  /** Sin cambio visible solo se deja pasar lo que no dice ser de Caja chica. */
  private sinCambio(aviso: AvisoDeMovimientoPorCambiar): EventoDominio[] {
    if (aviso.moduloDeOrigen === MODULO_DE_ORIGEN) throw new MovimientoDeCajaChica(SIN_ACCESO_AL_FONDO);
    return [];
  }

  private async anular(
    operador: Operador,
    por: { fondoId: string; cambio: CambioDeMonto; aviso: AvisoDeMovimientoPorCambiar },
  ): Promise<EventoDominio[]> {
    const { fondoId, cambio, aviso } = por;
    const fondo = await this.lector.bloquear(fondoId);
    exigirFondoAbierto(fondo);
    await this.anulador.revisar(fondo, cambio);
    const datos = {
      motivo: aviso.motivo ?? 'Anulado desde Bancos',
      enBancos: aviso.formaDeAnulacion ?? 'sin_inverso',
      fechaDelInverso: aviso.fecha,
    };
    return this.anulador.anular(operador, { fondo, cambio, datos });
  }
}
