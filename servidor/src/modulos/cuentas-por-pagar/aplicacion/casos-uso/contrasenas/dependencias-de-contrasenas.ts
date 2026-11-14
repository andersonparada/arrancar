import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { ContrasenaDto } from '../../dto/contrasena.dto.js';
import { dtoDeContrasena } from '../../dto/dto-de-contrasena.js';
import type {
  ConsultasDeContrasenas,
  ProveedoresDeContrasenas,
  RepositorioDeContrasenas,
} from '../../puertos/puertos-de-contrasenas.js';
import type { ConsultasDeDocumentos } from '../../puertos/puertos-de-consultas.js';
import type {
  FechasDeEntrada,
  RepositorioDeDocumentos,
  UmbralDeBancarizacion,
} from '../../puertos/puertos-de-documentos.js';
import type { CargaInicial } from '../../puertos/puertos-de-saldos-iniciales.js';

/** Lo que necesita consultar contraseñas. */
export interface DependenciasDeConsultaDeContrasenas {
  unidadDeTrabajo: UnidadDeTrabajo;
  reloj: Reloj;
  contrasenas: ConsultasDeContrasenas;
  umbral: UmbralDeBancarizacion;
}

/** Lo que necesita crear una contraseña. */
export interface DependenciasParaCrearContrasena extends DependenciasDeConsultaDeContrasenas {
  documentos: RepositorioDeDocumentos;
  consultas: ConsultasDeDocumentos;
  repositorio: RepositorioDeContrasenas;
  proveedores: ProveedoresDeContrasenas;
  correlativos: Correlativos;
  cargaInicial: CargaInicial;
  fechasDeEntrada: FechasDeEntrada;
}

/**
 * La contraseña como la ve la pantalla, con los montos de hoy.
 * @throws RecursoNoEncontrado si no existe o es de otra empresa.
 */
export async function contrasenaComoDto(
  { contrasenas, umbral }: Pick<DependenciasDeConsultaDeContrasenas, 'contrasenas' | 'umbral'>,
  operador: Operador,
  id: string,
): Promise<ContrasenaDto> {
  const detalle = await contrasenas.detalle(id);
  if (!detalle) throw new RecursoNoEncontrado('La contraseña');
  return dtoDeContrasena(detalle, await umbral.centavos(operador));
}
