import { usarAvisos } from '@/modulos/core/almacenes/avisos';
import { usarFormulario } from '@/modulos/core/composables/usar-formulario';
import { apiFormatosDeCheque } from '../../servicios/formatos-de-cheque.api';
import type { FormatoDeChequeGuardado } from '../../servicios/tipos-de-formatos-de-cheque';
import { usarBajaDeRegistro } from '../comunes/usar-baja-de-registro';

/** Lo que dice la confirmación de inactivar o reactivar, con lo que pasa con las chequeras. */
export function mensajeDeCambioDeEstadoDelFormato(formato: FormatoDeChequeGuardado): string {
  if (!formato.activo) return `¿Reactivar el formato «${formato.nombre}»?`;
  const usos = formato.chequerasQueLoUsan;
  const quienes = usos === 1 ? 'Hay 1 chequera que lo usa' : `Hay ${usos} chequeras que lo usan`;
  const aviso = usos > 0 ? ` ${quienes}: seguirá imprimiendo con él, pero ya no se podrá elegir para otras.` : '';
  return `¿Inactivar el formato «${formato.nombre}»?${aviso}`;
}

/** Inactivar o reactivar (con confirmación) y eliminar (con motivo) un formato de cheque. */
export function usarAccionesDeFormatoDeCheque(alTerminar: () => Promise<void>) {
  const avisos = usarAvisos();
  const { enviar } = usarFormulario();
  const eliminacion = usarBajaDeRegistro<FormatoDeChequeGuardado>({
    ejecutar: (formato, { motivo }) => apiFormatosDeCheque.eliminar(formato.id, motivo),
    aviso: 'Formato eliminado.',
    alTerminar,
  });

  async function cambiarEstado(formato: FormatoDeChequeGuardado): Promise<void> {
    const reactivar = !formato.activo;
    const mensaje = mensajeDeCambioDeEstadoDelFormato(formato);
    if (!(await avisos.confirmar({ mensaje, textoConfirmar: reactivar ? 'Reactivar' : 'Inactivar' }))) return;
    const llamar = () =>
      reactivar ? apiFormatosDeCheque.reactivar(formato.id) : apiFormatosDeCheque.inactivar(formato.id);
    if (!(await enviar(llamar))) return;
    avisos.exito(reactivar ? 'Formato reactivado.' : 'Formato inactivado.');
    await alTerminar();
  }

  return { eliminacion, cambiarEstado };
}
