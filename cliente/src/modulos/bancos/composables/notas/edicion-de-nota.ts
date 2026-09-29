import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { Movimiento } from '../../servicios/movimientos.api';
import type { DatosNota } from '../../servicios/notas.api';

export const OPCIONES_DE_TIPO = { credito: 'Nota de crédito', debito: 'Nota de débito' };

/** Lo que muestra cada campo de la ventana mientras se edita una nota. */
export interface EdicionDeNota {
  abierta: boolean;
  id: string | null;
  cuentaBancariaId: string | null;
  tipo: 'credito' | 'debito';
  fecha: string;
  monto: string | number;
  conceptoId: string | null;
  referencia: string;
  beneficiario: string;
  observaciones: string;
}

const NOTA_NUEVA: Omit<EdicionDeNota, 'abierta' | 'id'> = {
  cuentaBancariaId: null,
  tipo: 'credito',
  fecha: '',
  monto: '',
  conceptoId: null,
  referencia: '',
  beneficiario: '',
  observaciones: '',
};

/** La ventana abierta con los datos de la nota, o vacía (con `tipo`) si es nueva. */
export function edicionDe(nota?: Movimiento, tipo: 'credito' | 'debito' = 'credito'): EdicionDeNota {
  if (!nota) return { abierta: true, id: null, ...NOTA_NUEVA, tipo };
  return {
    abierta: true,
    id: nota.id,
    cuentaBancariaId: nota.cuentaBancariaId,
    tipo: nota.tipo === 'credito' ? 'credito' : 'debito',
    fecha: textoDeEdicion(nota.fecha),
    monto: textoDeEdicion(nota.monto),
    conceptoId: nota.conceptoId,
    referencia: textoDeEdicion(nota.referencia),
    beneficiario: textoDeEdicion(nota.beneficiario),
    observaciones: textoDeEdicion(nota.observaciones),
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeNota = (edicion: EdicionDeNota): DatosNota => ({
  cuentaBancariaId: edicion.cuentaBancariaId ?? '',
  tipo: edicion.tipo,
  fecha: edicion.fecha,
  monto: textoDeEdicion(edicion.monto),
  conceptoId: edicion.conceptoId ?? '',
  referencia: textoONulo(edicion.referencia),
  beneficiario: textoONulo(edicion.beneficiario),
  observaciones: textoONulo(edicion.observaciones),
});
