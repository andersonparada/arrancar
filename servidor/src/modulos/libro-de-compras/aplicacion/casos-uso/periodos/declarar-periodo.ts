import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { PeriodoDeclaradoEnElLibro } from '../../../dominio/eventos.js';
import { PeriodoYaDeclarado } from '../../../dominio/periodos/errores-de-periodos.js';
import { diferenciaDeFotos, type FotoDelPeriodo } from '../../../dominio/periodos/foto-del-periodo.js';
import {
  eventoDeLaDeclaracion,
  exigirFechaDePresentacion,
  exigirPeriodoTerminado,
  formularioDelRegimen,
  numeroDeFormularioValido,
  type FormularioDeDeclaracion,
} from '../../../dominio/periodos/reglas-de-declaracion.js';
import { dtoDeDeclaracion, dtoDePeriodo, type ResultadoDeCambioDePeriodoDto } from '../../dto/periodo.dto.js';
import type { DeclaracionGuardada } from '../../puertos/puertos-de-periodos.js';
import type { RepositorioDeDatosFiscalesDeEmpresa } from '../../puertos/repositorios-de-datos-fiscales.js';
import { armarLibro, periodoDelLibro } from '../libro/consultar-libro.js';
import { fotoDelLibro, type DependenciasDePeriodos } from './dependencias-de-periodos.js';
import { revisionDelPeriodo } from './revision-del-periodo.js';

interface Dependencias extends DependenciasDePeriodos {
  datosFiscalesDeEmpresa: RepositorioDeDatosFiscalesDeEmpresa;
}

export interface PeticionDeDeclaracion {
  periodo: string;
  /** Sin él: el que corresponde al régimen del período (SAT-2237, SAT-2046 o sin formulario). */
  formulario?: FormularioDeDeclaracion | undefined;
  numeroDeFormulario?: string | undefined;
  /** Sin ella: hoy. */
  fechaDePresentacion?: string | undefined;
}

/**
 * Declara un período terminado: guarda en el historial (solo agregar) el número del formulario, la fecha y la foto de
 * los totales del libro, y lo marca declarado. Funciona siempre; el bloqueo de registros es aparte. Una declaración
 * posterior es una rectificación y trae la diferencia contra la anterior. Toma la fila del período con `for update`:
 * un registro en curso termina antes o espera.
 */
export class DeclararPeriodo {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws PeriodoSinTerminar, PeriodoYaDeclarado (con el bloqueo encendido: se reabre primero),
   *   FechaDePresentacionInvalida o NumeroDeFormularioInvalido.
   */
  async ejecutar(operador: Operador, peticion: PeticionDeDeclaracion): Promise<ResultadoDeCambioDePeriodoDto> {
    const periodo = periodoDelLibro(peticion.periodo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const resultado = await unidadDeTrabajo.ejecutar(operador, () => this.declarar(operador, peticion, periodo));
    const rectificacion = resultado.declaracion.evento === 'rectificacion';
    await publicadorEventos.publicar([
      new PeriodoDeclaradoEnElLibro({ empresaId: operador.empresaId, periodo, rectificacion }),
    ]);
    return resultado;
  }

  private async declarar(
    operador: Operador,
    peticion: PeticionDeDeclaracion,
    periodo: string,
  ): Promise<ResultadoDeCambioDePeriodoDto> {
    const { periodos, ajuste, reloj, consultasDelPeriodo } = this.dependencias;
    const hoy = await reloj.hoy(operador);
    exigirPeriodoTerminado(periodo, hoy);
    const fila = await periodos.bloquear(operador.empresaId, periodo);
    if (fila.estado === 'declarado' && (await ajuste.encendido())) throw new PeriodoYaDeclarado(periodo);
    const datos = await this.datosDeLaDeclaracion(operador, { ...peticion, periodo }, hoy);
    const guardada = await this.guardar(operador, periodo, datos);
    await periodos.marcarDeclarado(operador.empresaId, periodo, operador.usuarioId);
    const declarado = await periodos.buscar(periodo);
    const avisos = (await revisionDelPeriodo(consultasDelPeriodo, periodo)).map((aviso) => aviso.mensaje);
    return {
      periodo: dtoDePeriodo(periodo, { fila: declarado, ultima: guardada, hoy }),
      declaracion: dtoDeDeclaracion(guardada, true),
      avisos,
    };
  }

  /** El formulario, el número y la fecha ya validados. */
  private async datosDeLaDeclaracion(operador: Operador, peticion: PeticionDeDeclaracion, hoy: string) {
    const vigentes = await this.dependencias.datosFiscalesDeEmpresa.vigenteEn(operador.empresaId, peticion.periodo);
    const regimen = vigentes?.instantanea().regimenIva;
    const formulario = peticion.formulario ?? (regimen ? formularioDelRegimen(regimen) : 'SAT-2237');
    const fecha = peticion.fechaDePresentacion ?? hoy;
    exigirFechaDePresentacion(peticion.periodo, fecha);
    return {
      formulario,
      numeroDeFormulario: numeroDeFormularioValido(peticion.numeroDeFormulario, formulario),
      fechaDePresentacion: fecha,
    };
  }

  /** Arma la foto con el código del libro, la compara con la declaración anterior y agrega la fila del historial. */
  private async guardar(
    operador: Operador,
    periodo: string,
    datos: Awaited<ReturnType<DeclararPeriodo['datosDeLaDeclaracion']>>,
  ): Promise<DeclaracionGuardada> {
    const { periodos } = this.dependencias;
    const foto = fotoDelLibro(await armarLibro(this.dependencias, operador, periodo));
    const previas = (await periodos.historial(periodo)).filter((declaracion) => declaracion.evento !== 'reapertura');
    const evento = eventoDeLaDeclaracion(previas.length);
    const diferencia = evento === 'rectificacion' ? await this.diferencia(previas.at(-1)!, foto) : null;
    return periodos.agregarDeclaracion(operador.empresaId, {
      ...datos,
      periodo,
      evento,
      tipoDeLibro: foto.tipoDeLibro,
      foto,
      diferencia,
      motivo: null,
    });
  }

  private async diferencia(anterior: DeclaracionGuardada, foto: FotoDelPeriodo) {
    const documentos = await this.dependencias.consultasDelPeriodo.documentosCambiadosDesde(
      anterior.periodo,
      anterior.creadoEn,
    );
    return { contraLaSecuencia: anterior.secuencia, ...diferenciaDeFotos(anterior.foto!, foto), documentos };
  }
}
