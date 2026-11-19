import type { BandejaDeSalida } from '../../../../core/correo/aplicacion/bandeja-de-salida.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { ConfiguracionDelAviso, OperadorDelUsuario } from '../../puertos/puertos-de-avisos-de-pago.js';
import type { ArmadorDelAviso } from './armador-del-aviso.js';

/** Lo que el evento `cuentas-por-pagar.pago_registrado` dice del pago (solo lo necesario para avisar). */
export interface PagoRegistrado {
  empresaId: string;
  cuentaId: string;
  usuarioId: string;
  pagoId: string;
}

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  armador: ArmadorDelAviso;
  bandeja: BandejaDeSalida;
  configuracion: ConfiguracionDelAviso;
  operadores: OperadorDelUsuario;
}

/**
 * Si la empresa configuró el envío automático, manda el aviso al registrar el pago: a los destinatarios
 * preseleccionados (contactos con la marca o, si no hay, el correo principal) y con la copia que diga la
 * configuración. Corre **después** de que el pago se confirmó (evento), en su propia transacción: si el proceso cae
 * entre las dos no hay aviso (nunca uno duplicado) y se manda con el botón de la ficha. Sin destinatario utilizable,
 * el pago anulado o de la cuenta de apertura, no hace nada.
 */
export class AvisarPagoRegistrado {
  constructor(private readonly dependencias: Dependencias) {}

  /** @returns si encoló un aviso. */
  async ejecutar(pago: PagoRegistrado): Promise<boolean> {
    const { configuracion, operadores, unidadDeTrabajo, armador, bandeja } = this.dependencias;
    const ajustes = await configuracion.de(pago);
    if (ajustes.envio !== 'automatico') return false;
    const operador = await operadores.de(pago.usuarioId, pago.empresaId);
    if (!operador) return false;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const preparado = await armador.preparar(operador, pago.pagoId);
      const destinatarios = preparado.posibles.filter((posible) => posible.preseleccionado);
      if (preparado.motivo || destinatarios.length === 0) return false;
      const mensaje = await armador.mensaje(operador, preparado, { destinatarios, conCopia: ajustes.copiaALaEmpresa });
      await bandeja.encolar(operador, mensaje);
      return true;
    });
  }
}
