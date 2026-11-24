import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import { deCentavos } from '../../core/compartido/dominio/centavos.js';
import type { SaldoInicialDto } from '../aplicacion/dto/saldo-inicial.dto.js';
import type {
  ConflictosConLaFechaDeInicio,
  ConsultasSaldosIniciales,
} from '../aplicacion/puertos/consultas-saldos-iniciales.js';
import type {
  FiscalDelSaldo,
  RegistroDeSaldoInicial,
  RepositorioSaldosIniciales,
} from '../aplicacion/puertos/repositorio-saldos-iniciales.js';
import type { ActivosEnMemoria } from './dobles-de-activos.js';

/** Los montos del saldo con dos decimales, como los ve la pantalla. */
function montosDe({ datos }: RegistroDeSaldoInicial) {
  return {
    costo: deCentavos(datos.costoCentavos),
    depreciacionAcumuladaContable: deCentavos(datos.acumuladaContableCentavos),
    valorEnLibros: deCentavos(datos.costoCentavos - datos.acumuladaContableCentavos),
    costoFiscal: deCentavos(datos.costoFiscalCentavos),
    baseFiscal: deCentavos(datos.baseFiscalCentavos),
    depreciacionAcumuladaFiscal: deCentavos(datos.acumuladaFiscalCentavos),
    vidaUtilRestanteMeses: datos.vidaUtilRestanteMeses,
  };
}

/** El saldo inicial de un activo tal como lo ve la pantalla, armado de lo guardado (sin nombres de ubicación). */
function aDto(registro: RegistroDeSaldoInicial, activos: ActivosEnMemoria): SaldoInicialDto {
  const activo = activos.registros.get(registro.activoId)!.instantanea();
  return {
    ...activo,
    ...montosDe(registro),
    activoId: registro.activoId,
    claseNombre: 'Clase de prueba',
    incisoFiscal: 'maquinaria_y_vehiculos',
    activoPadreCodigo: null,
    enConstruccion: activo.estado === 'en_construccion',
    fechaDeCorte: registro.fechaDeCorte,
    localidadNombre: null,
    departamentoNombre: null,
  };
}

/** Los saldos iniciales en memoria: responden de repositorio y de consultas. */
export class SaldosEnMemoria implements RepositorioSaldosIniciales, ConsultasSaldosIniciales {
  readonly registros = new Map<string, RegistroDeSaldoInicial>();
  /** Las fechas de inicio con que se pidió mover el día de corte. */
  readonly reubicadas: string[] = [];
  /** Lo que la prueba dice que la fecha nueva dejaría fuera de lugar. */
  conflictos: ConflictosConLaFechaDeInicio = {
    saldosConFechaPosterior: 0,
    otrosConAdquisicionAnterior: 0,
    saldosConDivisiones: 0,
    hayCierres: false,
  };

  constructor(private readonly activos: ActivosEnMemoria) {}

  async agregar(registro: RegistroDeSaldoInicial): Promise<void> {
    this.registros.set(registro.activoId, registro);
  }

  async fiscalDeActivo(activoId: string): Promise<FiscalDelSaldo | null> {
    return this.registros.get(activoId)?.datos ?? null;
  }

  async reemplazar(registro: RegistroDeSaldoInicial): Promise<void> {
    this.registros.set(registro.activoId, registro);
  }

  async reubicar(fechaDeInicio: string): Promise<void> {
    this.reubicadas.push(fechaDeInicio);
  }

  async listar(): Promise<SaldoInicialDto[]> {
    return [...this.registros.values()].map((registro) => aDto(registro, this.activos));
  }

  async obtener(activoId: string): Promise<SaldoInicialDto> {
    const registro = this.registros.get(activoId);
    if (!registro || !this.activos.registros.has(activoId)) throw new RecursoNoEncontrado('El saldo inicial');
    return aDto(registro, this.activos);
  }

  async conflictosConLaFechaDeInicio(): Promise<ConflictosConLaFechaDeInicio> {
    return this.conflictos;
  }
}
