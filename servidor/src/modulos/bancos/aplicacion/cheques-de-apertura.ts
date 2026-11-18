import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Cheque } from '../dominio/cheque.js';
import { ChequeDeAperturaYaUsado } from '../dominio/errores-de-apertura.js';
import type { ChequerasDeApertura, ChequeUbicado } from './puertos/chequeras-de-apertura.js';
import type { RepositorioCheques } from './puertos/repositorio-cheques.js';

interface Dependencias {
  chequeras: ChequerasDeApertura;
  cheques: RepositorioCheques;
}

interface NumeroDeCheque {
  cuentaBancariaId: string;
  serie: string | null;
  numero: number;
}

/**
 * Los cheques de la carga inicial viven en `bancos.cheques` como cualquier otro (diseño §2.3): en la chequera
 * registrada de la cuenta y serie si su número está disponible, o en la chequera de apertura que crea el sistema.
 */
export class ChequesDeApertura {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * Enlaza el cheque a su movimiento: usa el que estaba disponible en una chequera registrada o crea uno en la de
   * apertura; en los dos casos queda emitido.
   * @throws ChequeDeAperturaYaUsado si ese número ya está emitido o anulado.
   */
  async asignar(operador: Operador, numero: NumeroDeCheque, movimientoId: string): Promise<void> {
    const { chequeras, cheques } = this.dependencias;
    const ubicado = await chequeras.ubicar(numero.cuentaBancariaId, numero.serie, numero.numero);
    if (ubicado) return this.usarElDisponible(ubicado, numero, movimientoId);
    const chequera = await chequeras.deLaSerie(operador.empresaId, numero);
    const cheque = Cheque.crear(Identificador.desde(operador.empresaId), chequera.id.valor, numero.numero);
    cheque.emitir(movimientoId, true);
    await cheques.agregarVarios([cheque]);
    await chequeras.ajustarRango(chequera.id.valor);
  }

  /**
   * Suelta el cheque de la partida que se corrige o se elimina: en la chequera de apertura se borra la fila (no se
   * reutiliza el número); en una chequera registrada vuelve a estar disponible.
   */
  async liberar(movimientoId: string): Promise<void> {
    const { chequeras, cheques } = this.dependencias;
    const ubicado = await chequeras.ubicarPorMovimiento(movimientoId);
    if (!ubicado) return;
    const { cheque, chequera } = ubicado;
    if (!chequera.esDeApertura) {
      cheque.blanquear();
      await cheques.guardar(cheque);
      return;
    }
    await chequeras.quitarCheque(cheque.id.valor);
    await chequeras.ajustarRango(chequera.id.valor);
  }

  private async usarElDisponible(
    { cheque, chequera }: ChequeUbicado,
    numero: NumeroDeCheque,
    movimientoId: string,
  ): Promise<void> {
    if (!cheque.estaDisponible) {
      throw new ChequeDeAperturaYaUsado({ numero: numero.numero, serie: numero.serie, chequera: chequera.descripcion });
    }
    cheque.emitir(movimientoId, true);
    await this.dependencias.cheques.guardar(cheque);
  }
}
