import type { Cierres } from '../aplicacion/puertos/cierres.js';
import type { CargaInicial, EstadoDeLaCarga } from '../aplicacion/puertos/carga-inicial.js';
import type { ConsultasBandeja, FilaDeBandeja } from '../aplicacion/puertos/consultas-bandeja.js';
import type { ConsultasDeCierre, HallazgosDeActivos, TotalDeClase } from '../aplicacion/puertos/consultas-de-cierre.js';
import type { LectorDeMesesDeConstruccion } from '../aplicacion/puertos/lector-de-meses-de-construccion.js';
import type { CierreNuevo, Reapertura, RepositorioCierres } from '../aplicacion/puertos/repositorio-cierres.js';
import type { ActivoParaCerrar, CuotaDelMes } from '../dominio/depreciacion/cierre-del-mes.js';
import type { CierreGuardado } from '../dominio/depreciacion/cierre-guardado.js';
import type { GrupoDeActivos } from '../dominio/depreciacion/hallazgos-del-cierre.js';

const vacio: GrupoDeActivos = { cantidad: 0, codigos: [] };

export const sinHallazgosDeActivos: HallazgosDeActivos = {
  enConstruccionAntiguos: vacio,
  enUsoSinLocalidad: vacio,
  edificiosSinValores: vacio,
  conCostosDeDocumentosAnulados: vacio,
  conSaldoInicial: false,
};

type ActivoSinAcumulados = Omit<ActivoParaCerrar, 'depreciadoPorTramo' | 'acumuladaCentavos'>;
type CuotaGuardada = CuotaDelMes & { periodo: string; vigente: boolean };

/**
 * Cierres, cuotas y lecturas del cierre en memoria, como los dejaría la base: lo depreciado de cada tramo y la
 * acumulada salen de las cuotas vigentes, así que reabrir y volver a cerrar se comporta igual que en PostgreSQL.
 */
export class CierresEnMemoria implements Cierres, RepositorioCierres, ConsultasDeCierre {
  /** Los activos que se depreciarían (la prueba los pone). */
  activos: ActivoSinAcumulados[] = [];
  hallazgos: HallazgosDeActivos = sinHallazgosDeActivos;
  regimen: string | null = null;
  readonly cuotas: CuotaGuardada[] = [];
  readonly candados: string[] = [];
  private readonly porPeriodo = new Map<string, CierreGuardado>();

  async ultimoMesCerrado(): Promise<string | null> {
    const cerrados = [...this.porPeriodo.values()].filter((cierre) => cierre.estado === 'cerrado');
    return (
      cerrados
        .map((cierre) => cierre.periodo)
        .sort()
        .at(-1) ?? null
    );
  }

  async usaronTramosDelActivo(activoId: string): Promise<boolean> {
    return this.cuotas.some((cuota) => cuota.activoId === activoId && cuota.vigente);
  }

  async bloquear(modo: 'compartido' | 'exclusivo'): Promise<void> {
    this.candados.push(modo);
  }

  async buscar(periodo: string): Promise<CierreGuardado | null> {
    return this.porPeriodo.get(periodo) ?? null;
  }

  async listar(): Promise<CierreGuardado[]> {
    return [...this.porPeriodo.values()].sort((a, b) => b.periodo.localeCompare(a.periodo));
  }

  /** Lo que haría el único parcial `cuotas_vigente_unica`. */
  private exigirSinCuotasRepetidas(nuevo: CierreNuevo): void {
    const repetida = nuevo.cuotas.some((cuota) =>
      this.cuotas.some(
        (guardada) =>
          guardada.vigente &&
          guardada.periodo === nuevo.periodo &&
          guardada.activoId === cuota.activoId &&
          guardada.libro === cuota.libro,
      ),
    );
    if (repetida) throw new Error('cuotas_vigente_unica: ya hay una cuota vigente de ese activo, libro y mes');
  }

