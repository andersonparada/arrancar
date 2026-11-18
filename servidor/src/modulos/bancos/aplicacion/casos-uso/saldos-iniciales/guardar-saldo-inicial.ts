import { AccesoDenegado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { saldoDelBancoComoMovimiento } from '../../../dominio/apertura.js';
import { CuentaBancariaInactiva, SaldoInicialRepetido } from '../../../dominio/errores.js';
import { CuentaConMovimientosAnteriores } from '../../../dominio/errores-de-apertura.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import type { SaldoInicialGuardadoDto, SolicitudDeSaldoInicial } from '../../dto/saldo-inicial.dto.js';
import type { PartidaDeLaBase } from '../../puertos/consultas-de-saldos-iniciales.js';
import type { CabeceraDeSaldoInicial } from '../../puertos/repositorio-de-saldos-iniciales.js';
import {
  abrirEscritura,
  exigirSinConciliaciones,
  RECURSO_DE_SALDOS_INICIALES,
  type DependenciasDeSaldosIniciales,
} from './dependencias-de-saldos-iniciales.js';

/** La solicitud y lo que el usuario puede hacer: la ruta deja pasar con crear o editar, y el caso de uso exige el que toca. */
export interface GuardadoDeSaldoInicial {
  solicitud: SolicitudDeSaldoInicial;
  puedeCrear: boolean;
  puedeEditar: boolean;
  /** La importación desde Excel solo crea: una cuenta que ya tiene saldo inicial se rechaza. */
  soloCrear?: boolean;
}

/**
 * Crea o corrige la cabecera de la cuenta y su saldo según el estado de cuenta al corte (la parte `saldo_del_banco`).
 * Con un saldo global de antes lo convierte al modelo con partidas. Solo con la carga abierta.
 */
export class GuardarSaldoInicial {
  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {}

  /**
   * @throws SinFechaDeInicio, CargaInicialCerrada, CuentaBancariaInactiva, CuentaConMovimientosAnteriores,
   *   AperturaConConciliacion, MontoInvalido (un saldo de cero no se registra) o AccesoDenegado.
   */
  ejecutar(operador: Operador, guardado: GuardadoDeSaldoInicial): Promise<SaldoInicialGuardadoDto> {
    const { unidadDeTrabajo, ficha } = this.dependencias;
    const { cuentaBancariaId } = guardado.solicitud;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { corte, cabecera, cuentaActiva } = await abrirEscritura(this.dependencias, operador, cuentaBancariaId);
      if (cabecera) {
        if (guardado.soloCrear) throw new SaldoInicialRepetido();
        if (!guardado.puedeEditar) throw new AccesoDenegado();
        await this.corregir(operador, { cabecera, corte, solicitud: guardado.solicitud });
      } else {
        if (!guardado.puedeCrear) throw new AccesoDenegado();
        if (!cuentaActiva) throw new CuentaBancariaInactiva();
        await this.crear(operador, { corte, solicitud: guardado.solicitud });
      }
      const saldoInicial = await ficha.deLaCuenta(operador, cuentaBancariaId);
      return { saldoInicial, avisos: await ficha.avisosDeLaCuenta(operador, saldoInicial) };
    });
  }

  private async crear(operador: Operador, { corte, solicitud }: { corte: string; solicitud: SolicitudDeSaldoInicial }) {
    const { consultas, consultasConciliaciones, cabeceras, repositorioMovimientos, reglas, armador } =
      this.dependencias;
    const { cuentaBancariaId } = solicitud;
    const anteriores = await consultas.contarMovimientosNormalesHasta(cuentaBancariaId, corte);
    if (anteriores > 0) throw new CuentaConMovimientosAnteriores(anteriores);
    await exigirSinConciliaciones(consultasConciliaciones, cuentaBancariaId);
    await reglas.revisar(operador, { cuentaBancariaId, fechas: [corte], diferencia: 0 });
    const cabecera = await cabeceras.agregar(operador.empresaId, cuentaBancariaId, solicitud);
    const movimiento = Movimiento.crear(
      Identificador.desde<'Empresa'>(operador.empresaId),
      await armador.datosDelSaldoDelBanco(operador, {
        cuentaBancariaId,
        corte,
        saldo: solicitud.saldoSegunEstadoDeCuenta,
      }),
      { apertura: { parte: 'saldo_del_banco', saldoInicialId: cabecera.id } },
    );
    await repositorioMovimientos.agregar(movimiento);
  }

  private async corregir(
    operador: Operador,
    {
      cabecera,
      corte,
      solicitud,
    }: { cabecera: CabeceraDeSaldoInicial; corte: string; solicitud: SolicitudDeSaldoInicial },
  ) {
    const { cabeceras, ficha, auditoria } = this.dependencias;
    const { partidas: _partidas, ...anterior } = await ficha.deLaCuenta(operador, solicitud.cuentaBancariaId);
    await this.cambiarElSaldoDelBanco(operador, { corte, solicitud });
    await cabeceras.guardar({ ...cabecera, ...porComparar(solicitud) });
    await auditoria.registrar({
      recurso: RECURSO_DE_SALDOS_INICIALES,
      registroId: cabecera.id,
      accion: 'corregir',
      anterior,
    });
  }

  /** Convierte el saldo global o corrige el del banco; la cabecera y las observaciones se cambian siempre. */
  private async cambiarElSaldoDelBanco(
    operador: Operador,
    { corte, solicitud }: { corte: string; solicitud: SolicitudDeSaldoInicial },
  ) {
    const { consultas, consultasConciliaciones, repositorioMovimientos, armador } = this.dependencias;
    const { cuentaBancariaId } = solicitud;
    const principal = (await consultas.partidas(cuentaBancariaId)).find(esElSaldoPrincipal);
    const nuevo = saldoDelBancoComoMovimiento(solicitud.saldoSegunEstadoDeCuenta);
    if (!principal) return;
    const esGlobal = principal.parte === 'saldo_global';
    if (!esGlobal && principal.tipo === nuevo.tipo && principal.monto === nuevo.monto) return;
    await exigirSinConciliaciones(consultasConciliaciones, cuentaBancariaId);
    const movimiento = await repositorioMovimientos.buscar(Identificador.desde(principal.movimientoId));
    if (!movimiento) return;
    if (esGlobal) await this.exigirSinMovimientosAnteriores(cuentaBancariaId, corte);
    const datos = await armador.datosDelSaldoDelBanco(operador, {
      cuentaBancariaId,
      corte,
      saldo: solicitud.saldoSegunEstadoDeCuenta,
    });
    if (esGlobal) movimiento.convertirASaldoDelBanco(datos);
    else movimiento.corregirPartida(datos);
    await repositorioMovimientos.guardar(movimiento);
  }

  private async exigirSinMovimientosAnteriores(cuentaBancariaId: string, corte: string) {
    const anteriores = await this.dependencias.consultas.contarMovimientosNormalesHasta(cuentaBancariaId, corte);
    if (anteriores > 0) throw new CuentaConMovimientosAnteriores(anteriores);
  }
}

const esElSaldoPrincipal = (partida: PartidaDeLaBase) =>
  !partida.anulada && (partida.parte === 'saldo_del_banco' || partida.parte === 'saldo_global');

const porComparar = ({ saldoSegunLibrosAnteriores, observaciones }: SolicitudDeSaldoInicial) => ({
  saldoSegunLibrosAnteriores,
  observaciones,
});
