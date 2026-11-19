import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { MontoDelFondoCambiado } from '../../../dominio/eventos-de-fondos.js';
import type { Fondo } from '../../../dominio/fondos.js';
import {
  beneficiarioDelFondo,
  exigirFechaDesdeLaApertura,
  exigirFechaNoFutura,
  exigirFondoAbierto,
  exigirMontoPositivo,
} from '../../../dominio/reglas-del-fondo.js';
import type { FondoDto } from '../../dto/fondos.dto.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-bancos.js';
import type { DependenciasDeFondos } from './dependencias-de-fondos.js';
import { custodioVigente, LectorDelFondo } from './lector-del-fondo.js';
import { ordenarLaEntrega, type PeticionDeEntrega } from './orden-de-entrega.js';

export type PeticionDeAumento = PeticionDeEntrega & { fondoId: string };

/**
 * Aumenta el monto de un fondo abierto (`fondos.cambiar-monto`): cheque (a nombre del custodio vigente u otro, nunca al
 * portador) o nota de débito con «Fondo de caja chica», como la apertura. Sin auditoría (alta). Publica
 * `monto_del_fondo_cambiado` al confirmar.
 */
export class AumentarFondo {
  private readonly lector: LectorDelFondo;

  constructor(private readonly dependencias: DependenciasDeFondos) {
    this.lector = new LectorDelFondo(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, FondoNoDisponible, FechaDelFondoInvalida, MontoDelFondoInvalido, BeneficiarioInvalido y
   * lo que rechace Bancos.
   */
  async ejecutar(operador: Operador, pedido: PeticionDeAumento): Promise<FondoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.aumentar(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async aumentar(operador: Operador, pedido: PeticionDeAumento) {
    const { fondos, bancos } = this.dependencias;
    const fondo = await this.lector.bloquear(pedido.fondoId);
    exigirFondoAbierto(fondo);
    const datos = await this.validar(operador, { fondo, pedido });
    const movimiento = await ordenarLaEntrega(bancos, operador, { pedido, datos });
    const cambioId = await fondos.agregarCambio({
      fondoId: fondo.id,
      tipo: 'aumento',
      forma: pedido.forma,
      fecha: datos.fecha,
      montoCentavos: datos.montoCentavos,
      movimientoId: movimiento.movimientoId,
    });
    const avisos = movimiento.avisos.map(({ mensaje }) => mensaje);
    return {
      dto: await this.lector.leer((await fondos.buscar(fondo.id))!, avisos),
      eventos: [this.evento(operador, { cambioId, datos, movimiento })],
    };
  }

  /** Lo que se valida antes de ordenar nada a Bancos. */
  private async validar(operador: Operador, por: { fondo: Fondo; pedido: PeticionDeAumento }) {
    const { fondo, pedido } = por;
    const hoy = await this.dependencias.reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    exigirFechaNoFutura(fecha, hoy);
    exigirFechaDesdeLaApertura(fecha, fondo);
    const montoCentavos = exigirMontoPositivo(aCentavos(pedido.monto));
    if (pedido.forma === 'nota_de_debito') {
      await this.dependencias.referencias.exigirCuentaBancaria(pedido.cuentaBancariaId);
    }
    return { fondoId: fondo.id, fecha, montoCentavos, beneficiario: await this.beneficiario(fondo, pedido) };
  }

  /** El cheque va a nombre del escrito o del custodio vigente; la nota, al custodio. */
  private async beneficiario(fondo: Fondo, pedido: PeticionDeAumento): Promise<string> {
    const vigente = custodioVigente(await this.dependencias.fondos.custodios(fondo.id));
    const custodio = vigente?.custodio ?? fondo.nombre;
    return pedido.forma === 'cheque' ? beneficiarioDelFondo(pedido.beneficiario, custodio) : custodio;
  }

  private evento(
    operador: Operador,
    por: {
      cambioId: string;
      datos: { fondoId: string; fecha: string; montoCentavos: number };
      movimiento: MovimientoCreado;
    },
  ): EventoDominio {
    const { cambioId, datos, movimiento } = por;
    return new MontoDelFondoCambiado({
      empresaId: operador.empresaId,
      fondoId: datos.fondoId,
      cambioId,
      tipo: 'aumento',
      fecha: datos.fecha,
      montoCentavos: datos.montoCentavos,
      movimientoId: movimiento.movimientoId,
      cuentaBancariaId: movimiento.cuentaBancariaId,
    });
  }
}
