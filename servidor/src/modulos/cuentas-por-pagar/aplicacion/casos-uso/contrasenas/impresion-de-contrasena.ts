import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { dtoDeContrasena } from '../../dto/dto-de-contrasena.js';
import { dtoDeImpresionDeContrasena } from '../../dto/dto-de-impresion-de-contrasena.js';
import type { ImpresionDeContrasenaDto } from '../../dto/impresion-de-contrasena.dto.js';
import type { DatosDeLaEmpresa, LeyendaDeContrasenas } from '../../puertos/puertos-de-impresion-de-contrasenas.js';
import { vistaDeContrasena, type DependenciasDeConsultaDeContrasenas } from './dependencias-de-contrasenas.js';

/** Lo que necesita armar la contraseña impresa. */
export interface DependenciasDeImpresion extends DependenciasDeConsultaDeContrasenas {
  empresa: DatosDeLaEmpresa;
  leyenda: LeyendaDeContrasenas;
}

/**
 * Arma la contraseña como va en el papel, con los montos del día. No cambia nada.
 * @throws RecursoNoEncontrado si no existe o es de otra empresa.
 */
export async function armarImpresion(
  dependencias: DependenciasDeImpresion,
  operador: Operador,
  opciones: { id: string; reimpresion?: boolean },
): Promise<ImpresionDeContrasenaDto> {
  const { contrasenas, reloj, empresa, leyenda } = dependencias;
  const detalle = await contrasenas.detalle(opciones.id);
  if (!detalle) throw new RecursoNoEncontrado('La contraseña');
  return dtoDeImpresionDeContrasena(dtoDeContrasena(detalle, await vistaDeContrasena(dependencias, operador)), {
    empresa: await empresa.obtener(operador),
    leyenda: await leyenda.texto(operador),
    hoy: await reloj.hoy(operador),
    impresoPorNombre: await contrasenas.nombreDelUsuario(operador.usuarioId),
    impresoEn: new Date().toISOString(),
    reimpresion: opciones.reimpresion ?? detalle.contrasena.impresaEn !== null,
  });
}
