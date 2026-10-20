import type { HojaSimple } from '../../../../core/intercambio/aplicacion/puertos/libro-de-excel.js';
import type { DatosDelSat2237 } from '../../../dominio/libro/datos-del-sat-2237.js';
import type { ProveedorDelSat2237 } from '../../../dominio/libro/proveedores-del-sat-2237.js';

/** Excel recibe el dinero como número; los centavos son enteros, así que no hay error de suma. */
const quetzales = (centavos: number): number => centavos / 100;

const ENCABEZADOS_DE_RUBROS = [
  'Rubro',
  'Facturas base',
  'Facturas IVA',
  'Débito base',
  'Débito IVA',
  'Crédito base',
  'Crédito IVA',
  'Neto base',
  'Neto IVA',
  'Nota',
];

function hojaDeRubros({ rubros }: DatosDelSat2237): HojaSimple {
  return {
    nombre: 'Rubros',
    encabezados: ENCABEZADOS_DE_RUBROS,
    filas: rubros.map((r) => [
      r.nombre,
      ...[r.facturas, r.notasDeDebito, r.notasDeCredito, r.neto].flatMap((m) => [quetzales(m.base), quetzales(m.iva)]),
      r.nota ?? '',
    ]),
  };
}

function hojaDeOperaciones({ segmento9 }: DatosDelSat2237): HojaSimple {
  return {
    nombre: 'Operaciones',
    encabezados: ['Operación', 'Códigos', 'Cantidad', 'Base'],
    filas: segmento9.map((o) => [o.nombre, o.tiposDte.join(', '), o.cantidad, quetzales(o.base)]),
  };
}

const filaDeProveedor = (tipo: string, p: ProveedorDelSat2237): unknown[] => [
  tipo,
  p.nit ?? '',
  p.nombre,
  p.cantidadDeFacturas,
  quetzales(p.base),
  quetzales(p.credito),
  p.aviso ?? '',
];

type Total = { cantidadDeFacturas: number; base: number; credito: number };

const filaDeTotal = (nombre: string, t: Total): unknown[] => [
  'Total',
  '',
  nombre,
  t.cantidadDeFacturas,
  quetzales(t.base),
  quetzales(t.credito),
  '',
];

function hojaDeProveedores({ proveedores, facturasEspeciales }: DatosDelSat2237): HojaSimple {
  return {
    nombre: 'Proveedores',
    encabezados: ['Tipo', 'NIT o CUI', 'Nombre', 'Facturas', 'Base', 'Crédito', 'Aviso'],
    filas: [
      ...proveedores.filas.map((p) => filaDeProveedor('Proveedor', p)),
      filaDeTotal('Proveedores', proveedores.total),
      ...facturasEspeciales.filas.map((p) => filaDeProveedor('Factura especial', p)),
      filaDeTotal('Facturas especiales', facturasEspeciales.total),
    ],
  };
}

/** Las tres hojas del Excel de los datos del SAT-2237: Rubros, Operaciones y Proveedores. */
export const hojasDelSat2237 = (datos: DatosDelSat2237): HojaSimple[] => [
  hojaDeRubros(datos),
  hojaDeOperaciones(datos),
  hojaDeProveedores(datos),
];
