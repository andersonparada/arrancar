import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { quetzales } from '../../../dominio/avisos.js';
import { rangoDeBancarizacion } from '../../../dominio/rango-de-bancarizacion.js';
import { ProveedorDelReporteNoExiste } from '../../errores.js';
import type {
  CifrasDeBancarizacionDto,
  DocumentoSobreElUmbralDto,
  MesDeBancarizacionDto,
  ReporteDeBancarizacionDto,
} from '../../dto/reportes-de-bancarizacion.dto.js';
import type {
  ConsultasDeBancarizacion,
  DocumentoSobreElUmbral,
  PagoEnEfectivoDelRango,
} from '../../puertos/puertos-de-bancarizacion-del-reporte.js';
import type { UmbralDeBancarizacion } from '../../puertos/puertos-de-documentos.js';
import type { ConsultasDePagos, DatosFiscalesDeLaEmpresa } from '../../puertos/puertos-de-pagos.js';
import {
  armarMeses,
  claveDeProveedorYMes,
  dtoDeCargo,
  marcar,
  marcarPagos,
  sumarCargos,
  type CargoMarcado,
  type EfectosPorCargo,
} from './armado-de-bancarizacion.js';
import type { DependenciasDeReportesDeSaldos } from './base-del-corte.js';

/** Lo que necesita R9: la base de los reportes, sus lecturas, la suma del mes de CP4, los datos fiscales y el umbral. */
export interface DependenciasDeBancarizacion extends DependenciasDeReportesDeSaldos {
  consultasDeBancarizacion: ConsultasDeBancarizacion;
  consultasDePagos: Pick<ConsultasDePagos, 'pagosDelMes'>;
  fiscal: Pick<DatosFiscalesDeLaEmpresa, 'efectoDe'>;
  umbral: UmbralDeBancarizacion;
}

/** Los filtros de R9: los meses `AAAA-MM` (por omisión los últimos 12; máximo 48) y un proveedor. */
export interface SolicitudDeBancarizacion {
  desde?: string;
  hasta?: string;
  proveedorId?: string;
  /** Solo lo que tiene efecto fiscal (por omisión, sí). */
  soloConEfecto: boolean;
}

const leyendasDe = (umbralCentavos: number): string[] => [
  'Arrancar solo suma los pagos registrados en Cuentas por pagar.',
  'Arrancar no rectifica el Libro de compras: si ya tomó el crédito fiscal, consulte a su contador (Código Tributario art. 106).',
  `Umbral usado: ${quetzales(umbralCentavos)} (el configurado hoy); verifique el vigente para cada mes.`,
];

const sumaEfectivo = (pagos: readonly { montoCentavos: number }[]): number =>
  pagos.reduce((total, { montoCentavos }) => total + montoCentavos, 0);

function dtoDeDocumento(documento: DocumentoSobreElUmbral, marcado: CargoMarcado): DocumentoSobreElUmbralDto {
  const efectivo = documento.pagos.filter(({ forma }) => forma === 'efectivo');
  return {
    ...dtoDeCargo(marcado),
    proveedorId: documento.cargo.proveedorId,
    proveedorNombre: documento.proveedorNombre,
    total: deCentavos(documento.cargo.totalCentavos),
    efectivo: deCentavos(sumaEfectivo(efectivo)),
    pagos: documento.pagos.map(({ montoCentavos, ...pago }) => ({ ...pago, monto: deCentavos(montoCentavos) })),
  };
}

function cifras(
  cantidad: number,
  efectivoCentavos: number,
  marcados: readonly CargoMarcado[],
): CifrasDeBancarizacionDto {
  const { ivaCentavos, costoCentavos } = sumarCargos(marcados);
  return {
    cantidad,
    efectivo: deCentavos(efectivoCentavos),
    ivaEnRiesgo: deCentavos(ivaCentavos),
    costoNoDeducible: deCentavos(costoCentavos),
  };
}

/**
 * R9: los pagos en efectivo que, a los ojos de la SAT, no respaldan costo ni crédito fiscal (Decreto 20-2006 art. 20). Dos
 * criterios: el mes de un proveedor que llega al umbral (la suma de CP4) con pagos en efectivo, y todo cargo del umbral o
 * más pagado en parte en efectivo, aunque ningún mes llegue. Se calcula en vivo; no toca el Libro de compras.
 */
export class ReporteDeBancarizacion {
  constructor(private readonly dependencias: DependenciasDeBancarizacion) {}

