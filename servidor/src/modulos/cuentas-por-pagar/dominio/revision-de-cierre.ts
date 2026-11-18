import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import type {
  CifraDelCuadre,
  HallazgoDeCierre,
  RevisionDeCierreDeModulo,
} from '../../core/contratos/empresas.contratos.js';
import { fechaLegible, quetzales } from './avisos.js';

/** Lo que suman los saldos iniciales vigentes de un proveedor (centavos). */
export interface SumasDelProveedor {
  documentos: number;
  documentosConRetenciones: number;
  cargosCentavos: number;
  notasAFavorCentavos: number;
  retencionesPorPracticarCentavos: number;
}

/** Los documentos del Libro de compras con emisión anterior a la fecha de inicio que no son saldo inicial. */
export interface DocumentosDelLibroAnteriores {
  cantidad: number;
  /** Σ de los cargos menos Σ de las notas, en centavos. */
  montoCentavos: number;
}

export interface DatosDeLaRevision {
  /** `aaaa-mm-dd`. */
  fechaDeInicio: string;
  proveedores: SumasDelProveedor[];
  librosAnteriores: DocumentosDelLibroAnteriores;
}

const netoDe = (proveedor: SumasDelProveedor) => proveedor.cargosCentavos - proveedor.notasAFavorCentavos;
const suma = (valores: number[]) => valores.reduce((total, valor) => total + valor, 0);
const plural = (cantidad: number, singular: string, pluralDe: string) =>
  `${cantidad} ${cantidad === 1 ? singular : pluralDe}`;

/** El día anterior a la fecha de inicio: hasta él llegan los saldos de apertura. */
export function fechaDeCorteDeApertura(fechaDeInicio: string): string {
  const dia = new Date(`${fechaDeInicio}T00:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() - 1);
  return dia.toISOString().slice(0, 10);
}

function sinSaldosIniciales(corte: string): HallazgoDeCierre {
  return {
    codigo: 'sin_saldos_iniciales',
    nivel: 'aviso',
    mensaje:
      `No hay ningún saldo inicial de proveedores. Si la empresa debía algo al ${fechaLegible(corte)}, ` +
      'cárguelo antes de cerrar.',
    registro: null,
  };
}

function retencionesPorPracticar(datos: DatosDeLaRevision): HallazgoDeCierre[] {
  const documentos = suma(datos.proveedores.map((proveedor) => proveedor.documentosConRetenciones));
  const total = suma(datos.proveedores.map((proveedor) => proveedor.retencionesPorPracticarCentavos));
  if (documentos === 0) return [];
  return [
    {
      codigo: 'retenciones_por_practicar',
      nivel: 'aviso',
      mensaje:
        `${plural(documentos, 'documento con retenciones', 'documentos con retenciones')} por practicar por ` +
        `${quetzales(total)}. Verifique que no se hayan acreditado en cuenta antes del ` +
        `${fechaLegible(datos.fechaDeInicio)}: si así fue, la retención ya debía practicarse y enterarse.`,
      registro: null,
    },
  ];
}

function documentosDelLibroAnteriores({ fechaDeInicio, librosAnteriores }: DatosDeLaRevision): HallazgoDeCierre[] {
  if (librosAnteriores.cantidad === 0) return [];
  const { cantidad, montoCentavos } = librosAnteriores;
  return [
    {
      codigo: 'documentos_del_libro_anteriores',
      nivel: 'aviso',
      mensaje:
        `${plural(cantidad, 'documento', 'documentos')} del Libro de compras, por ${quetzales(montoCentavos)}, ` +
        `${cantidad === 1 ? 'tiene' : 'tienen'} fecha de emisión anterior al ${fechaLegible(fechaDeInicio)} y no ` +
        `${cantidad === 1 ? 'es' : 'son'} saldo inicial: si se debían a esa fecha, deben estar en el balance de ` +
        'apertura y no contarse dos veces.',
      registro: null,
    },
  ];
}

function proveedoresConSaldoAFavor(proveedores: SumasDelProveedor[]): HallazgoDeCierre[] {
  const aFavor = proveedores.map(netoDe).filter((neto) => neto < 0);
  if (aFavor.length === 0) return [];
  const mensaje =
    `${plural(aFavor.length, 'proveedor tiene', 'proveedores tienen')} saldo a favor de la empresa por ` +
    `${quetzales(-suma(aFavor))}: en el balance de apertura van como anticipo (activo), sin restarlos de Proveedores.`;
  return [{ codigo: 'proveedores_con_saldo_a_favor', nivel: 'aviso', mensaje, registro: null }];
}

const cantidad = (clave: string, etiqueta: string, valor: number): CifraDelCuadre => ({
  clave,
  etiqueta,
  tipo: 'cantidad',
  valor: String(valor),
  registro: null,
});
const monto = (clave: string, etiqueta: string, centavos: number): CifraDelCuadre => ({
  clave,
  etiqueta,
  tipo: 'monto',
  valor: deCentavos(centavos),
  registro: null,
});

/**
 * Las cifras del cuadre: saldo de proveedores y saldo a favor de la empresa van **separados** (pasivo y activo no se
 * compensan); el neto vive en la pantalla del cuadre.
 */
function cifrasDelCuadre({ proveedores }: DatosDeLaRevision): CifraDelCuadre[] {
  const netos = proveedores.map(netoDe);
  return [
    cantidad('documentos', 'Documentos', suma(proveedores.map((proveedor) => proveedor.documentos))),
    cantidad('proveedores', 'Proveedores', proveedores.length),
    monto('cargos', 'Cargos', suma(proveedores.map((proveedor) => proveedor.cargosCentavos))),
    monto('notas_a_favor', 'Notas a favor', suma(proveedores.map((proveedor) => proveedor.notasAFavorCentavos))),
    monto('saldo_de_proveedores', 'Saldo de proveedores', suma(netos.filter((neto) => neto > 0))),
    monto('saldo_a_favor_de_la_empresa', 'Saldo a favor de la empresa', -suma(netos.filter((neto) => neto < 0))),
    monto(
      'retenciones_por_practicar',
      'Retenciones por practicar',
      suma(proveedores.map((proveedor) => proveedor.retencionesPorPracticarCentavos)),
    ),
  ];
}

/**
 * Lo que Cuentas por pagar le dice a quien va a cerrar la carga inicial: solo avisos (no se pide motivo mientras no haya
 * con qué comparar, dictamen del 2026-11-18) y las cifras del cuadre.
 */
export function revisionDeCierreDeCuentasPorPagar(datos: DatosDeLaRevision): RevisionDeCierreDeModulo {
  const { proveedores, fechaDeInicio } = datos;
  const documentos = suma(proveedores.map((proveedor) => proveedor.documentos));
  return {
    nombreDelModulo: 'Cuentas por pagar',
    resumen:
      documentos === 0
        ? null
        : `${plural(documentos, 'documento', 'documentos')} de ${plural(proveedores.length, 'proveedor', 'proveedores')}`,
    ruta: '/cuentas-por-pagar/saldos-iniciales',
    hallazgos: [
      ...(documentos === 0 ? [sinSaldosIniciales(fechaDeCorteDeApertura(fechaDeInicio))] : []),
      ...retencionesPorPracticar(datos),
      ...documentosDelLibroAnteriores(datos),
      ...proveedoresConSaldoAFavor(proveedores),
    ],
    cifras: cifrasDelCuadre(datos),
  };
}
