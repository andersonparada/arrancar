import type { FiltroDeChequesDeLaEmpresa } from '../../servicios/cheques.api';

/** Lo que se elige en los filtros de la lista de cheques. */
export interface FiltrosDeCheques {
  cuentaBancariaId: string | null;
  estado: 'emitido' | 'anulado' | '';
  desde: string;
  hasta: string;
}

const dosDigitos = (numero: number): string => String(numero).padStart(2, '0');

const aTexto = (fecha: Date): string =>
  `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;

/** Los filtros al abrir la lista: del primer día del mes actual a hoy. `hoy` se fija en las pruebas. */
export function filtrosPorOmision(hoy: Date = new Date()): FiltrosDeCheques {
  const primerDiaDelMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return { cuentaBancariaId: null, estado: '', desde: aTexto(primerDiaDelMes), hasta: aTexto(hoy) };
}

/** Lo que se manda al servidor: solo lo que se eligió filtra. */
export function filtroDeLaConsulta(filtros: FiltrosDeCheques): FiltroDeChequesDeLaEmpresa {
  return {
    cuentaBancariaId: filtros.cuentaBancariaId ?? undefined,
    estado: filtros.estado || undefined,
    desde: filtros.desde || undefined,
    hasta: filtros.hasta || undefined,
  };
}
