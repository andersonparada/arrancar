import { and, asc, eq, lt, gte, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { SaldoInicialDto } from '../../aplicacion/dto/saldo-inicial.dto.js';
import type {
  ConflictosConLaFechaDeInicio,
  ConsultasSaldosIniciales,
} from '../../aplicacion/puertos/consultas-saldos-iniciales.js';
import { activos } from './activos.tablas.js';
import { cierres } from './cierres.tablas.js';
import { clases } from './clases.tablas.js';
import { nombresDeUbicaciones } from './nombres-de-ubicaciones.js';
import { saldosIniciales } from './saldos-iniciales.tablas.js';
import { UbicacionesEnEmpresas } from './ubicaciones-en-empresas.drizzle.js';

const padre = alias(activos, 'padre');

const columnas = {
  activoId: activos.id,
  codigo: activos.codigo,
  descripcion: activos.descripcion,
  claseId: activos.claseId,
  claseNombre: clases.nombre,
  incisoFiscal: clases.incisoFiscal,
  activoPadreId: activos.activoPadreId,
  activoPadreCodigo: padre.codigo,
  estado: activos.estado,
  fechaDeCorte: saldosIniciales.fechaDeCorte,
  fechaDeAdquisicion: activos.fechaDeAdquisicion,
  fechaDeInicioDeUso: activos.fechaDeInicioDeUso,
  cantidad: activos.cantidad,
  costo: saldosIniciales.costo,
  depreciacionAcumuladaContable: saldosIniciales.depreciacionAcumuladaContable,
  costoFiscal: saldosIniciales.costoFiscal,
  baseFiscal: saldosIniciales.baseFiscal,
  depreciacionAcumuladaFiscal: saldosIniciales.depreciacionAcumuladaFiscal,
  porcentajeFiscal: activos.porcentajeFiscal,
  vidaUtilRestanteMeses: saldosIniciales.vidaUtilRestanteMeses,
  valorResidual: activos.valorResidual,
  valorComoGanadoComun: activos.valorComoGanadoComun,
  valorDeMatricula: activos.valorDeMatricula,
  valorCatastral: activos.valorCatastral,
  valoresDelInmuebleCompleto: activos.valoresDelInmuebleCompleto,
  marca: activos.marca,
  modelo: activos.modelo,
  numeroDeSerie: activos.numeroDeSerie,
  placa: activos.placa,
  enBodega: activos.enBodega,
  localidadId: activos.localidadId,
  departamentoId: activos.departamentoId,
  responsable: activos.responsable,
  observaciones: activos.observaciones,
};
type Fila = Awaited<ReturnType<ConsultasSaldosInicialesDrizzle['filas']>>[number];

const cuenta = async (donde: SQL | undefined): Promise<number> => {
  const [fila] = await transaccionEnCurso()
    .select({ cantidad: sql<number>`count(*)::int` })
    .from(activos)
    .where(donde);
  return fila?.cantidad ?? 0;
};

/** Lecturas de los saldos iniciales; los nombres de la ubicación salen de las funciones de Empresas (AF-P22 b). */
export class ConsultasSaldosInicialesDrizzle implements ConsultasSaldosIniciales {
  private readonly ubicaciones = new UbicacionesEnEmpresas();

  async listar(): Promise<SaldoInicialDto[]> {
    return this.conNombres(await this.filas(undefined));
  }

  async obtener(activoId: string): Promise<SaldoInicialDto> {
    const [saldo] = await this.conNombres(await this.filas(eq(activos.id, activoId)));
    if (!saldo) throw new RecursoNoEncontrado('El saldo inicial');
    return saldo;
  }

  async conflictosConLaFechaDeInicio(fechaDeInicio: string): Promise<ConflictosConLaFechaDeInicio> {
    const [cierre] = await transaccionEnCurso()
      .select({ periodo: cierres.periodo })
      .from(cierres)
      .where(eq(cierres.estado, 'cerrado'))
      .limit(1);
    return {
      saldosConFechaPosterior: await cuenta(
        and(
          eq(activos.origen, 'saldo_inicial'),
          or(gte(activos.fechaDeAdquisicion, fechaDeInicio), gte(activos.fechaDeInicioDeUso, fechaDeInicio)),
        ),
      ),
      otrosConAdquisicionAnterior: await cuenta(
        and(sql`${activos.origen} is distinct from 'saldo_inicial'`, lt(activos.fechaDeAdquisicion, fechaDeInicio)),
      ),
      hayCierres: cierre !== undefined,
    };
  }

  async filas(donde: SQL | undefined) {
    return transaccionEnCurso()
      .select(columnas)
      .from(activos)
      .innerJoin(saldosIniciales, eq(saldosIniciales.activoId, activos.id))
      .innerJoin(clases, eq(clases.id, activos.claseId))
      .leftJoin(padre, eq(padre.id, activos.activoPadreId))
      .where(donde)
      .orderBy(asc(activos.codigo));
  }

  private async conNombres(filas: Fila[]): Promise<SaldoInicialDto[]> {
    const nombres = await nombresDeUbicaciones(this.ubicaciones, filas);
    return filas.map(({ estado, ...fila }) => ({
      ...fila,
      enConstruccion: estado === 'en_construccion',
      valorEnLibros: deCentavos(aCentavos(fila.costo) - aCentavos(fila.depreciacionAcumuladaContable)),
      localidadNombre: nombres.localidad(fila.localidadId),
      departamentoNombre: nombres.departamento(fila.departamentoId),
    }));
  }
}
