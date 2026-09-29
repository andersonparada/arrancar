import { RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import type {
  CargaInicialDto,
  DatosDeIdentificacionDto,
  DatosFiscalesDto,
} from '../aplicacion/dto/datos-de-empresa.dto.js';
import type { ConsultasDeDatosDeEmpresa } from '../aplicacion/puertos/consultas-de-datos-de-empresa.js';
import type { RepositorioDeCargasIniciales } from '../aplicacion/puertos/repositorio-de-cargas-iniciales.js';
import type { RepositorioDeDatosFiscales } from '../aplicacion/puertos/repositorio-de-datos-fiscales.js';
import type { CargaInicial, CierreDeCarga } from '../dominio/carga-inicial.js';
import type { DatosFiscales } from '../dominio/datos-fiscales.js';
import type { EmpresaId } from '../dominio/empresa.js';

/** Repositorio en memoria de los datos fiscales. */
export class DatosFiscalesEnMemoria implements RepositorioDeDatosFiscales {
  readonly guardados = new Map<string, DatosFiscales>();

  async buscar(empresaId: EmpresaId): Promise<DatosFiscales | null> {
    return this.guardados.get(empresaId.valor) ?? null;
  }

  async guardar(datos: DatosFiscales): Promise<void> {
    this.guardados.set(datos.instantanea().empresaId.valor, datos);
  }
}

/** Repositorio en memoria de las cargas iniciales. */
export class CargasInicialesEnMemoria implements RepositorioDeCargasIniciales {
  readonly guardadas = new Map<string, CargaInicial>();

  async buscar(empresaId: EmpresaId): Promise<CargaInicial | null> {
    return this.guardadas.get(empresaId.valor) ?? null;
  }

  async guardar(carga: CargaInicial): Promise<void> {
    this.guardadas.set(carga.instantanea().empresaId.valor, carga);
  }
}

function datosDelCierre(cierre: CierreDeCarga | null) {
  return {
    cerrada: cierre !== null,
    cerradaEn: cierre?.cerradaEn ?? null,
    cerradaPor: cierre?.cerradaPor ?? null,
  };
}

/** Consultas en memoria: leen lo que guardaron los dos repositorios en memoria. */
export class ConsultasDeDatosDeEmpresaEnMemoria implements ConsultasDeDatosDeEmpresa {
  /** Cuántas veces se leyó la carga inicial tomando el bloqueo compartido. */
  lecturasConBloqueo = 0;

  constructor(
    private readonly fiscales: DatosFiscalesEnMemoria,
    private readonly cargas: CargasInicialesEnMemoria,
    private readonly nombresDeEmpresa = new Map<string, string>(),
  ) {}

  async datosFiscales(empresaId: string): Promise<DatosFiscalesDto> {
    const propiedades = this.fiscales.guardados.get(empresaId)?.instantanea();
    return {
      empresaId,
      razonSocial: propiedades?.razonSocial ?? null,
      nombreComercial: propiedades?.nombreComercial ?? null,
    };
  }

  async cargaInicial(empresaId: string): Promise<CargaInicialDto> {
    const carga = this.cargas.guardadas.get(empresaId)?.instantanea();
    if (!carga) return { empresaId, fechaDeInicio: null, ...datosDelCierre(null) };
    return { empresaId, fechaDeInicio: carga.fechaDeInicio, ...datosDelCierre(carga.cierre) };
  }

  async cargaInicialBloqueandoElCierre(empresaId: string): Promise<CargaInicialDto> {
    this.lecturasConBloqueo += 1;
    return this.cargaInicial(empresaId);
  }

  async datosDeIdentificacion(empresaId: string): Promise<DatosDeIdentificacionDto> {
    const nombre = this.nombresDeEmpresa.get(empresaId);
    if (!nombre) throw new RecursoNoEncontrado('La empresa');
    const { razonSocial, nombreComercial } = await this.datosFiscales(empresaId);
    return { nombre, nit: null, razonSocial, nombreComercial };
  }
}
