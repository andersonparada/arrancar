import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { apiPeriodos } from '../../servicios/periodos.api';
import { CONTROL_DE_PERIODOS as textos } from '../../textos-de-periodos';
import { usarAccionConMotivo } from '../retenciones/usar-accion-con-motivo';

/**
 * El bloqueo de períodos declarados: encenderlo se confirma con un resumen; apagarlo pide el motivo en una ventana.
 * `alTerminar` vuelve a pedir lo que la pantalla muestre.
 */
export function usarControlDePeriodos(alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();

  async function encender(): Promise<void> {
    if (!(await avisos.confirmar(textos.confirmarEncender))) return;
    try {
      await apiPeriodos.encenderControl();
      avisos.exito(textos.avisoEncendido);
      await alTerminar();
    } catch (error) {
      avisos.error(error instanceof Error ? error.message : 'No se pudo encender el bloqueo.');
    }
  }

  const apagado = usarAccionConMotivo(
    (_: true, motivo: string) => apiPeriodos.apagarControl(motivo),
    alTerminar,
    textos.avisoApagado,
  );

  return { encender, apagado };
}