  ejecutar(operador: Operador, solicitud: SolicitudDeBancarizacion): Promise<ReporteDeBancarizacionDto> {
    const { unidadDeTrabajo, reloj, consultas, umbral } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const rango = rangoDeBancarizacion(solicitud, await reloj.hoy(operador));
      if (solicitud.proveedorId && !(await consultas.proveedorExiste(solicitud.proveedorId))) {
        throw new ProveedorDelReporteNoExiste();
      }
      const umbralCentavos = await umbral.centavos(operador);
      const filtro = { empresaId: operador.empresaId, desde: rango.desde, hasta: rango.hasta };
      const leido = await this.leer({ ...filtro, proveedorId: solicitud.proveedorId, umbralCentavos }, operador);
      return this.armar({ ...rango, umbralCentavos, soloConEfecto: solicitud.soloConEfecto }, leido);
    });
  }

  /** Lo que dicen las lecturas y los efectos fiscales de todos los cargos que salen. */
  private async leer(filtro: Parameters<ConsultasDeBancarizacion['documentosSobreElUmbral']>[0], operador: Operador) {
    const { consultasDeBancarizacion, cargaInicial, fiscal } = this.dependencias;
    const pagos = await consultasDeBancarizacion.pagosEnEfectivo(filtro);
    const documentos = await consultasDeBancarizacion.documentosSobreElUmbral(filtro);
    const ids = [...pagos.flatMap((pago) => pago.cargos), ...documentos.map(({ cargo }) => cargo)].map(
      ({ documentoId }) => documentoId,
    );
    const { fechaDeInicio } = await cargaInicial.obtener(operador);
    const efectos = await fiscal.efectoDe([...new Set(ids)], fechaDeInicio);
    return { pagos, documentos, efectos, sumas: await this.sumasDelMes(pagos, filtro.umbralCentavos) };
  }

  /** La suma del mes de cada proveedor con efectivo, con la misma consulta de CP4; solo las que llegan al umbral. */
  private async sumasDelMes(pagos: readonly PagoEnEfectivoDelRango[], umbralCentavos: number) {
    const sumas = new Map<string, number>();
    for (const { proveedorId, fecha } of pagos) {
      const clave = claveDeProveedorYMes(proveedorId, fecha);
      if (sumas.has(clave)) continue;
      const delMes = await this.dependencias.consultasDePagos.pagosDelMes(proveedorId, fecha);
      const suma = sumaEfectivo(delMes);
      if (suma >= umbralCentavos) sumas.set(clave, suma);
    }
    return sumas;
  }

  private armar(
    { desdeMes, hastaMes, umbralCentavos, soloConEfecto }: OpcionesDeArmado,
    leido: Leido,
  ): ReporteDeBancarizacionDto {
    const { meses, cargos } = armarMeses(marcarPagos(leido.pagos, leido.efectos, soloConEfecto), leido.sumas);
    const documentos = leido.documentos
      .map((documento) => ({ documento, marcado: marcar(documento.cargo, leido.efectos) }))
      .filter(({ marcado }) => !soloConEfecto || marcado.marcas.marcas.length > 0);
    return {
      desde: desdeMes,
      hasta: hastaMes,
      umbral: deCentavos(umbralCentavos),
      meses,
      documentosSobreElUmbral: documentos.map(({ documento, marcado }) => dtoDeDocumento(documento, marcado)),
      totales: totalesDe({ meses, cargosDeMeses: cargos, documentos }),
      leyendas: leyendasDe(umbralCentavos),
    };
  }
}

interface OpcionesDeArmado {
  desdeMes: string;
  hastaMes: string;
  umbralCentavos: number;
  soloConEfecto: boolean;
}

interface Leido {
  pagos: PagoEnEfectivoDelRango[];
  documentos: DocumentoSobreElUmbral[];
  efectos: EfectosPorCargo;
  sumas: Map<string, number>;
}

interface SeccionesParaTotalizar {
  meses: readonly MesDeBancarizacionDto[];
  cargosDeMeses: readonly CargoMarcado[];
  documentos: readonly { documento: DocumentoSobreElUmbral; marcado: CargoMarcado }[];
}

function totalesDe({ meses, cargosDeMeses, documentos }: SeccionesParaTotalizar): ReporteDeBancarizacionDto['totales'] {
  const efectivoDeMeses = meses.reduce((total, { efectivo }) => total + aCentavos(efectivo), 0);
  const efectivoDeDocumentos = documentos.reduce(
    (total, { documento }) => total + sumaEfectivo(documento.pagos.filter(({ forma }) => forma === 'efectivo')),
    0,
  );
  const deDocumentos = documentos.map(({ marcado }) => marcado);
  const todos = sumarCargos([...cargosDeMeses, ...deDocumentos]);
  return {
    meses: cifras(meses.length, efectivoDeMeses, cargosDeMeses),
    documentos: cifras(documentos.length, efectivoDeDocumentos, deDocumentos),
    total: { ivaEnRiesgo: deCentavos(todos.ivaCentavos), costoNoDeducible: deCentavos(todos.costoCentavos) },
  };
}
