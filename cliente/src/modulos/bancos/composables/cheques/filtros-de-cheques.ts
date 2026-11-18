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

/**
 * Los filtros al abrir la lista: desde el primer día del mes actual y **sin tope** hasta, para que un cheque
 * posfechado recién emitido aparezca. `hoy` se fija en las pruebas.
 */
export function filtrosPorOmision(hoy: Date = new Date()): FiltrosDeCheques {
  const primerDiaDelMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return { cuentaBancariaId: null, estado: '', desde: aTexto(primerDiaDelMes), hasta: '' };
}

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Los filtros que pide un enlace (`?cuentaBancariaId=…&estado=…&desde=…&hasta=…`) sobre los de siempre; lo que no
 * sirve se descarta, sin fiarse de lo que venga escrito.
 */
export function filtrosDesdeLaRuta(consulta: Record<string, unknown>, hoy: Date = new Date()): FiltrosDeCheques {
  const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : '');
  const base = filtrosPorOmision(hoy);
  const estado = texto(consulta.estado);
  return {
    cuentaBancariaId: ES_UUID.test(texto(consulta.cuentaBancariaId)) ? texto(consulta.cuentaBancariaId) : null,
    estado: estado === 'emitido' || estado === 'anulado' ? estado : '',
    desde: ES_FECHA.test(texto(consulta.desde)) ? texto(consulta.desde) : base.desde,
    hasta: ES_FECHA.test(texto(consulta.hasta)) ? texto(consulta.hasta) : base.hasta,
  };
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
