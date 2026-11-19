import type { BandejaDeSalida } from '../../../../core/correo/aplicacion/bandeja-de-salida.js';
import type { CorreoResumenDto } from '../../../../core/correo/aplicacion/dto/correo.dto.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { RECURSO_DE_AVISOS } from '../../../dominio/aviso-de-pago.js';
import type { SolicitudDeAviso } from '../../dto/aviso-de-pago.dto.js';
import { AvisoNoDisponible } from '../../errores-de-avisos.js';
import type { ArmadorDelAviso } from './armador-del-aviso.js';
import { escogerDestinatarios } from './escoger-destinatarios.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  armador: ArmadorDelAviso;
  bandeja: BandejaDeSalida;
}

/**
 * Manda (o reenvía) el aviso de un pago al proveedor (`pagos.enviar-aviso`): el correo entra a la bandeja de core en la
 * misma transacción, con el PDF del comprobante si la empresa lo adjunta. Cada envío es un correo nuevo.
 */
export class EnviarAvisoDePago {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws RecursoNoEncontrado, AvisoNoDisponible (409: anulado, cuenta de apertura, sin correo, destinatario ajeno),
   * DireccionDelAvisoNoUtilizable (400), CupoDeCorreosAgotado (429).
   */
  ejecutar(operador: Operador, pagoId: string, solicitud: SolicitudDeAviso): Promise<CorreoResumenDto> {
    const { unidadDeTrabajo, armador, bandeja } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const preparado = await armador.preparar(operador, pagoId);
      if (preparado.motivo) throw new AvisoNoDisponible(preparado.motivo);
      const destinatarios = escogerDestinatarios(preparado.posibles, solicitud.destinatarios);
      const mensaje = await armador.mensaje(operador, preparado, {
        destinatarios,
        conCopia: solicitud.copiaALaEmpresa,
      });
      const { id } = await bandeja.encolar(operador, mensaje);
      const origen = { recurso: RECURSO_DE_AVISOS, registroId: pagoId };
      return (await bandeja.deRegistro(operador, origen)).find((correo) => correo.id === id) as CorreoResumenDto;
    });
  }
}
