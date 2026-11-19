import { formatearCantidad, formatearOpcion, formatearTexto } from '@/modulos/core/utilidades/formato';
import { OPCIONES_DE_INCISO_FISCAL } from './edicion-de-clase';
import { ayudaDeClase } from './reglas-de-clase';
import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import type { Clase } from '../../servicios/clases.api';

const ayudas = (registro: Clase): DetalleDeRegistro[] => {
  const ayuda = ayudaDeClase(registro.nombre);
  return ayuda ? [{ etiqueta: 'Qué incluye', valor: ayuda }] : [];
};

/** Lo que muestra la tarjeta de la clase de activo además de nombre, ya con formato. */
export const detallesDeClase = (registro: Clase): DetalleDeRegistro[] => [
  { etiqueta: 'Inciso fiscal', valor: formatearOpcion(OPCIONES_DE_INCISO_FISCAL, registro.incisoFiscal) },
  { etiqueta: 'Porcentaje fiscal anual', valor: `${formatearCantidad(registro.porcentajeFiscal)} %` },
  { etiqueta: 'Vida útil contable (meses)', valor: formatearTexto(registro.vidaUtilContableMeses) },
  { etiqueta: 'Valor residual', valor: `${formatearCantidad(registro.valorResidualPorcentaje)} %` },
  ...ayudas(registro),
];
