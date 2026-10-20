import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { DatosDelSat2237 } from '../../dominio/libro/datos-del-sat-2237.js';
import type { FormularioDelRegimen } from '../../dominio/libro/formulario-del-regimen.js';
import type { DetalleDeProveedores, ProveedorDelSat2237 } from '../../dominio/libro/proveedores-del-sat-2237.js';
import type { MontoDeRubro } from '../../dominio/libro/rubros-del-sat-2237.js';

interface MontoEnTexto {
  base: string;
  iva: string;
}

type ProveedorEnTexto = Omit<ProveedorDelSat2237, 'base' | 'credito'> & { base: string; credito: string };

interface DetalleEnTexto {
  filas: ProveedorEnTexto[];
  total: { cantidadDeFacturas: number; base: string; credito: string };
}

interface Encabezado {
  periodo: string;
  empresa: { nombre: string; nit: string | null };
}

export interface Sat2237SinFormularioDto extends Encabezado {
  aplica: false;
  formulario: 'SAT-2046' | null;
  mensaje: string;
}

export interface Sat2237Dto extends Encabezado {
  aplica: true;
  formulario: 'SAT-2237';
  rubros: Array<{
    clave: string;
    nombre: string;
    nota: string | null;
    facturas: MontoEnTexto;
    notasDeDebito: MontoEnTexto;
    notasDeCredito: MontoEnTexto;
    neto: MontoEnTexto;
  }>;
  segmento9: Array<{ clave: string; nombre: string; tiposDte: readonly string[]; cantidad: number; base: string }>;
  proveedores: DetalleEnTexto;
  facturasEspeciales: DetalleEnTexto;
  casillas: {
    version: string;
    casillas: Array<{ rubro: string; numero: string; nombre: string; neto: MontoEnTexto }>;
  } | null;
  avisos: string[];
}

const monto = ({ base, iva }: MontoDeRubro): MontoEnTexto => ({ base: deCentavos(base), iva: deCentavos(iva) });

const proveedor = (p: ProveedorDelSat2237): ProveedorEnTexto => ({
  ...p,
  base: deCentavos(p.base),
  credito: deCentavos(p.credito),
});

const detalle = ({ filas, total }: DetalleDeProveedores): DetalleEnTexto => ({
  filas: filas.map(proveedor),
  total: { ...total, base: deCentavos(total.base), credito: deCentavos(total.credito) },
});

/** Los datos del SAT-2237 en la forma que sale por la API (dinero como texto). */
export function dtoDelSat2237(datos: DatosDelSat2237, encabezado: Encabezado): Sat2237Dto {
  return {
    ...encabezado,
    aplica: true,
    formulario: 'SAT-2237',
    rubros: datos.rubros.map((r) => ({
      ...r,
      facturas: monto(r.facturas),
      notasDeDebito: monto(r.notasDeDebito),
      notasDeCredito: monto(r.notasDeCredito),
      neto: monto(r.neto),
    })),
    segmento9: datos.segmento9.map((o) => ({ ...o, base: deCentavos(o.base) })),
    proveedores: detalle(datos.proveedores),
    facturasEspeciales: detalle(datos.facturasEspeciales),
    casillas: datos.casillas && {
      ...datos.casillas,
      casillas: datos.casillas.casillas.map((c) => ({ ...c, neto: monto(c.neto) })),
    },
    avisos: datos.avisos,
  };
}

/** El período de un régimen que no declara compras en el SAT-2237. */
export const dtoSinSat2237 = (
  forma: Exclude<FormularioDelRegimen, { declaraCompras: true }>,
  encabezado: Encabezado,
): Sat2237SinFormularioDto => ({
  ...encabezado,
  aplica: false,
  formulario: forma.formulario,
  mensaje: forma.mensaje,
});
