import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type {
  CifraDelCuadre,
  HallazgoDeCierre,
  RevisionDeCierreDeModulo,
} from '../../../../core/contratos/empresas.contratos.js';
import type { SaldoInicialDto, TotalesDeSaldosIniciales } from '../../dto/saldo-inicial.dto.js';
import { totalesDeSaldos, totalesPorClase } from './totales-de-saldos-iniciales.js';

/** Cuántas clases caben en las cifras: cada una lleva dos y el tope de Empresas es de 200 por módulo. */
const CLASES_MAXIMAS = 90;

const quetzales = (centavos: number): string => {
  const [enteros = '0', decimales = '00'] = deCentavos(centavos).split('.');
  return `Q${enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimales}`;
};

const fechaLegible = (fecha: string): string => fecha.split('-').reverse().join('/');

const plural = (cantidad: number, singular: string, pluralDe: string): string =>
  `${cantidad} ${cantidad === 1 ? singular : pluralDe}`;

const aviso = (codigo: string, mensaje: string): HallazgoDeCierre => ({
  codigo,
  nivel: 'aviso',
  mensaje,
  registro: null,
});

/** El valor por depreciar del libro contable: lo que falta menos el residual. */
const porDepreciar = (saldo: SaldoInicialDto): number =>
  aCentavos(saldo.costo) - aCentavos(saldo.depreciacionAcumuladaContable) - aCentavos(saldo.valorResidual ?? '0');

function vidaAgotada(saldos: readonly SaldoInicialDto[]): HallazgoDeCierre[] {
  const agotados = saldos.filter(
    (saldo) => !saldo.enConstruccion && saldo.vidaUtilRestanteMeses === 0 && porDepreciar(saldo) > 0,
  );
  if (agotados.length === 0) return [];
  const total = agotados.reduce((suma, saldo) => suma + porDepreciar(saldo), 0);
  return [
    aviso(
      'vida_agotada_con_saldo',
      `${plural(agotados.length, 'activo de saldo inicial no tiene', 'activos de saldo inicial no tienen')} vida útil restante pero sí valor por depreciar por ${quetzales(total)}: revise su vida o su depreciación acumulada.`,
    ),
  ];
}

function sinUbicacion(saldos: readonly SaldoInicialDto[]): HallazgoDeCierre[] {
  const sinLocalidad = saldos.filter((saldo) => saldo.localidadId === null).length;
  if (sinLocalidad === 0) return [];
  return [
    aviso(
      'sin_ubicacion',
      `${plural(sinLocalidad, 'activo de saldo inicial no tiene', 'activos de saldo inicial no tienen')} localidad: el inventario físico no ${sinLocalidad === 1 ? 'lo' : 'los'} encontrará.`,
    ),
  ];
}

function obrasEnConstruccion(saldos: readonly SaldoInicialDto[]): HallazgoDeCierre[] {
  const obras = saldos.filter((saldo) => saldo.enConstruccion);
  if (obras.length === 0) return [];
  const costo = obras.reduce((suma, obra) => suma + aCentavos(obra.costo), 0);
  return [
    aviso(
      'en_construccion',
      `${plural(obras.length, 'obra en construcción por', 'obras en construcción por')} ${quetzales(costo)} ${obras.length === 1 ? 'entra' : 'entran'} en el balance sin depreciar.`,
    ),
  ];
}

function hallazgosDeLosSaldos(saldos: readonly SaldoInicialDto[], corte: string): HallazgoDeCierre[] {
  if (saldos.length === 0)
    return [
      aviso(
        'sin_saldos_iniciales',
        `No hay ningún activo fijo de saldo inicial. Si la empresa tenía activos al ${fechaLegible(corte)}, cárguelos antes de cerrar.`,
      ),
    ];
  return [...vidaAgotada(saldos), ...sinUbicacion(saldos), ...obrasEnConstruccion(saldos)];
}

function cifrasGenerales(totales: TotalesDeSaldosIniciales): CifraDelCuadre[] {
  const monto = (clave: string, etiqueta: string, valor: string): CifraDelCuadre => ({
    clave,
    etiqueta,
    tipo: 'monto',
    valor,
    registro: null,
  });
  return [
    { clave: 'activos', etiqueta: 'Activos', tipo: 'cantidad', valor: String(totales.activos), registro: null },
    monto('costo', 'Costo', totales.costo),
    monto('depreciacion_acumulada_contable', 'Depreciación acumulada contable', totales.depreciacionAcumuladaContable),
    monto('valor_en_libros', 'Valor en libros', totales.valorEnLibros),
    monto('costo_fiscal', 'Costo fiscal', totales.costoFiscal),
    monto('base_fiscal', 'Base fiscal', totales.baseFiscal),
    monto('depreciacion_acumulada_fiscal', 'Depreciación acumulada fiscal', totales.depreciacionAcumuladaFiscal),
  ];
}

function cifrasPorClase(saldos: readonly SaldoInicialDto[]): CifraDelCuadre[] {
  return totalesPorClase(saldos)
    .slice(0, CLASES_MAXIMAS)
    .flatMap(({ claseId, clase, costo, depreciacionAcumuladaContable }) => {
      const registro = { id: claseId, nombre: clase };
      return [
        { clave: 'costo_de_clase', etiqueta: 'Costo', tipo: 'monto' as const, valor: costo, registro },
        {
          clave: 'depreciacion_de_clase',
          etiqueta: 'Depreciación acumulada contable',
          tipo: 'monto' as const,
          valor: depreciacionAcumuladaContable,
          registro,
        },
      ];
    });
}

/**
 * Lo que Activos fijos dice al cerrar la carga inicial (EM-2): avisos y cifras del cuadre. Con el módulo activo y nada
 * cargado responde el aviso `sin_saldos_iniciales`. Todos son avisos: nunca pide motivo.
 */
export function revisionDeCierreDeActivosFijos(
  saldos: readonly SaldoInicialDto[],
  fechaDeCorte: string,
): RevisionDeCierreDeModulo {
  return {
    nombreDelModulo: 'Activos fijos',
    resumen: `${plural(saldos.length, 'activo de saldo inicial', 'activos de saldo inicial')} al ${fechaLegible(fechaDeCorte)}`,
    ruta: '/activos-fijos/saldos-iniciales',
    hallazgos: hallazgosDeLosSaldos(saldos, fechaDeCorte),
    cifras: [...cifrasGenerales(totalesDeSaldos(saldos)), ...cifrasPorClase(saldos)],
  };
}
