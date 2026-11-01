import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { DatosDelSat2237 } from '../../dominio/libro/datos-del-sat-2237.js';
import type { FormularioDelRegimen } from '../../dominio/libro/formulario-del-regimen.js';
import type { DetalleDeProveedores, ProveedorDelSat2237 } from '../../dominio/libro/proveedores-del-sat-2237.js';
import type { MontoDeRubro } from '../../dominio/libro/rubros-del-sat-2237.js';
import type { VistaDelFormularioSat2237 } from '../../dominio/libro/vista-del-formulario-sat-2237.js';

interface MontoEnTexto {
  base: string;
  iva: string;
}

type ProveedorEnTexto = Omit<ProveedorDelSat2237, 'base' | 'credito'> & { base: string; credito: string };

interface DetalleEnTexto {
  filas: ProveedorEnTexto[];
  total: { cantidadDeFacturas: number; base: string; credito: string };
}

type OperacionEnTexto = Omit<VistaDelFormularioSat2237['seccion9']['lineas'][number], 'base'> & { base: string };

interface FormularioEnTexto {
  version: string;
  confirmado: boolean;
  seccion5: {
    nombre: string;
    casillas: Array<Omit<VistaDelFormularioSat2237['seccion5']['casillas'][number], 'neto'> & { neto: MontoEnTexto }>;
  };
  seccion6: Omit<VistaDelFormularioSat2237['seccion6'], 'filas'> & { filas: ProveedorEnTexto[] };
  seccion9: Omit<VistaDelFormularioSat2237['seccion9'], 'lineas'> & { lineas: OperacionEnTexto[] };
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
  comoEnElFormulario: FormularioEnTexto;
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

const comoEnElFormulario = ({
  seccion5,
  seccion6,
  seccion9,
  ...resto
}: VistaDelFormularioSat2237): FormularioEnTexto => ({
  ...resto,
  seccion5: { ...seccion5, casillas: seccion5.casillas.map((c) => ({ ...c, neto: monto(c.neto) })) },
  seccion6: { ...seccion6, filas: seccion6.filas.map(proveedor) },
  seccion9: { ...seccion9, lineas: seccion9.lineas.map((o) => ({ ...o, base: deCentavos(o.base) })) },
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
    comoEnElFormulario: comoEnElFormulario(datos.formulario),
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
