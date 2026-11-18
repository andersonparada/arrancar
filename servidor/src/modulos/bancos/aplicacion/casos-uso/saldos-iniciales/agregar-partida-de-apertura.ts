import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { avisosDeLaPartida } from '../../../dominio/apertura.js';
import { CuentaBancariaInactiva } from '../../../dominio/errores.js';
import { SinSaldoInicial } from '../../../dominio/errores-de-apertura.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import { esParteDeCheque } from '../../../dominio/partes-de-apertura.js';
import { normalizarLaPartida, type PartidaNormalizada } from '../../armador-de-partidas.js';
import type { AvisoDeFondosDePosfechados } from '../../aviso-de-fondos-de-posfechados.js';
import type { AvisoDeApertura, PartidaGuardadaDto, SolicitudDePartida } from '../../dto/saldo-inicial.dto.js';
import {
  abrirEscritura,
  exigirSaldoDelBanco,
  partidaDeLaCuenta,
  type DependenciasDeSaldosIniciales,
} from './dependencias-de-saldos-iniciales.js';

/** Agrega una partida (cheque en circulación, depósito o débito en tránsito, error del banco o cheque posfechado). */
export class AgregarPartidaDeApertura {
  constructor(
    private readonly dependencias: DependenciasDeSaldosIniciales,
    private readonly fondos: AvisoDeFondosDePosfechados,
  ) {}

  /**
   * @throws SinFechaDeInicio, CargaInicialCerrada, CuentaBancariaInactiva, SinSaldoInicial, PartidaDespuesDelCorte,
   *   PosfechadoNoPosterior, NumeroDeChequeObligatorio, BeneficiarioObligatorio, ChequeDeAperturaYaUsado,
   *   SentidoDelErrorObligatorio, DescripcionDelErrorObligatoria, MontoInvalido, MesConciliado o un error de concepto.
   */
  ejecutar(operador: Operador, solicitud: SolicitudDePartida): Promise<PartidaGuardadaDto> {
    const { unidadDeTrabajo, ficha } = this.dependencias;
    const partida = normalizarLaPartida(solicitud);
    const { cuentaBancariaId } = partida;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { movimientoId, avisos } = await this.crear(operador, partida);
      const guardada = await partidaDeLaCuenta(this.dependencias, operador, { cuentaBancariaId, movimientoId });
      const resumen = await ficha.deLaCuenta(operador, cuentaBancariaId);
      return { partida: guardada, avisos: [...avisos, ...(await ficha.avisosDeLaCuenta(operador, resumen))] };
    });
  }

  private async crear(operador: Operador, partida: PartidaNormalizada) {
    const { repositorioMovimientos, reglas, armador } = this.dependencias;
    const { cuentaBancariaId } = partida;
    const { corte, saldoInicialId } = await this.cabeceraYCorte(operador, cuentaBancariaId);
    const datos = await armador.datos(operador, partida, { corte });
    await reglas.revisar(operador, { cuentaBancariaId, fechas: [partida.fecha], diferencia: 0 });
    const avisos = await this.avisosDe(operador, partida, corte);
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    const movimiento = Movimiento.crear(empresaId, datos, { apertura: { parte: partida.parte, saldoInicialId } });
    await repositorioMovimientos.agregar(movimiento);
    const movimientoId = movimiento.id.valor;
    if (esParteDeCheque(partida.parte)) await this.enlazarElCheque(operador, partida, movimientoId);
    return { movimientoId, avisos };
  }

  /** @throws CuentaBancariaInactiva, SinSaldoInicial (sin cabecera o sin el saldo según el estado de cuenta). */
  private async cabeceraYCorte(operador: Operador, cuentaBancariaId: string) {
    const { corte, cabecera, cuentaActiva } = await abrirEscritura(this.dependencias, operador, cuentaBancariaId);
    if (!cuentaActiva) throw new CuentaBancariaInactiva();
    if (!cabecera) throw new SinSaldoInicial();
    await exigirSaldoDelBanco(this.dependencias.consultas, cuentaBancariaId);
    return { corte, saldoInicialId: cabecera.id };
  }

  private enlazarElCheque(operador: Operador, partida: PartidaNormalizada, movimientoId: string) {
    const { cuentaBancariaId, serie, numeroDeCheque } = partida;
    const numero = { cuentaBancariaId, serie, numero: numeroDeCheque ?? 0 };
    return this.dependencias.chequesDeApertura.asignar(operador, numero, movimientoId);
  }

  /** Cheque antiguo (art. 508), depósito viejo y, en el posfechado, si la cuenta no tendría fondos (CP4-B2a). */
  private async avisosDe(operador: Operador, partida: PartidaNormalizada, corte: string): Promise<AvisoDeApertura[]> {
    const { mesesDeVencimiento } = await this.dependencias.ficha.contexto(operador);
    const deLaPartida = avisosDeLaPartida(partida, { corte, mesesDeVencimiento });
    if (partida.parte !== 'cheque_posfechado') return deLaPartida;
    const sinFondos = await this.fondos.avisos(operador, partida);
    return [...deLaPartida, ...sinFondos];
  }
}
