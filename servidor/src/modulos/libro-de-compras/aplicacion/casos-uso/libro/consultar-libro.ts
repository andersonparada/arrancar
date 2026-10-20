import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { libroDelPeriodo, type LibroDelPeriodo } from '../../../dominio/libro/libro-del-periodo.js';
import { tipoDeLibroDe } from '../../../dominio/libro/tipo-de-libro.js';
import { dtoDeAnulado, dtoDelLibro, type AnuladoDelLibroDto, type LibroDto } from '../../dto/libro.dto.js';
import type { ConsultasDelLibro, IdentidadDeLaEmpresa } from '../../puertos/consultas-del-libro.js';
import type { RepositorioDeDatosFiscalesDeEmpresa } from '../../puertos/repositorios-de-datos-fiscales.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDelLibro;
  identidad: IdentidadDeLaEmpresa;
  datosFiscalesDeEmpresa: RepositorioDeDatosFiscalesDeEmpresa;
}

/** `AAAA-MM` o `AAAA-MM-DD` → el primer día del mes del libro. */
export const periodoDelLibro = (periodo: string): string => `${periodo.slice(0, 7)}-01`;

export type DependenciasParaArmarElLibro = Pick<Dependencias, 'consultas' | 'identidad' | 'datosFiscalesDeEmpresa'>;

export interface LibroArmado {
  libro: LibroDelPeriodo;
  periodo: string;
  empresa: { nombre: string; nit: string | null };
}

async function tipoVigente(dependencias: DependenciasParaArmarElLibro, empresaId: string, periodo: string) {
  const datos = await dependencias.datosFiscalesDeEmpresa.vigenteEn(empresaId, periodo);
  return datos ? tipoDeLibroDe(datos.instantanea().regimenIva) : 'completo';
}

/**
 * Arma el libro del período dentro de la unidad de trabajo en curso: completo o simplificado según el régimen de IVA
 * con que se registraron sus documentos (o, si no tiene, el que rige en el período).
 */
export async function armarLibro(
  dependencias: DependenciasParaArmarElLibro,
  operador: Operador,
  primerDia: string,
): Promise<LibroArmado> {
  const { consultas, identidad } = dependencias;
  const documentos = await consultas.documentosDelPeriodo(operador.empresaId, primerDia);
  const tipo = documentos[0]
    ? tipoDeLibroDe(documentos[0].regimenIvaDeLaEmpresa)
    : await tipoVigente(dependencias, operador.empresaId, primerDia);
  return {
    libro: libroDelPeriodo(documentos, tipo),
    periodo: primerDia,
    empresa: await identidad.datos(operador),
  };
}

/** El libro de compras de un período, completo o simplificado. */
export class ConsultarLibro {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, periodo: string): Promise<LibroDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const { libro, ...contexto } = await armarLibro(this.dependencias, operador, periodoDelLibro(periodo));
      return dtoDelLibro(libro, contexto);
    });
  }
}

/** El anexo de anulados del período: dato aparte, no suma al libro. */
export class ConsultarAnuladosDelLibro {
  constructor(private readonly dependencias: Pick<Dependencias, 'unidadDeTrabajo' | 'consultas'>) {}

  ejecutar(operador: Operador, periodo: string): Promise<AnuladoDelLibroDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () =>
      (await consultas.anuladosDelPeriodo(operador.empresaId, periodoDelLibro(periodo))).map(dtoDeAnulado),
    );
  }
}
