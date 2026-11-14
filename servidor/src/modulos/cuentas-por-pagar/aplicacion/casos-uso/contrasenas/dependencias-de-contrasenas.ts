import type { Auditoria } from '../../../../core/compartido/aplicacion/auditoria.js';
import type { Correlativos } from '../../../../core/compartido/aplicacion/correlativos.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { Reloj } from '../../../../core/compartido/aplicacion/reloj.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { ContrasenaDto } from '../../dto/contrasena.dto.js';
import { dtoDeContrasena } from '../../dto/dto-de-contrasena.js';
import type {
  ConsultasDeContrasenas,
  ContrasenaConDocumentos,
  ProveedoresDeContrasenas,
  RepositorioDeContrasenas,
} from '../../puertos/puertos-de-contrasenas.js';
import { ContrasenaAnulada } from '../../../dominio/errores-de-contrasenas.js';
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

/** Lo que necesita cambiar la fecha prometida y las observaciones de una contraseña. */
export interface DependenciasParaEditarContrasena extends DependenciasDeConsultaDeContrasenas {
  repositorio: RepositorioDeContrasenas;
  auditoria: Auditoria;
}

/** Lo que necesita agregar y quitar documentos de una contraseña. */
export interface DependenciasParaCambiarDocumentos extends DependenciasParaEditarContrasena {
  documentos: RepositorioDeDocumentos;
  consultas: ConsultasDeDocumentos;
  cargaInicial: CargaInicial;
  fechasDeEntrada: FechasDeEntrada;
}

/** El recurso con que se audita lo que se cambia de una contraseña. */
export const RECURSO_DE_CONTRASENAS = 'cuentas-por-pagar.contrasenas';

/**
 * Bloquea la contraseña y la lee con sus montos de hoy, tal como estaba antes del cambio.
 * @throws RecursoNoEncontrado si no existe o es de otra empresa.
 * @throws ContrasenaAnulada si ya no está vigente.
 */
export async function abrirContrasena(
  dependencias: Pick<DependenciasParaEditarContrasena, 'repositorio' | 'contrasenas' | 'umbral'>,
  operador: Operador,
  id: string,
): Promise<{ detalle: ContrasenaConDocumentos; antes: ContrasenaDto }> {
  await dependencias.repositorio.bloquear(id);
  const detalle = await dependencias.contrasenas.detalle(id);
  if (!detalle) throw new RecursoNoEncontrado('La contraseña');
  if (detalle.contrasena.estado === 'anulada') throw new ContrasenaAnulada();
  return { detalle, antes: dtoDeContrasena(detalle, await dependencias.umbral.centavos(operador)) };
}
