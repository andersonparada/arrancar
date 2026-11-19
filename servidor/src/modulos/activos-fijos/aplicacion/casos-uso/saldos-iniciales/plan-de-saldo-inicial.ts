import { aCentavos, deCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { DatosDeUso } from '../../../dominio/activo.js';
import type { PropiedadesDeClase } from '../../../dominio/clase.js';
import { baseFiscal } from '../../../dominio/depreciacion/base-fiscal.js';
import { proponerParametrosDeUso } from '../../../dominio/depreciacion/parametros-de-uso.js';
import type { TramoCalculado } from '../../../dominio/depreciacion/tramo.js';
import { esTerreno } from '../../../dominio/incisos-fiscales.js';
import type { DatosDeActivo } from '../../../dominio/reglas-de-activo.js';
import type { EntradaDeActivoDeSaldoInicial } from '../../../dominio/saldos-iniciales/activo-de-saldo-inicial.js';
import {
  exigirDelSaldo,
  validarSaldoInicial,
  fechaDeCorteDe,
  type DatosDeSaldoInicial,
} from '../../../dominio/saldos-iniciales/saldo-inicial.js';
import { tramosDeSaldoInicial } from '../../../dominio/saldos-iniciales/tramos-de-saldo-inicial.js';
import type { SolicitudDeSaldoInicial } from '../../dto/saldo-inicial.dto.js';

export interface EntradaDelPlanDeSaldo {
  solicitud: SolicitudDeSaldoInicial;
  clase: Readonly<PropiedadesDeClase>;
  /** El máximo de ley del inciso de la clase, en %. */
  porcentajeMaximo: number;
  fechaDeInicio: string;
  /** El código ya resuelto (escrito o propuesto). */
  codigo: string;
}

/** Lo que se guarda de un saldo inicial: el activo, sus montos, los tramos y el día de corte. */
export interface PlanDeSaldoInicial {
  activo: EntradaDeActivoDeSaldoInicial;
  datos: DatosDeSaldoInicial;
  tramos: TramoCalculado[];
  fechaDeCorte: string;
}

/** Las fechas reales del bien son anteriores a la fecha de inicio; lo posterior va como compra en el libro. */
function validarFechas(solicitud: SolicitudDeSaldoInicial, fechaDeInicio: string): void {
  const { fechaDeAdquisicion, fechaDeInicioDeUso, enConstruccion } = solicitud;
  exigirDelSaldo(
    fechaDeAdquisicion < fechaDeInicio,
    `La fecha de adquisición debe ser anterior al inicio de la empresa (${fechaDeInicio}): lo posterior va por el Libro de compras.`,
  );
  if (enConstruccion) {
    exigirDelSaldo(fechaDeInicioDeUso === null, 'Una obra en construcción no tiene fecha de inicio de uso.');
    return;
  }
  exigirDelSaldo(fechaDeInicioDeUso !== null, 'Escriba la fecha de inicio de uso.');
  exigirDelSaldo(
    fechaDeInicioDeUso! < fechaDeInicio,
    `La fecha de inicio de uso debe ser anterior al inicio de la empresa (${fechaDeInicio}).`,
  );
}

const montoOpcional = (monto: string | null): number | null => (monto === null ? null : aCentavos(monto));

/** La base fiscal por omisión: el costo fiscal con el tope del inmueble o sin el ganado común, según la clase. */
function baseFiscalPropuesta(solicitud: SolicitudDeSaldoInicial, entrada: EntradaDelPlanDeSaldo): number {
  const costoFiscal = montoOpcional(solicitud.costoFiscal) ?? aCentavos(solicitud.costo);
  return baseFiscal({
    incisoFiscal: entrada.clase.incisoFiscal,
    costos: [{ montoCentavos: costoFiscal, aplicaAlLibroFiscal: true, noEsEdificacion: false }],
    inmueble: solicitud,
    valorComoGanadoComunCentavos: montoOpcional(solicitud.valorComoGanadoComun) ?? 0,
  });
}

/** Los montos escritos; lo que falta lo propone la clase. */
function montosDelSaldo(entrada: EntradaDelPlanDeSaldo): DatosDeSaldoInicial {
  const { solicitud, clase } = entrada;
  const costoCentavos = aCentavos(solicitud.costo);
  const propuestos = proponerParametrosDeUso({
    clase,
    costoCentavos,
    valorComoGanadoComunCentavos: montoOpcional(solicitud.valorComoGanadoComun),
  });
  return {
    costoCentavos,
    acumuladaContableCentavos: aCentavos(solicitud.depreciacionAcumuladaContable),
    costoFiscalCentavos: montoOpcional(solicitud.costoFiscal) ?? costoCentavos,
    baseFiscalCentavos: montoOpcional(solicitud.baseFiscal) ?? baseFiscalPropuesta(solicitud, entrada),
    acumuladaFiscalCentavos: aCentavos(solicitud.depreciacionAcumuladaFiscal),
    valorResidualCentavos: montoOpcional(solicitud.valorResidual) ?? propuestos.valorResidualCentavos,
    porcentajeFiscal: solicitud.porcentajeFiscal ?? propuestos.porcentajeFiscal,
    vidaUtilRestanteMeses: solicitud.vidaUtilRestanteMeses,
  };
}

/** Los parámetros con que el activo queda en uso; `null` si la obra no se terminó. */
function usoDelActivo(solicitud: SolicitudDeSaldoInicial, datos: DatosDeSaldoInicial): DatosDeUso | null {
  if (solicitud.enConstruccion) return null;
  const vida = datos.vidaUtilRestanteMeses;
  return {
    fechaDeInicioDeUso: solicitud.fechaDeInicioDeUso!,
    porcentajeFiscal: datos.porcentajeFiscal,
    vidaUtilContableMeses: vida !== null && vida >= 1 ? vida : null,
    valorResidual: deCentavos(datos.valorResidualCentavos),
  };
}

/** Lo descriptivo del activo: tal como lo escribió el usuario, del balance y con origen `saldo_inicial`. */
function datosDelActivo({ solicitud, codigo }: EntradaDelPlanDeSaldo): DatosDeActivo {
  return {
    codigo,
    descripcion: solicitud.descripcion,
    claseId: solicitud.claseId,
    activoPadreId: solicitud.activoPadreId,
    tipoDeRegistro: 'activo',
    origen: 'saldo_inicial',
    propietario: null,
    formaDeTenencia: null,
    fechaDeAdquisicion: solicitud.fechaDeAdquisicion,
    valorComoGanadoComun: solicitud.valorComoGanadoComun,
    valorDeMatricula: solicitud.valorDeMatricula,
    valorCatastral: solicitud.valorCatastral,
    valoresDelInmuebleCompleto: solicitud.valoresDelInmuebleCompleto,
    marca: solicitud.marca,
    modelo: solicitud.modelo,
    numeroDeSerie: solicitud.numeroDeSerie,
    placa: solicitud.placa,
    cantidad: solicitud.cantidad,
    observaciones: solicitud.observaciones,
  };
}

function activoDelPlan(entrada: EntradaDelPlanDeSaldo, datos: DatosDeSaldoInicial): EntradaDeActivoDeSaldoInicial {
  const { enBodega, localidadId, departamentoId, responsable } = entrada.solicitud;
  return {
    datos: datosDelActivo(entrada),
    ubicacion: { enBodega, localidadId, departamentoId, responsable },
    uso: usoDelActivo(entrada.solicitud, datos),
  };
}

/**
 * Calcula lo que se guarda al cargar el saldo inicial de un activo (§8): revisa las fechas, toma de la clase lo que no
 * se escribió, valida los montos y abre los dos tramos `saldo_inicial` (un terreno y una obra en construcción no tienen).
 * @throws SaldoInicialInvalido si las fechas o los montos no cumplen las reglas.
 */
export function planearSaldoInicial(entrada: EntradaDelPlanDeSaldo): PlanDeSaldoInicial {
  const { solicitud, clase, fechaDeInicio } = entrada;
  validarFechas(solicitud, fechaDeInicio);
  const datos = validarSaldoInicial(montosDelSaldo(entrada), {
    incisoFiscal: clase.incisoFiscal,
    enConstruccion: solicitud.enConstruccion,
    porcentajeMaximo: entrada.porcentajeMaximo,
  });
  const sinLibros = solicitud.enConstruccion || esTerreno(clase.incisoFiscal);
  return {
    activo: activoDelPlan(entrada, datos),
    datos,
    tramos: sinLibros ? [] : tramosDeSaldoInicial({ fechaDeInicio, datos }),
    fechaDeCorte: fechaDeCorteDe(fechaDeInicio),
  };
}
