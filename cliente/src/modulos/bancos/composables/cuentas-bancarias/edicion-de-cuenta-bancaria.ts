import { textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosCuentaBancaria, CuentaBancaria } from '../../servicios/cuentas-bancarias.api';

export const OPCIONES_DE_TIPO = { monetaria: 'Monetaria', ahorro: 'De ahorro' };

/** Lo que muestra cada campo de la ventana mientras se edita una cuenta bancaria. */
export interface EdicionDeCuentaBancaria {
  abierta: boolean;
  id: string | null;
  nombre: string;
  bancoId: string | null;
  numero: string;
  tipo: 'monetaria' | 'ahorro';
  observaciones: string;
  activo: boolean;
}

const CUENTA_BANCARIA_NUEVO: Omit<EdicionDeCuentaBancaria, 'abierta' | 'id'> = {
  nombre: '',
  bancoId: null,
  numero: '',
  tipo: 'monetaria',
  observaciones: '',
  activo: true,
};

/** La ventana abierta con los datos de la cuenta bancaria, o vacía si es nuevo. */
export function edicionDe(cuentaBancaria?: CuentaBancaria): EdicionDeCuentaBancaria {
  if (!cuentaBancaria) return { abierta: true, id: null, ...CUENTA_BANCARIA_NUEVO };
  return {
    abierta: true,
    id: cuentaBancaria.id,
    nombre: textoDeEdicion(cuentaBancaria.nombre),
    bancoId: cuentaBancaria.bancoId,
    numero: textoDeEdicion(cuentaBancaria.numero),
    tipo: cuentaBancaria.tipo,
    observaciones: textoDeEdicion(cuentaBancaria.observaciones),
    activo: cuentaBancaria.activo,
  };
}

/** Lo que se manda al servidor: lo vacío como `null` y los números como números. */
export const datosDeCuentaBancaria = (edicion: EdicionDeCuentaBancaria): DatosCuentaBancaria => ({
  nombre: edicion.nombre,
  bancoId: edicion.bancoId ?? '',
  numero: edicion.numero,
  tipo: edicion.tipo,
  observaciones: textoONulo(edicion.observaciones),
  activo: edicion.activo,
});
