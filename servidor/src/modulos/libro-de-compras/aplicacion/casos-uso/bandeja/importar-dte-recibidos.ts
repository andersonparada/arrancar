import { createHash } from 'node:crypto';
import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { normalizarNit } from '../../../../core/compartido/dominio/objetos-valor/nit.js';
import type { ArchivoDeFilas, LectorDeFilas } from '../../../../core/intercambio/aplicacion/puertos/lector-de-filas.js';
import { EmpresaSinNit } from '../../../dominio/errores-de-documento.js';
import type { LoteDeDte } from '../../../dominio/lote-de-dte.js';
import { interpretarEncabezadosAdicionales } from '../../dte/encabezados-adicionales.js';
import { leerDteDeLaSat, type ResultadoDeLaLectura } from '../../dte/lector-de-dte-sat.js';
import { construirMapa, type MapaDeEncabezados } from '../../dte/mapa-de-encabezados-sat.js';
import type { DatosDeLaEmpresaParaDocumentos } from '../../puertos/puertos-de-documentos.js';
import type {
  ConfiguracionDeLaImportacion,
  ConsultasParaImportar,
  LectorDeConfiguracionDeImportacion,
  RepositorioParaImportar,
} from '../../puertos/puertos-de-importacion.js';
import type { RepositorioDeLotesDeDte } from '../../puertos/repositorio-de-lotes-de-dte.js';
import { clasificarCarga, type ConocimientoPrevio, type PlanDeCarga } from './clasificador-de-carga.js';
import { resumenDelLote, type OrigenDelArchivo } from './resumen-del-lote.js';

const RECURSO = 'libro-de-compras.dte-recibidos';

export interface PeticionDeImportar {
  archivo: Buffer;
  nombreDelArchivo: string;
}

/** El lote que quedó guardado y los avisos para el usuario. */
export interface ResultadoDeImportar {
  lote: LoteDeDte;
  avisos: string[];
}

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  lector: LectorDeFilas;
  configuracion: LectorDeConfiguracionDeImportacion;
  datosDeLaEmpresa: DatosDeLaEmpresaParaDocumentos;
  reloj: Reloj;
  lotes: RepositorioDeLotesDeDte;
  carga: RepositorioParaImportar;
  consultas: ConsultasParaImportar;
  auditoria: Auditoria;
}

interface Lectura {
  archivo: ArchivoDeFilas;
  configuracion: ConfiguracionDeLaImportacion;
  mapa: MapaDeEncabezados;
  avisos: string[];
  sha256: string;
}

function origenDelArchivo(datos: {
  operador: Operador;
  loteId: string;
  lectura: Lectura;
  peticion: PeticionDeImportar;
}): OrigenDelArchivo {
  const { operador, loteId, lectura, peticion } = datos;
  return {
    loteId,
    empresaId: operador.empresaId,
    formato: lectura.archivo.formato,
    nombreDelArchivo: peticion.nombreDelArchivo,
    sha256: lectura.sha256,
    tamanoEnBytes: peticion.archivo.length,
    encabezadosNoReconocidos: lectura.archivo.noReconocidos,
  };
}

/** Los avisos de la carga: los de la configuración y la lectura, y lo que el usuario debería revisar. */
function avisosDeLaCarga(origen: {
  lectura: Lectura;
  leidas: ResultadoDeLaLectura;
  plan: PlanDeCarga;
  repetido: boolean;
}): string[] {
  const { lectura, leidas, plan, repetido } = origen;
  const avisos = [...lectura.avisos, ...leidas.avisos];
  if (repetido) avisos.push('Este mismo archivo ya se había subido antes.');
  if (plan.anuladasYaRegistradas > 0) {
    avisos.push(`${plan.anuladasYaRegistradas} DTE ya registrado(s) aquí se anularon en la SAT: revíselos.`);
  }
  if (plan.bloqueadas > 0) {
    avisos.push(`${plan.bloqueadas} DTE ya están registrados en otra empresa de su cuenta y quedaron bloqueados.`);
  }
  return avisos;
}

/**
 * Carga a la bandeja el archivo de «DTE recibidos» de la SAT (`.xls`, `.xlsx` o CSV). Lee el archivo fuera de la
 * transacción; después, en una sola transacción (el lote entra entero o no entra): lee y convierte las filas, las crea
 * pendientes (registradas si el libro ya las tiene, bloqueadas si las tiene otra empresa de la cuenta, con el proveedor
 * por NIT), actualiza las que cambiaron (auditando `corregir`), guarda el lote con su resumen y avisa. No registra nada
 * fiscal: se puede volver a subir el mismo archivo cuantas veces haga falta. El archivo no se guarda, solo su huella.
 */
