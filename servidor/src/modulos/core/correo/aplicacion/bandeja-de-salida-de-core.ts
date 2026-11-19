import type { Auditoria } from '../../compartido/aplicacion/auditoria.js';
import { RecursoNoEncontrado } from '../../compartido/aplicacion/errores.js';
import type { Operador } from '../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../compartido/aplicacion/unidad-de-trabajo.js';
import type { BandejaDeSalida, CorreoEncoladoDto, MensajePorEncolar, OrigenDeCorreo } from './bandeja-de-salida.js';
import { RECURSO_DE_CORREOS, type CancelarCorreo } from './casos-uso/cancelar-correo.js';
import type { EncolarCorreo } from './casos-uso/encolar-correo.js';
import type { CorreoResumenDto } from './dto/correo.dto.js';
import { validarMotivoDeCancelacion } from './errores-del-historial.js';
import type { HistorialDeCorreos } from './puertos/historial-de-correos.js';

interface Dependencias {
  encolar: EncolarCorreo;
  cancelarCorreo: CancelarCorreo;
  historial: HistorialDeCorreos;
  auditoria: Auditoria;
  unidadDeTrabajo: UnidadDeTrabajo;
}

/**
 * El puerto público de core. Cada operación corre en la unidad de trabajo de quien la llama (si no hay una en curso,
 * abre la suya con el contexto del operador), así el correo y la operación de negocio se guardan juntos o ninguno.
 */
export class BandejaDeSalidaDeCore implements BandejaDeSalida {
  constructor(private readonly dependencias: Dependencias) {}

  encolar(operador: Operador, mensaje: MensajePorEncolar): Promise<CorreoEncoladoDto> {
    return this.dependencias.encolar.ejecutar(operador, mensaje);
  }

  async cancelarPendientesDe(operador: Operador, origen: OrigenDeCorreo, motivo: string): Promise<number> {
    const { unidadDeTrabajo, historial, auditoria } = this.dependencias;
    const motivoLimpio = validarMotivoDeCancelacion(motivo);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const cancelados = await historial.cancelarPendientesDe(origen, {
        usuarioId: operador.usuarioId,
        motivo: motivoLimpio,
      });
      for (const antes of cancelados) {
        await auditoria.registrar({
          recurso: RECURSO_DE_CORREOS,
          registroId: antes.id,
          accion: 'anular',
          anterior: antes,
          motivo: motivoLimpio,
        });
      }
      return cancelados.length;
    });
  }

  async cancelar(
    operador: Operador,
    origen: OrigenDeCorreo,
    { correoId, motivo }: { correoId: string; motivo: string },
  ): Promise<CorreoResumenDto> {
    const { unidadDeTrabajo, cancelarCorreo } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const correo = (await this.deRegistro(operador, origen)).find(({ id }) => id === correoId);
      if (!correo) throw new RecursoNoEncontrado('El correo');
      await cancelarCorreo.ejecutar(operador, correoId, motivo);
      const despues = (await this.deRegistro(operador, origen)).find(({ id }) => id === correoId);
      return despues as CorreoResumenDto;
    });
  }

  deRegistro(operador: Operador, origen: OrigenDeCorreo): Promise<CorreoResumenDto[]> {
    const { unidadDeTrabajo, historial } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => historial.deOrigen(origen));
  }
}
