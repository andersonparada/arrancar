import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { SaldoInicialDto, SolicitudDeSaldoInicial } from '../../dto/saldo-inicial.dto.js';
import {
  dtoDelSaldoInicial,
  exigirCargaAbierta,
  type DependenciasDeSaldosIniciales,
} from './dependencias-de-saldos-iniciales.js';
import { PreparadorDeSaldoInicial } from './preparador-de-saldo-inicial.js';

/**
 * Carga un saldo inicial (un documento registrado en el sistema anterior que seguía pendiente al corte). Pide la carga
 * inicial por el mediador, valida (§5 del diseño U8) y lo guarda ya completado, a nombre de quien lo carga. No audita
 * (es un alta: queda en `creado_por`) ni publica eventos. Cada fila del Excel pasa por aquí.
 */
export class CrearSaldoInicial {
  private readonly preparador: PreparadorDeSaldoInicial;

  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {
    this.preparador = new PreparadorDeSaldoInicial(dependencias);
  }

  /**
   * @throws FechaDeInicioSinRegistrar, CargaInicialCerradaParaSaldos, EmisionNoAnteriorAlInicio, ProveedorNoDisponible,
   * los errores de montos, VencimientoInvalido, y el del único si el documento ya está en Cuentas por pagar.
   */
  ejecutar(operador: Operador, solicitud: SolicitudDeSaldoInicial): Promise<SaldoInicialDto> {
    const { unidadDeTrabajo, cargaInicial, saldosIniciales, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const fechaDeInicio = await exigirCargaAbierta(cargaInicial, operador);
      const saldo = await this.preparador.preparar(operador, solicitud, fechaDeInicio);
      const { id } = await saldosIniciales.agregar(saldo, operador.usuarioId);
      return dtoDelSaldoInicial(consultas, id, false);
    });
  }
}