export class ImportarDteRecibidos {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws EmpresaSinNit, ArchivoDeLaSatNoReconocido, y los errores de lectura del archivo (formato, tamaño, filas).
   */
  async ejecutar(operador: Operador, peticion: PeticionDeImportar): Promise<ResultadoDeImportar> {
    const lectura = await this.leer(operador, peticion.archivo);
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, () => this.cargar(operador, peticion, lectura));
  }

  private async leer(operador: Operador, contenido: Buffer): Promise<Lectura> {
    const configuracion = await this.dependencias.configuracion.paraEmpresa(operador);
    const avisos: string[] = [];
    const adicionales = interpretarEncabezadosAdicionales(configuracion.encabezadosAdicionales, (m) => avisos.push(m));
    const mapa = construirMapa(adicionales);
    const archivo = await this.dependencias.lector.leerFilas(contenido, mapa.esperados);
    return { archivo, configuracion, mapa, avisos, sha256: createHash('sha256').update(contenido).digest('hex') };
  }

  private async cargar(operador: Operador, peticion: PeticionDeImportar, lectura: Lectura) {
    const { lotes, reloj } = this.dependencias;
    const hoy = await reloj.hoy(operador);
    const leidas = leerDteDeLaSat(lectura.archivo, {
      mapa: lectura.mapa,
      nitDeLaEmpresa: await this.nitDeLaEmpresa(operador),
      zonaHoraria: lectura.configuracion.zonaHoraria,
      decimales: lectura.configuracion.decimales,
      hoy,
    });
    const loteId = crypto.randomUUID();
    const plan = clasificarCarga(leidas.filas, await this.conocer(operador, loteId, leidas));
    const lote = resumenDelLote(origenDelArchivo({ operador, loteId, lectura, peticion }), leidas, plan);
    const repetido = (await lotes.buscarPorSha256(lectura.sha256)) !== null;
    await lotes.agregar(lote);
    await this.aplicar(plan, { loteId, hoy });
    return { lote, avisos: avisosDeLaCarga({ lectura, leidas, plan, repetido }) };
  }

  /** Lo que ya hay de las filas del archivo: en la bandeja, en el libro de esta empresa, en otra empresa y en proveedores. */
  private async conocer(operador: Operador, loteId: string, leidas: ResultadoDeLaLectura): Promise<ConocimientoPrevio> {
    const { consultas, carga } = this.dependencias;
    const autorizaciones = leidas.filas.map(({ datos }) => datos.autorizacionFel);
    const existentes = await carga.existentes(autorizaciones);
    const nuevas = autorizaciones.filter((autorizacion) => !existentes.has(autorizacion));
    const nits = [...new Set(leidas.filas.map(({ datos }) => datos.nitEmisor))];
    return {
      empresaId: operador.empresaId,
      loteId,
      existentes,
      documentosVigentes: await consultas.documentosVigentes(nuevas),
      registradasEnOtraEmpresa: await consultas.registradasEnOtraEmpresa(nuevas),
      proveedoresPorNit: await consultas.proveedoresPorNit(nits),
    };
  }

  private async nitDeLaEmpresa(operador: Operador): Promise<string> {
    const nit = await this.dependencias.datosDeLaEmpresa.nit(operador);
    if (!nit) throw new EmpresaSinNit();
    return normalizarNit(nit);
  }

  /** Escribe el plan: filas nuevas, filas con datos nuevos (y su auditoría) y filas que solo cambian de lote. */
  private async aplicar(plan: PlanDeCarga, { loteId, hoy }: { loteId: string; hoy: string }): Promise<void> {
    const { carga, auditoria } = this.dependencias;
    await carga.agregarVarias(plan.nuevas);
    await carga.moverALote(
      plan.sinCambio.map((fila) => fila.id.valor),
      loteId,
    );
    for (const { fila, anterior, campos } of plan.actualizadas) {
      await carga.actualizarDatosDeLaSat(fila);
      await auditoria.registrar({
        recurso: RECURSO,
        registroId: fila.id.valor,
        accion: 'corregir',
        anterior,
        motivo: `Lote del ${hoy}: ${campos.join(', ')}`,
      });
    }
  }
}
