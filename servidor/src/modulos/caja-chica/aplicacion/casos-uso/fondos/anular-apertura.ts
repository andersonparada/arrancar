import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { FondoNoDisponible } from '../../../dominio/errores-de-fondos.js';
import { MODULO_DE_ORIGEN, type CambioDeMonto, type Fondo } from '../../../dominio/fondos.js';
import { exigirAperturaVigente } from '../../../dominio/reglas-del-fondo.js';
import type { FondoDto } from '../../dto/fondos.dto.js';
import { AnuladorDeCambios, type DatosDeAnularElCambio } from './anulador-de-cambios.js';
import type { DependenciasDeFondos } from './dependencias-de-fondos.js';
import { LectorDelFondo } from './lector-del-fondo.js';

/** El motivo (queda en la auditoría) y, si Bancos hace un inverso, su fecha. */
export interface PeticionDeAnularApertura {
  fondoId: string;
  motivo: string;
  fecha?: string;
}

/**
 * Anula la apertura de un fondo que no se ha usado (`fondos.cerrar`): ordena a Bancos anular el cheque o la nota, deja la
 * apertura `anulada`, cierra el fondo con el motivo y audita `anular` con el fondo como estaba. Se rechaza si el fondo
 * ya tiene comprobantes, arqueos, vales, reposiciones u otros cambios de monto. Publica `cambio_de_monto_anulado`.
 */
export class AnularApertura {
  private readonly lector: LectorDelFondo;
  private readonly anulador: AnuladorDeCambios;

  constructor(private readonly dependencias: DependenciasDeFondos) {
    this.lector = new LectorDelFondo(dependencias);
    this.anulador = new AnuladorDeCambios(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, FondoNoDisponible, AperturaYaAnulada, FondoConMovimientos y lo que rechace Bancos
   * (por ejemplo, un cheque ya cobrado).
   */
  async ejecutar(operador: Operador, pedido: PeticionDeAnularApertura): Promise<FondoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.anular(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async anular(operador: Operador, pedido: PeticionDeAnularApertura) {
    const { fondos } = this.dependencias;
    const fondo = await this.lector.bloquear(pedido.fondoId);
    const apertura = (await fondos.cambios(fondo.id)).find(({ tipo }) => tipo === 'apertura');
    exigirAperturaVigente(apertura);
    if (fondo.estado === 'cerrado') throw new FondoNoDisponible();
    await this.anulador.revisar(fondo, apertura!);
    const datos = await this.anularEnBancos(operador, { fondo, apertura: apertura!, pedido });
    const eventos = await this.anulador.anular(operador, { fondo, cambio: apertura!, datos });
    return { dto: await this.lector.leer((await fondos.buscar(fondo.id))!), eventos };
  }

  /** Bancos anula el cheque o la nota (con inverso o sin él); un saldo inicial no tiene movimiento. */
  private async anularEnBancos(
    operador: Operador,
    por: { fondo: Fondo; apertura: CambioDeMonto; pedido: PeticionDeAnularApertura },
  ): Promise<DatosDeAnularElCambio> {
    const { fondo, apertura, pedido } = por;
    const motivo = pedido.motivo.trim();
    if (apertura.movimientoId === null) return { motivo, enBancos: null, fechaDelInverso: null };
    const anulado = await this.dependencias.bancos.anularMovimiento(operador, {
      origen: { modulo: MODULO_DE_ORIGEN, documentoId: fondo.id },
      movimientoId: apertura.movimientoId,
      motivo,
      ...(pedido.fecha ? { fecha: pedido.fecha } : {}),
    });
    return { motivo, enBancos: anulado.forma, fechaDelInverso: anulado.fechaDelInverso };
  }
}
