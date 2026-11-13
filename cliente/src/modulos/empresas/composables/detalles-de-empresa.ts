import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearFecha, formatearFechaHora, formatearNit, formatearTelefono } from '@/modulos/core/utilidades/formato';
import type { CargaInicial } from '../servicios/datos-de-empresa.api';
import type { Empresa } from '../servicios/empresas.api';

const SIN_REGISTRAR = 'Sin registrar';

/** Los datos generales de la empresa para su ficha; lo que falta se dice, no se deja en blanco. */
export const detallesDeEmpresa = (empresa: Empresa): DetalleDeRegistro[] => [
  { etiqueta: 'NIT', valor: empresa.nit ? formatearNit(empresa.nit) : SIN_REGISTRAR },
  { etiqueta: 'Moneda base', valor: empresa.monedaBase },
  { etiqueta: 'Dirección', valor: empresa.direccion ?? SIN_REGISTRAR },
  { etiqueta: 'Teléfono', valor: empresa.telefono ? formatearTelefono(empresa.telefono) : SIN_REGISTRAR },
  { etiqueta: 'Correo', valor: empresa.correo ?? SIN_REGISTRAR },
  { etiqueta: 'Estado', valor: empresa.activa ? 'Activa' : 'Desactivada' },
];

/** Cuándo arranca la empresa en Arrancar y si su carga inicial sigue abierta. */
export function detallesDeCargaInicial(carga: CargaInicial): DetalleDeRegistro[] {
  const estado = carga.cerrada
    ? `Cerrada${carga.cerradaEn ? ` el ${formatearFechaHora(carga.cerradaEn)}` : ''}`
    : 'Abierta';
  return [
    { etiqueta: 'Fecha de inicio', valor: carga.fechaDeInicio ? formatearFecha(carga.fechaDeInicio) : SIN_REGISTRAR },
    { etiqueta: 'Carga inicial', valor: estado },
  ];
}
