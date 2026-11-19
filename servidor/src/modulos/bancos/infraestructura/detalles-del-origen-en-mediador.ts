import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/cuentas-por-pagar.contratos.js';
import '../../core/contratos/empresas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import { ModuloNoDisponible } from '../../core/mediador/aplicacion/errores.js';
import type { DetalleDelOrigenDto } from '../aplicacion/dto/impresion-de-cheque.dto.js';
import type { DatosDeLaEmpresaParaCheques, DetallesDelOrigen } from '../aplicacion/puertos/impresion-de-cheques.js';
import { deCentavos } from '../dominio/centavos.js';
import { MODULO_CUENTAS_POR_PAGAR } from '../dominio/origen-de-movimiento.js';

/** Los datos de la empresa los da Empresas (orden `empresas.obtener_datos_de_empresa`): Bancos no la importa. */
export class DatosDeLaEmpresaParaChequesEnMediador implements DatosDeLaEmpresaParaCheques {
  async obtener(operador: Operador): Promise<{ nombre: string; nit: string | null }> {
    const { nombre, nit } = await mediador.enviar(operador, 'empresas.obtener_datos_de_empresa', {
      empresaId: operador.empresaId,
    });
    return { nombre, nit };
  }
}

/**
 * Le pregunta al módulo de origen (orden `<modulo>.detalle_para_comprobante_de_egreso`) por el pago del cheque. Hoy solo
 * Cuentas por pagar sabe responder; si el módulo no está activo, el comprobante sale sin detalle.
 */
export class DetallesDelOrigenEnMediador implements DetallesDelOrigen {
  async de(
    operador: Operador,
    { moduloDeOrigen, movimientoId }: { moduloDeOrigen: string; movimientoId: string },
  ): Promise<DetalleDelOrigenDto | null> {
    if (moduloDeOrigen !== MODULO_CUENTAS_POR_PAGAR) return null;
    try {
      const detalle = await mediador.enviar(operador, 'cuentas-por-pagar.detalle_para_comprobante_de_egreso', {
        movimientoId,
      });
      return detalle && this.aDto(detalle);
    } catch (error) {
      if (error instanceof ModuloNoDisponible) return null;
      throw error;
    }
  }

  private aDto(
    detalle: NonNullable<
      Awaited<ReturnType<typeof mediador.enviar<'cuentas-por-pagar.detalle_para_comprobante_de_egreso'>>>
    >,
  ): DetalleDelOrigenDto {
    return {
      modulo: MODULO_CUENTAS_POR_PAGAR,
      descripcion: `Pago ${detalle.pagoNumero} de Cuentas por pagar`,
      documentos: detalle.documentos.map(({ montoCentavos, retenciones, ...documento }) => ({
        ...documento,
        monto: deCentavos(montoCentavos),
        retenciones: retenciones.map(({ montoCentavos: retenido, ...retencion }) => ({
          ...retencion,
          monto: deCentavos(retenido),
        })),
      })),
      totalRetenido: deCentavos(detalle.totalRetenidoCentavos),
    };
  }
}
