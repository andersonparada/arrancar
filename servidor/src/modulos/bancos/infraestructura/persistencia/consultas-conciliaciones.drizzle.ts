import { desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { alias, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import { usuarios } from '../../../core/identidad/infraestructura/persistencia/usuarios.tablas.js';
import { calcularConciliacion } from '../../aplicacion/calculo-de-conciliacion.js';
import type {
  MovimientoConMarcaDto,
  ConciliacionDto,
  ConciliacionResumenDto,
  EstadoDeConciliacionDto,
} from '../../aplicacion/dto/conciliacion.dto.js';
import type { ConsultasConciliaciones } from '../../aplicacion/puertos/consultas-conciliaciones.js';
import { finDelMesDe } from '../../dominio/conciliacion.js';
import { diferenciaConElEstadoDeCuenta } from '../../dominio/estado-de-cuenta.js';
import { bancos } from './bancos.tablas.js';
import {
  aMovimientoParaConciliar,
  candidatosConMarcaDe,
  idsDeCandidatosDe,
  movimientosDelMesDe,
  paresCompensadosPendientesDe,
  tieneAlgunaConciliacionDe,
} from './conciliacion-candidatos.drizzle.js';
import {
  conSaldoDelBancoDe,
  fechaDelPrimerMovimientoDe,
  puntoDePartidaDe,
} from './conciliacion-punto-de-partida.drizzle.js';
import { conciliaciones } from './conciliaciones.tablas.js';
import { estadoDeCuentaDeLaConciliacion } from './estado-de-cuenta.consulta.drizzle.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';

const elaboro = alias(usuarios, 'usuario_elaboro');
const autorizo = alias(usuarios, 'usuario_autorizo');
const nombreDe = (nombres: AnyPgColumn, apellidos: AnyPgColumn) =>
  sql<string | null>`trim(${nombres} || ' ' || ${apellidos})`;

type FilaEncabezado = Awaited<ReturnType<typeof filaDeLaConciliacion>>;

function aResumen(fila: {
  id: string;
  anio: number;
  mes: number;
  estado: string;
  elaboradaEn: Date | null;
  autorizadaEn: Date | null;
  tieneEstadoDeCuenta: boolean;
}): ConciliacionResumenDto {
  return {
    id: fila.id,
    anio: fila.anio,
    mes: fila.mes,
    estado: fila.estado as EstadoDeConciliacionDto,
    elaboradaEn: fila.elaboradaEn ? fila.elaboradaEn.toISOString() : null,
    autorizadaEn: fila.autorizadaEn ? fila.autorizadaEn.toISOString() : null,
    tieneEstadoDeCuenta: fila.tieneEstadoDeCuenta,
  };
}

function aEncabezado(fila: FilaEncabezado) {
  return {
    id: fila.id,
    cuentaBancariaId: fila.cuentaBancariaId,
    cuentaBancariaNombre: fila.cuentaBancariaNombre,
    bancoNombre: fila.bancoNombre,
    numeroDeCuenta: fila.numeroDeCuenta,
    empresaNombre: fila.empresaNombre,
    anio: fila.anio,
    mes: fila.mes,
    estado: fila.estado as EstadoDeConciliacionDto,
    elaboradaPorNombre: fila.elaboradaPorNombre,
    elaboradaEn: fila.elaboradaEn ? fila.elaboradaEn.toISOString() : null,
    autorizadaPorNombre: fila.autorizadaPorNombre,
    autorizadaEn: fila.autorizadaEn ? fila.autorizadaEn.toISOString() : null,
    saldoEstadoDeCuenta: fila.saldoEstadoDeCuenta,
    previaAlSaldoTranscrito: fila.previaAlSaldoTranscrito,
  };
}

/** El saldo del estado de cuenta ya autorizado no se recalcula: queda fijo en la foto. */
function saldoDelEstadoDeCuentaDe(fila: FilaEncabezado, calculado: string): string {
  return fila.estado === 'autorizada' && fila.fotoSaldoCalculadoEstadoDeCuenta
    ? fila.fotoSaldoCalculadoEstadoDeCuenta
    : calculado;
}

/** El saldo que debe mostrar el estado de cuenta y su diferencia con el transcrito. */
function saldosDelDocumento(fila: FilaEncabezado, calculado: string) {
  const saldoQueDebeMostrarElEstadoDeCuenta = saldoDelEstadoDeCuentaDe(fila, calculado);
  return {
    saldoQueDebeMostrarElEstadoDeCuenta,
    diferenciaConElEstadoDeCuenta: diferenciaConElEstadoDeCuenta(
      fila.saldoEstadoDeCuenta,
      saldoQueDebeMostrarElEstadoDeCuenta,
    ),
  };
}

async function filaDeLaConciliacion(conciliacionId: string) {
  const [fila] = await transaccionEnCurso()
    .select({
      ...getTableColumns(conciliaciones),
      cuentaBancariaNombre: cuentasBancarias.nombre,
      numeroDeCuenta: cuentasBancarias.numero,
      bancoNombre: bancos.nombre,
      empresaNombre: empresas.nombre,
      elaboradaPorNombre: nombreDe(elaboro.nombres, elaboro.apellidos),
      autorizadaPorNombre: nombreDe(autorizo.nombres, autorizo.apellidos),
    })
    .from(conciliaciones)
    .leftJoin(cuentasBancarias, eq(conciliaciones.cuentaBancariaId, cuentasBancarias.id))
    .leftJoin(bancos, eq(cuentasBancarias.bancoId, bancos.id))
    .leftJoin(empresas, eq(conciliaciones.empresaId, empresas.id))
    .leftJoin(elaboro, eq(elaboro.id, conciliaciones.elaboradaPor))
    .leftJoin(autorizo, eq(autorizo.id, conciliaciones.autorizadaPor))
    .where(eq(conciliaciones.id, conciliacionId));
  if (!fila) throw new RecursoNoEncontrado('La conciliación');
  return fila;
}

/** Arma el cálculo del documento: candidatos (los posfechados aparte), punto de partida y partidas. */
async function documentoDe(fila: FilaEncabezado) {
  const periodo = { anio: fila.anio, mes: fila.mes };
  const finDelMes = finDelMesDe(periodo);
  const todos = await candidatosConMarcaDe(fila.cuentaBancariaId, finDelMes, fila.id);
  const partida = await puntoDePartidaDe(fila.cuentaBancariaId, periodo);
  const resultado = calcularConciliacion({
    saldoInicialLibrosEnCentavos: partida.librosEnCentavos,
    saldoInicialBancoEnCentavos: partida.bancoEnCentavos,
    movimientosDelMes: await movimientosDelMesDe(fila.cuentaBancariaId, periodo, partida.despuesDe),
    candidatos: todos.map(aMovimientoParaConciliar),
    finDelMes,
  });
  const esPosfechado = (m: MovimientoConMarcaDto) => m.tipo === 'cheque' && m.fecha > finDelMes;
  return {
    resultado,
    saldoInicialDelBancoDeLaApertura: partida.saldoInicialDelBancoDeLaApertura,
    candidatos: {
      candidatos: todos.filter((m) => !esPosfechado(m)),
      posfechadosCandidatos: todos.filter(esPosfechado),
    },
  };
}

/** Lecturas de las conciliaciones: arma el documento completo con el cálculo puro de `calculo-de-conciliacion.js`. */
export class ConsultasConciliacionesDrizzle implements ConsultasConciliaciones {
  async listar(cuentaBancariaId: string): Promise<ConciliacionResumenDto[]> {
    const filas = await transaccionEnCurso()
      .select({
        id: conciliaciones.id,
        anio: conciliaciones.anio,
        mes: conciliaciones.mes,
        estado: conciliaciones.estado,
        elaboradaEn: conciliaciones.elaboradaEn,
        autorizadaEn: conciliaciones.autorizadaEn,
        tieneEstadoDeCuenta: sql<boolean>`${conciliaciones.estadoDeCuentaArchivoId} is not null`,
      })
      .from(conciliaciones)
      .where(eq(conciliaciones.cuentaBancariaId, cuentaBancariaId))
      .orderBy(desc(conciliaciones.anio), desc(conciliaciones.mes));
    return filas.map(aResumen);
  }

  async obtener(conciliacionId: string): Promise<ConciliacionDto> {
    const fila = await filaDeLaConciliacion(conciliacionId);
    const documento = await documentoDe(fila);
    return {
      ...aEncabezado(fila),
      estadoDeCuenta: await estadoDeCuentaDeLaConciliacion(conciliacionId),
      ...documento.candidatos,
      saldoInicialDelBancoDeLaApertura: documento.saldoInicialDelBancoDeLaApertura,
      cuadratica: { libros: documento.resultado.libros, banco: documento.resultado.banco },
      partidas: documento.resultado.partidas,
      ...saldosDelDocumento(fila, documento.resultado.saldoQueDebeMostrarElEstadoDeCuenta),
    };
  }

  estadoDeCuentaDe(conciliacionId: string) {
    return estadoDeCuentaDeLaConciliacion(conciliacionId);
  }

  idsDeCandidatos(cuentaBancariaId: string, finDelMes: string, conciliacionId: string): Promise<string[]> {
    return idsDeCandidatosDe(cuentaBancariaId, finDelMes, conciliacionId);
  }

  tieneAlguna(cuentaBancariaId: string): Promise<boolean> {
    return tieneAlgunaConciliacionDe(cuentaBancariaId);
  }

  paresCompensadosPendientes(cuentaBancariaId: string, finDelMes: string, conciliacionId: string): Promise<string[]> {
    return paresCompensadosPendientesDe(cuentaBancariaId, finDelMes, conciliacionId);
  }

  conSaldoDelBanco(cuentaBancariaId: string): Promise<boolean> {
    return conSaldoDelBancoDe(cuentaBancariaId);
  }

  fechaDelPrimerMovimiento(cuentaBancariaId: string): Promise<string | null> {
    return fechaDelPrimerMovimientoDe(cuentaBancariaId);
  }
}
