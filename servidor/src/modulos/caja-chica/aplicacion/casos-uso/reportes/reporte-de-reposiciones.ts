import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { esDeducible } from '../../../dominio/reglas-de-reportes.js';
import type { FormaDeReposicion } from '../../../dominio/reposiciones.js';
import type {
  ConceptoDeReposicionesDto,
  FondoDeReposicionesDto,
  ReporteDeReposicionesDto,
} from '../../dto/reportes.dto.js';
import type { ReposicionDeReporte } from '../../puertos/puertos-de-reportes.js';
import { periodoDe, type DependenciasDeReportes, type SolicitudDePeriodo } from './reportes-de-comprobantes.js';

export const LEYENDAS_DE_REPOSICIONES = [
  'Cuenta las reposiciones vigentes del período, por la fecha de la reposición; las anuladas no cuentan.',
  'Cada comprobante repuesto va a su concepto de gasto; un documento con líneas de varios conceptos va en «Varios conceptos».',
  'Solo son deducibles los documentos que quedaron dentro del libro de compras; los vales de gasto y los faltantes no.',
];

const NOMBRES_DE_FORMA: Record<FormaDeReposicion, string> = {
  cheque: 'Cheque',
  nota_de_debito: 'Nota de débito',
  compensada_al_cerrar: 'Compensada al cerrar',
};

const respaldoDe = ({ reposicion, referenciaDeBancos }: ReposicionDeReporte): string =>
  [NOMBRES_DE_FORMA[reposicion.forma], referenciaDeBancos].filter(Boolean).join(' ');

/** Lo deducible y lo no deducible de cada concepto, en centavos, por orden de concepto. */
function conceptosDe({ lineas }: { lineas: ReposicionDeReporte['lineas'] }): ConceptoDeReposicionesDto[] {
  const porConcepto = new Map<string, { deducible: number; noDeducible: number }>();
  for (const { comprobante, montoCentavos } of lineas) {
    const cifras = porConcepto.get(comprobante.concepto) ?? { deducible: 0, noDeducible: 0 };
    cifras[esDeducible(comprobante.comprobante) ? 'deducible' : 'noDeducible'] += montoCentavos;
    porConcepto.set(comprobante.concepto, cifras);
  }
  return [...porConcepto.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es'))
    .map(([concepto, { deducible, noDeducible }]) => ({
      concepto,
      deducible: deCentavos(deducible),
      noDeducible: deCentavos(noDeducible),
      total: deCentavos(deducible + noDeducible),
    }));
}

/** Suma una columna de las filas de concepto (ya en texto) volviendo a centavos. */
const sumaDe = (conceptos: readonly ConceptoDeReposicionesDto[], columna: 'deducible' | 'noDeducible'): number =>
  conceptos.reduce((suma, concepto) => suma + aCentavos(concepto[columna]), 0);

function fondoDe(reposiciones: ReposicionDeReporte[]): FondoDeReposicionesDto {
  const conceptos = conceptosDe({ lineas: reposiciones.flatMap(({ lineas }) => lineas) });
  const [deducible, noDeducible] = [sumaDe(conceptos, 'deducible'), sumaDe(conceptos, 'noDeducible')];
  return {
    fondoId: reposiciones[0]!.reposicion.fondoId,
    fondoNombre: reposiciones[0]!.fondoNombre,
    reposiciones: reposiciones.map((item) => ({
      id: item.reposicion.id,
      numero: item.reposicion.numero,
      fecha: item.reposicion.fecha,
      forma: item.reposicion.forma,
      respaldo: respaldoDe(item),
      monto: deCentavos(item.reposicion.montoCentavos),
    })),
    conceptos,
    deducible: deCentavos(deducible),
    noDeducible: deCentavos(noDeducible),
    total: deCentavos(deducible + noDeducible),
  };
}

function agruparPorFondo(reposiciones: readonly ReposicionDeReporte[]): FondoDeReposicionesDto[] {
  const porFondo = new Map<string, ReposicionDeReporte[]>();
  for (const item of reposiciones) {
    porFondo.set(item.reposicion.fondoId, [...(porFondo.get(item.reposicion.fondoId) ?? []), item]);
  }
  return [...porFondo.values()].map(fondoDe).sort((a, b) => a.fondoNombre.localeCompare(b.fondoNombre, 'es'));
}

/** CC-R2 (`reportes.ver`): lo repuesto en el período por fondo y concepto de gasto, con su cheque o nota de Bancos. */
export class ReporteDeReposiciones {
  constructor(private readonly dependencias: DependenciasDeReportes) {}

  /** @throws PeriodoInvertido si `desde` es posterior a `hasta`. */
  ejecutar(operador: Operador, solicitud: SolicitudDePeriodo): Promise<ReporteDeReposicionesDto> {
    const { unidadDeTrabajo, lecturas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const periodo = await periodoDe(this.dependencias, { operador, solicitud });
      const reposiciones = await lecturas.reposicionesDelPeriodo({ ...periodo, fondoId: solicitud.fondoId });
      const fondos = agruparPorFondo(reposiciones);
      return { ...periodo, fondos, total: totalDe(fondos, reposiciones.length), leyendas: LEYENDAS_DE_REPOSICIONES };
    });
  }
}

function totalDe(fondos: readonly FondoDeReposicionesDto[], cantidad: number): ReporteDeReposicionesDto['total'] {
  const sumar = (columna: 'deducible' | 'noDeducible' | 'total') =>
    deCentavos(fondos.reduce((suma, fondo) => suma + aCentavos(fondo[columna]), 0));
  return { cantidad, deducible: sumar('deducible'), noDeducible: sumar('noDeducible'), total: sumar('total') };
}
