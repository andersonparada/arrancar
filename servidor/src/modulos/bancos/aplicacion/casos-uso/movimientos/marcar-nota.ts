import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { CLAVE_DE_PAGO_A_PROVEEDORES } from '../../../dominio/asignacion-de-concepto.js';
import { MODULO_CUENTAS_POR_PAGAR } from '../../../dominio/conceptos-reservados.js';
import { CuentasPorPagarInactivo, NotaNoMarcable, NotaYaMarcada } from '../../../dominio/errores-de-origen.js';
import type { MovimientoDto } from '../../dto/movimiento.dto.js';
import { movimientoExistente, type DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

const MOTIVO_DE_LA_MARCA = 'Marcada para Cuentas por pagar';

/**
 * Marca una nota de débito suelta para Cuentas por pagar (CP4-b): la marca **es** el concepto de sistema «Pago a
 * proveedores», sin columna aparte. Con él, Cuentas por pagar puede ligar la nota a las facturas de una contraseña. Deja
 * en la auditoría cómo estaba la nota (con su concepto anterior).
 */
export class MarcarNota {
  constructor(private readonly dependencias: DependenciasDeMovimientos) {}

  /**
   * @throws CuentasPorPagarInactivo si el módulo no está activo.
   * @throws NoEsUnaNota si es el saldo inicial; NotaNoMarcable si no es una nota de débito suelta y vigente;
   *   NotaYaMarcada si ya lo está.
   */
  ejecutar(operador: Operador, movimientoId: string): Promise<MovimientoDto> {
    const { unidadDeTrabajo, repositorio, consultas, conceptos, auditoria, modulosDeOrigen } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const movimiento = await movimientoExistente(repositorio, movimientoId);
      movimiento.exigirClase(false);
      movimiento.exigirNotaDeDebitoMarcable();
      if (!(await modulosDeOrigen.estaActivo(operador, MODULO_CUENTAS_POR_PAGAR))) throw new CuentasPorPagarInactivo();
      const anterior = await consultas.obtener(movimientoId);
      if (anterior.marcadaParaCuentasPorPagar) throw new NotaYaMarcada();
      if (anterior.interesBruto !== null) throw new NotaNoMarcable();

      const marca = await conceptos.deSistema(operador, CLAVE_DE_PAGO_A_PROVEEDORES);
      movimiento.reclasificar(marca.id.valor);
      await repositorio.guardar(movimiento);
      await auditoria.registrar({
        recurso: 'bancos.movimientos',
        registroId: movimientoId,
        accion: 'corregir',
        anterior,
        motivo: MOTIVO_DE_LA_MARCA,
      });
      return consultas.obtener(movimientoId);
    });
  }
}