  async guardar(nuevo: CierreNuevo): Promise<void> {
    this.exigirSinCuotasRepetidas(nuevo);
    this.porPeriodo.set(nuevo.periodo, {
      periodo: nuevo.periodo,
      estado: 'cerrado',
      cerradoEn: nuevo.ahora,
      cerradoPor: nuevo.cerradoPor,
      reabiertoEn: null,
      reabiertoPor: null,
      motivoDeReapertura: null,
      regimenIsr: nuevo.regimenIsr,
      totalContableCentavos: nuevo.totales.contableCentavos,
      totalFiscalCentavos: nuevo.totales.fiscalCentavos,
      activosDepreciados: nuevo.totales.activosDepreciados,
    });
    this.cuotas.push(...nuevo.cuotas.map((cuota) => ({ ...cuota, periodo: nuevo.periodo, vigente: true })));
  }

  async reabrir({ periodo, usuarioId, ahora, motivo }: Reapertura): Promise<void> {
    for (const cuota of this.cuotas) if (cuota.periodo === periodo) cuota.vigente = false;
    const cierre = this.porPeriodo.get(periodo)!;
    this.porPeriodo.set(periodo, {
      ...cierre,
      estado: 'reabierto',
      reabiertoEn: ahora,
      reabiertoPor: usuarioId,
      motivoDeReapertura: motivo,
    });
  }

  async activosParaCerrar(): Promise<ActivoParaCerrar[]> {
    const vigentes = this.cuotas.filter((cuota) => cuota.vigente);
    return this.activos.map((activo) => {
      const suyas = vigentes.filter((cuota) => cuota.activoId === activo.activoId);
      const sumaDe = (libro: 'contable' | 'fiscal') =>
        suyas.filter((cuota) => cuota.libro === libro).reduce((total, cuota) => total + cuota.montoCentavos, 0);
      const depreciadoPorTramo = new Map<string, number>();
      for (const cuota of suyas)
        depreciadoPorTramo.set(cuota.tramoId, (depreciadoPorTramo.get(cuota.tramoId) ?? 0) + cuota.montoCentavos);
      return {
        ...activo,
        depreciadoPorTramo,
        acumuladaCentavos: { contable: sumaDe('contable'), fiscal: sumaDe('fiscal') },
      };
    });
  }

  async primerMesConTramos(): Promise<string | null> {
    const desde = this.activos.flatMap((activo) => activo.tramos.map((tramo) => tramo.desdePeriodo)).sort();
    return desde[0] ?? null;
  }

  async hallazgosDeActivos(): Promise<HallazgosDeActivos> {
    return this.hallazgos;
  }

  async regimenIsr(): Promise<string | null> {
    return this.regimen;
  }

  async totalesPorClase(periodo: string): Promise<TotalDeClase[]> {
    const delMes = this.cuotas.filter((cuota) => cuota.periodo === periodo && cuota.vigente);
    const clases = [...new Set(delMes.map((cuota) => cuota.claseId))];
    const suma = (claseId: string, libro: string) =>
      delMes
        .filter((cuota) => cuota.claseId === claseId && cuota.libro === libro)
        .reduce((total, cuota) => total + cuota.montoCentavos, 0);
    return clases.map((claseId) => ({
      claseId,
      clase: `Clase ${claseId}`,
      contableCentavos: suma(claseId, 'contable'),
      fiscalCentavos: suma(claseId, 'fiscal'),
    }));
  }
}

/** La carga inicial que la prueba decide. */
export class CargaInicialFija implements CargaInicial {
  constructor(public estado: EstadoDeLaCarga = { fechaDeInicio: null, cerrada: true }) {}

  async obtener(): Promise<EstadoDeLaCarga> {
    return this.estado;
  }
}

/** La bandeja con las líneas que la prueba ponga. */
export class BandejaFija implements ConsultasBandeja {
  lineas: FilaDeBandeja[] = [];

  async listar(): Promise<FilaDeBandeja[]> {
    return this.lineas;
  }
}

export class MesesDeConstruccionFijos implements LectorDeMesesDeConstruccion {
  async paraEmpresa(): Promise<number> {
    return 12;
  }
}
