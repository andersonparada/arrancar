import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { datosDelSat2237, type DatosDelSat2237 } from '../../../dominio/libro/datos-del-sat-2237.js';
import { formularioDelRegimen, type FormularioDelRegimen } from '../../../dominio/libro/formulario-del-regimen.js';
import { dtoDelSat2237, dtoSinSat2237, type Sat2237Dto, type Sat2237SinFormularioDto } from '../../dto/sat-2237.dto.js';
import type { ConsultasDelLibro, IdentidadDeLaEmpresa } from '../../puertos/consultas-del-libro.js';
import type { RepositorioDeDatosFiscalesDeEmpresa } from '../../puertos/repositorios-de-datos-fiscales.js';
import { periodoDelLibro } from './consultar-libro.js';

export interface DependenciasDelSat2237 {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasDelLibro;
  identidad: IdentidadDeLaEmpresa;
  datosFiscalesDeEmpresa: RepositorioDeDatosFiscalesDeEmpresa;
}

type SinFormulario = Exclude<FormularioDelRegimen, { declaraCompras: true }>;

export type Sat2237Armado = {
  periodo: string;
  empresa: { nombre: string; nit: string | null };
} & ({ datos: DatosDelSat2237 } | { datos: null; forma: SinFormulario });

/**
 * Arma los datos del SAT-2237 dentro de la unidad de trabajo en curso. El régimen es el de los documentos del período
 * o, si no hay, el que rige en él (general si la empresa no tiene datos fiscales).
 */
export async function armarSat2237(
  dependencias: Omit<DependenciasDelSat2237, 'unidadDeTrabajo'>,
  operador: Operador,
  primerDia: string,
): Promise<Sat2237Armado> {
  const { consultas, identidad, datosFiscalesDeEmpresa } = dependencias;
  const documentos = await consultas.documentosDelPeriodo(operador.empresaId, primerDia);
  const vigente = documentos[0] ? null : await datosFiscalesDeEmpresa.vigenteEn(operador.empresaId, primerDia);
  const regimen = documentos[0]?.regimenIvaDeLaEmpresa ?? vigente?.instantanea().regimenIva ?? 'general';
  const forma = formularioDelRegimen(regimen);
  const encabezado = { periodo: primerDia, empresa: await identidad.datos(operador) };
  return forma.declaraCompras
    ? { ...encabezado, datos: datosDelSat2237(documentos) }
    : { ...encabezado, datos: null, forma };
}

/** Los datos para llenar el SAT-2237 de un período; si el régimen no lo usa, dice cuál es su formulario. */
export class ConsultarSat2237 {
  constructor(private readonly dependencias: DependenciasDelSat2237) {}

  ejecutar(operador: Operador, periodo: string): Promise<Sat2237Dto | Sat2237SinFormularioDto> {
    return this.dependencias.unidadDeTrabajo.ejecutar(operador, async () => {
      const armado = await armarSat2237(this.dependencias, operador, periodoDelLibro(periodo));
      const { periodo: primerDia, empresa } = armado;
      return armado.datos
        ? dtoDelSat2237(armado.datos, { periodo: primerDia, empresa })
        : dtoSinSat2237(armado.forma, { periodo: primerDia, empresa });
    });
  }
}
