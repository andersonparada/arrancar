import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { fechaDeCorte } from '../dominio/apertura.js';
import { totalesDeLaEmpresa } from '../dominio/cuadre-de-apertura.js';
import { esSaldoPrincipal } from '../dominio/partes-de-apertura.js';
import { CargaInicialCerrada, SinFechaDeInicio } from '../dominio/errores-de-apertura.js';
import type { HallazgoDeCierre } from '../dominio/hallazgos-de-cierre.js';
import {
  avisosDeLaCuenta,
  hallazgosDeLosResumenes,
  partidaDeApertura,
  resumenDeLaCuenta,
  type ContextoDeLaFicha,
} from './armado-de-saldos-iniciales.js';
import type {
  AvisoDeApertura,
  PartidaDeAperturaDto,
  SaldoInicialDto,
  SaldoInicialResumenDto,
  SaldosInicialesDto,
} from './dto/saldo-inicial.dto.js';
import type { CargaInicial } from './puertos/carga-inicial.js';
import type { ConsultasDeSaldosIniciales, PartidaDeLaBase } from './puertos/consultas-de-saldos-iniciales.js';
import type { PoliticaDeSobregiro } from './puertos/politica-de-sobregiro.js';
import type { PoliticaDeVencimientoDeCheques } from './puertos/politica-de-vencimiento-de-cheques.js';

/** Una partida con la cuenta a la que pertenece. */
export type PartidaConSuCuenta = PartidaDeAperturaDto & { cuentaBancariaId: string; cuentaNombre: string };

/** Lo que usa la ficha para leer. */
export interface DependenciasDeLaFicha {
  consultas: ConsultasDeSaldosIniciales;
  cargaInicial: CargaInicial;
  politicaDeSobregiro: PoliticaDeSobregiro;
  politicaDeVencimiento: PoliticaDeVencimientoDeCheques;
}

/**
 * Pide la carga inicial de la empresa (con bloqueo compartido) y exige que se pueda cargar: con fecha de inicio y abierta.
 * @returns la fecha de corte, `AAAA-MM-DD`.
 * @throws SinFechaDeInicio, CargaInicialCerrada
 */
export async function exigirCargaAbierta(cargaInicial: CargaInicial, operador: Operador): Promise<string> {
  const { fechaDeInicio, cerrada } = await cargaInicial.obtener(operador);
  if (fechaDeInicio === null) throw new SinFechaDeInicio();
  if (cerrada) throw new CargaInicialCerrada();
  return fechaDeCorte(fechaDeInicio);
}

const porCuenta = (partidas: PartidaDeLaBase[], cuentaBancariaId: string) =>
  partidas.filter((partida) => partida.cuentaBancariaId === cuentaBancariaId);

/**
 * Arma lo que ven las pantallas de saldos iniciales: el cuadre de cada cuenta, los totales de la empresa (Bancos y
 * Sobregiros, sin compensar), los hallazgos de cierre y la ficha de una cuenta. Corre dentro de la unidad de trabajo
 * de quien la llama.
 */
export class FichaDeSaldoInicial {
  constructor(private readonly dependencias: DependenciasDeLaFicha) {}

  async contexto(operador: Operador): Promise<ContextoDeLaFicha & { fechaDeInicio: string | null }> {
    const { cargaInicial, politicaDeSobregiro, politicaDeVencimiento } = this.dependencias;
    const { fechaDeInicio, cerrada } = await cargaInicial.obtener(operador);
    return {
      fechaDeInicio,
      corte: fechaDeInicio === null ? null : fechaDeCorte(fechaDeInicio),
      cerrada,
      mesesDeVencimiento: await politicaDeVencimiento.mesesDeVencimiento(operador),
      permiteSobregiro: await politicaDeSobregiro.permiteSobregiro(operador),
    };
  }

  async listado(operador: Operador): Promise<SaldosInicialesDto> {
    const { consultas } = this.dependencias;
    const { fechaDeInicio, ...contexto } = await this.contexto(operador);
    const partidas = await consultas.partidas();
    const cuentas = (await consultas.cuentas()).map((cuenta) =>
      resumenDeLaCuenta(cuenta, porCuenta(partidas, cuenta.cuentaBancariaId), contexto),
    );
    return {
      fechaDeInicio,
      fechaDeCorte: contexto.corte,
      cargaCerrada: contexto.cerrada,
      cuentas,
      ...totalesDeLaEmpresa(cuentas.map((cuenta) => cuenta.saldoEnLibrosAlCorte)),
      hallazgos: hallazgosDeLosResumenes(cuentas, contexto.permiteSobregiro),
    };
  }

  /** @throws RecursoNoEncontrado si la cuenta no existe o es de otra empresa. */
  async deLaCuenta(operador: Operador, cuentaBancariaId: string): Promise<SaldoInicialDto> {
    const { consultas } = this.dependencias;
    const { fechaDeInicio: _fechaDeInicio, ...contexto } = await this.contexto(operador);
    const cuenta = (await consultas.cuentas()).find((candidata) => candidata.cuentaBancariaId === cuentaBancariaId);
    if (!cuenta) throw new RecursoNoEncontrado('La cuenta bancaria');
    const partidas = await consultas.partidas(cuentaBancariaId);
    return {
      ...resumenDeLaCuenta(cuenta, partidas, contexto),
      observaciones: cuenta.observaciones,
      evidencia: cuenta.tieneEvidencia ? await consultas.evidenciaDe(cuentaBancariaId) : null,
      partidas: partidas.map((partida) => partidaDeApertura(partida, contexto)),
    };
  }

  /** Las partidas agregadas a mano de todas las cuentas, con el nombre de su cuenta (para exportarlas). */
  async partidasDeLaEmpresa(operador: Operador): Promise<PartidaConSuCuenta[]> {
    const { consultas } = this.dependencias;
    const { fechaDeInicio: _fechaDeInicio, ...contexto } = await this.contexto(operador);
    const nombres = new Map(
      (await consultas.cuentas()).map((cuenta) => [cuenta.cuentaBancariaId, cuenta.cuentaNombre]),
    );
    return (await consultas.partidas())
      .filter((partida) => !esSaldoPrincipal(partida.parte))
      .map((partida) => ({
        ...partidaDeApertura(partida, contexto),
        cuentaBancariaId: partida.cuentaBancariaId,
        cuentaNombre: nombres.get(partida.cuentaBancariaId) ?? '',
      }));
  }

  /** Los avisos de la cuenta al guardar: saldo negativo sin permiso de sobregiro y diferencia con los libros. */
  async avisosDeLaCuenta(operador: Operador, resumen: SaldoInicialResumenDto): Promise<AvisoDeApertura[]> {
    const permiteSobregiro = await this.dependencias.politicaDeSobregiro.permiteSobregiro(operador);
    return avisosDeLaCuenta(resumen, permiteSobregiro);
  }

  async revision(operador: Operador): Promise<HallazgoDeCierre[]> {
    return (await this.listado(operador)).hallazgos;
  }
}
