import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { numeroDelAnticipo, porJustificar } from '../../../dominio/anticipos.js';
import { TRAMOS_DE_ANTIGUEDAD, tramoDeAntiguedad } from '../../../dominio/antiguedad-de-anticipos.js';
import { diasEntre } from '../../../dominio/fechas.js';
import type {
  AnticipoPorLiquidarDto,
  BeneficiarioPorLiquidarDto,
  ReporteDeAnticiposPorLiquidarDto,
  TramoDelReporteDto,
} from '../../dto/reportes.dto.js';
import type { ConsultasDeAnticipos, FilaDeAnticipo } from '../../puertos/puertos-de-anticipos.js';

export interface DependenciasDeAnticiposPorLiquidar {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDeAnticipos;
  reloj: Reloj;
}

export interface SolicitudDeAnticiposPorLiquidar {
  /** Por omisión, hoy. */
  corte?: string;
  beneficiarioId?: string;
  soloVencidos?: boolean;
}

export const LEYENDAS_DE_ANTICIPOS_POR_LIQUIDAR = [
  'Lo por justificar es lo que el beneficiario aún debía sustentar con documentos al corte (monto menos los gastos de entonces).',
  'La antigüedad cuenta los días pasados de la fecha límite. Un anticipo cuenta hasta que se liquida o se anula.',
];

/** Cuántos anticipos trae el reporte de una vez: no se pagina, es una lista de cierre. */
const TOPE_DE_ANTICIPOS = 10_000;

function anticipoDelReporte({ anticipo, gastadoCentavos }: FilaDeAnticipo, corte: string): AnticipoPorLiquidarDto {
  const diasVencido = Math.max(0, diasEntre(anticipo.fechaLimite, corte));
  return {
    id: anticipo.id,
    numero: numeroDelAnticipo(anticipo.numero, anticipo.anioDeNumero),
    clase: anticipo.clase,
    fecha: anticipo.fecha,
    fechaLimite: anticipo.fechaLimite,
    monto: deCentavos(anticipo.montoCentavos),
    porJustificar: deCentavos(porJustificar(anticipo, gastadoCentavos)),
    diasDesdeLaEntrega: Math.max(0, diasEntre(anticipo.fecha, corte)),
    diasVencido,
    vencido: diasVencido > 0,
    tramo: tramoDeAntiguedad(diasVencido),
  };
}

const sumar = (filas: readonly AnticipoPorLiquidarDto[], valor: (fila: AnticipoPorLiquidarDto) => string): string =>
  deCentavos(filas.reduce((total, fila) => total + aCentavos(valor(fila)), 0));

function beneficiarioDelReporte(
  { beneficiarioId, beneficiario, esEmpleado }: FilaDeAnticipo['anticipo'],
  anticipos: AnticipoPorLiquidarDto[],
): BeneficiarioPorLiquidarDto {
  return {
    beneficiarioId,
    beneficiario,
    esEmpleado,
    cantidad: anticipos.length,
    vencidos: anticipos.filter((a) => a.vencido).length,
    monto: sumar(anticipos, (a) => a.monto),
    porJustificar: sumar(anticipos, (a) => a.porJustificar),
    anticipos,
  };
}

/** Agrupa por beneficiario (con el nombre que tenía el anticipo más reciente) y los ordena por nombre. */
function agruparPorBeneficiario(filas: FilaDeAnticipo[], corte: string): BeneficiarioPorLiquidarDto[] {
  const grupos = new Map<string, { muestra: FilaDeAnticipo['anticipo']; anticipos: AnticipoPorLiquidarDto[] }>();
  for (const fila of filas) {
    const grupo = grupos.get(fila.anticipo.beneficiarioId) ?? { muestra: fila.anticipo, anticipos: [] };
    grupo.anticipos.push(anticipoDelReporte(fila, corte));
    grupos.set(fila.anticipo.beneficiarioId, grupo);
  }
  return [...grupos.values()]
    .map(({ muestra, anticipos }) => beneficiarioDelReporte(muestra, anticipos))
    .sort((a, b) => a.beneficiario.localeCompare(b.beneficiario, 'es'));
}

function tramosDelReporte(beneficiarios: BeneficiarioPorLiquidarDto[]): TramoDelReporteDto[] {
  const anticipos = beneficiarios.flatMap((b) => b.anticipos);
  return TRAMOS_DE_ANTIGUEDAD.map(({ clave, titulo }) => {
    const delTramo = anticipos.filter((a) => a.tramo === clave);
    return { tramo: clave, titulo, cantidad: delTramo.length, porJustificar: sumar(delTramo, (a) => a.porJustificar) };
  });
}

type TotalDelReporte = ReporteDeAnticiposPorLiquidarDto['total'];

function totalDelReporte(beneficiarios: BeneficiarioPorLiquidarDto[]): TotalDelReporte {
  const todos = beneficiarios.flatMap((b) => b.anticipos);
  return {
    beneficiarios: beneficiarios.length,
    anticipos: todos.length,
    vencidos: todos.filter((a) => a.vencido).length,
    monto: sumar(todos, (a) => a.monto),
    porJustificar: sumar(todos, (a) => a.porJustificar),
    porJustificarVencido: sumar(
      todos.filter((a) => a.vencido),
      (a) => a.porJustificar,
    ),
  };
}

/**
 * CL-R1 (`reportes.ver`): los anticipos por liquidar al corte, por beneficiario, con lo que faltaba por justificar, la
 * antigüedad y los vencidos. Usa la misma lectura que la lista de anticipos con corte.
 */
export class ReporteDeAnticiposPorLiquidar {
  constructor(private readonly dependencias: DependenciasDeAnticiposPorLiquidar) {}

  ejecutar(operador: Operador, solicitud: SolicitudDeAnticiposPorLiquidar): Promise<ReporteDeAnticiposPorLiquidarDto> {
    const { unidadDeTrabajo, consultas, reloj } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const hoy = await reloj.hoy(operador);
      const corte = solicitud.corte ?? hoy;
      const pagina = await consultas.listar({
        estado: 'todos',
        corte,
        beneficiarioId: solicitud.beneficiarioId,
        vencidos: solicitud.soloVencidos ?? false,
        hoy,
        pagina: 1,
        limite: TOPE_DE_ANTICIPOS,
      });
      const beneficiarios = agruparPorBeneficiario(pagina.filas, corte);
      return {
        corte,
        beneficiarios,
        porTramo: tramosDelReporte(beneficiarios),
        total: totalDelReporte(beneficiarios),
        leyendas: LEYENDAS_DE_ANTICIPOS_POR_LIQUIDAR,
      };
    });
  }
}
