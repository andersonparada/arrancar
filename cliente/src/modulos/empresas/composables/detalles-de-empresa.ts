import type { DetalleDeRegistro } from '@/modulos/core/tipos';
import { formatearTelefono } from '@/modulos/core/utilidades/formato';
import type { Empresa } from '../servicios/empresas.api';

const SIN_REGISTRAR = 'Sin registrar';

/** Los datos generales de la empresa para su ficha; lo que falta se dice, no se deja en blanco. */
export const detallesDeEmpresa = (empresa: Empresa): DetalleDeRegistro[] => [
  { etiqueta: 'NIT', valor: empresa.nit ?? SIN_REGISTRAR },
  { etiqueta: 'Moneda base', valor: empresa.monedaBase },
  { etiqueta: 'Dirección', valor: empresa.direccion ?? SIN_REGISTRAR },
  { etiqueta: 'Teléfono', valor: empresa.telefono ? formatearTelefono(empresa.telefono) : SIN_REGISTRAR },
  { etiqueta: 'Correo', valor: empresa.correo ?? SIN_REGISTRAR },
  { etiqueta: 'Estado', valor: empresa.activa ? 'Activa' : 'Desactivada' },
];
