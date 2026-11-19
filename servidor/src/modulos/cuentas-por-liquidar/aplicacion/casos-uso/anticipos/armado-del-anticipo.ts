import { deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { numeroDelAnticipo, porJustificar, type Anticipo } from '../../../dominio/anticipos.js';
import { avisoDeAnticipoVencido } from '../../../dominio/avisos-de-anticipos.js';
import { diasEntre } from '../../../dominio/fechas.js';
import type {
  AnticipoDto,
  AnticipoResumenDto,
  LiquidacionDelAnticipoDto,
  MovimientoDelAnticipoDto,
} from '../../dto/anticipos.dto.js';

/** Lo que hace falta para armar una fila de la lista o el encabezado de la ficha. */
export interface ResumenPorArmar {
  anticipo: Anticipo;
  movimiento: MovimientoDelAnticipoDto;
  /** Lo gastado, al corte si se pidió; si no, hoy. */
  gastadoCentavos: number;
  /** La fecha a la que se mira: la de corte o la de hoy. */
  al: string;
  /** El anticipo está abierto a la fecha `al` (con corte, la lista ya lo garantiza). */
  abierto: boolean;
}

type Encabezado = Omit<AnticipoResumenDto, 'documento' | 'cuentaBancariaId'>;

/** Lo que el anticipo guarda tal cual, sin cálculos. */
const datosGuardados = (anticipo: Anticipo) => ({
  id: anticipo.id,
  numero: numeroDelAnticipo(anticipo.numero, anticipo.anioDeNumero),
  beneficiarioId: anticipo.beneficiarioId,
  beneficiario: anticipo.beneficiario,
  esEmpleado: anticipo.esEmpleado,
  clase: anticipo.clase,
  forma: anticipo.forma,
  fecha: anticipo.fecha,
  fechaLimite: anticipo.fechaLimite,
  monto: deCentavos(anticipo.montoCentavos),
  estado: anticipo.estado,
});

/** Lo que falta por justificar y la antigüedad (días desde la entrega y desde la fecha límite). */
function encabezado({ anticipo, gastadoCentavos, al, abierto }: ResumenPorArmar): Encabezado {
  const pendiente = abierto ? porJustificar(anticipo, gastadoCentavos) : 0;
  const vencido = abierto && anticipo.fechaLimite < al;
  return {
    ...datosGuardados(anticipo),
    gastado: deCentavos(gastadoCentavos),
    porJustificar: deCentavos(pendiente),
    diasDesdeLaEntrega: Math.max(0, diasEntre(anticipo.fecha, al)),
    diasVencido: vencido ? diasEntre(anticipo.fechaLimite, al) : 0,
    vencido,
    aviso: vencido ? avisoDeAnticipoVencido(anticipo, pendiente) : null,
  };
}

/** Una fila de la lista. */
export const resumenDelAnticipo = (por: ResumenPorArmar): AnticipoResumenDto => ({
  ...encabezado(por),
  documento: por.movimiento.numero,
  cuentaBancariaId: por.movimiento.cuentaBancariaId,
});

const liquidacionDe = (anticipo: Anticipo): LiquidacionDelAnticipoDto | null =>
  anticipo.fechaDeLiquidacion
    ? {
        fecha: anticipo.fechaDeLiquidacion,
        devuelto: deCentavos(anticipo.devueltoCentavos),
        movimientoDeDevolucionId: anticipo.movimientoDeDevolucionId,
        reembolsado: deCentavos(anticipo.reembolsadoCentavos),
        movimientoDeReembolsoId: anticipo.movimientoDeReembolsoId,
        noLiquidado: deCentavos(anticipo.noLiquidadoCentavos),
        destinoDeNoLiquidado: anticipo.destinoDeNoLiquidado,
        cuotas: anticipo.cuotas,
        motivoDeNoLiquidado: anticipo.motivoDeNoLiquidado,
      }
    : null;

/** Todo lo que hace falta para armar el `AnticipoDto`. */
export interface AnticipoPorArmar {
  anticipo: Anticipo;
  movimiento: MovimientoDelAnticipoDto;
  gastos: { cantidad: number; totalCentavos: number };
  /** El cheque o la nota de la entrega ya está conciliado. */
  conciliado: boolean;
  hoy: string;
  avisos: readonly string[];
}

/** El anticipo como lo ve la pantalla, con lo que cada estado deja hacer con él. */
export function dtoDelAnticipo(por: AnticipoPorArmar): AnticipoDto {
  const { anticipo, movimiento, gastos, conciliado, hoy } = por;
  const abierto = anticipo.estado === 'abierto';
  const resumen = encabezado({ anticipo, movimiento, gastadoCentavos: gastos.totalCentavos, al: hoy, abierto });
  return {
    ...resumen,
    movimiento,
    descripcion: anticipo.descripcion,
    beneficiarioUsuarioId: anticipo.beneficiarioUsuarioId,
    localidadId: anticipo.localidadId,
    motivoConVencidos: anticipo.motivoConVencidos,
    liquidacion: liquidacionDe(anticipo),
    anulacion:
      anticipo.estado === 'anulado' ? { fecha: anticipo.fechaDeAnulacion!, motivo: anticipo.motivoDeAnulacion! } : null,
    puedeAnular: abierto && gastos.cantidad === 0 && !conciliado,
    puedeLiquidar: abierto,
    puedeReabrir: anticipo.estado === 'liquidado',
    avisos: [...por.avisos, ...(resumen.aviso ? [resumen.aviso] : [])],
  };
}
