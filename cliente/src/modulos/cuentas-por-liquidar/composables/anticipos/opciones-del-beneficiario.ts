import type { Usuario } from '@/modulos/core/servicios/usuarios.api';
import type { OpcionBuscable } from '@/modulos/core/utilidades/busqueda-de-opciones';
import { formatearNit } from '@/modulos/core/utilidades/formato';
import type { Beneficiario, DatosDeBeneficiarioNuevo } from '../../servicios/opciones.api';

const porTexto = (a: { texto: string }, b: { texto: string }): number =>
  a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' });

/** Los terceros activos por nombre; el NIT ayuda a no confundir homónimos. */
export function opcionesDeBeneficiarios(terceros: readonly Beneficiario[]): OpcionBuscable<string>[] {
  return terceros
    .filter(({ activo }) => activo)
    .map(({ id, nombreMostrar, nit }) => ({
      valor: id,
      texto: nit ? `${nombreMostrar} · NIT ${formatearNit(nit)}` : nombreMostrar,
    }))
    .sort(porTexto);
}

/** El nombre completo de un usuario. */
export const nombreDelUsuario = (usuario: Pick<Usuario, 'nombres' | 'apellidos'>): string =>
  `${usuario.nombres} ${usuario.apellidos}`.trim();

/**
 * Los usuarios que pueden ser el beneficiario: activos y con acceso a la empresa activa (el servidor revisa lo mismo). La
 * primera opción es «no es usuario».
 */
export function opcionesDeUsuarios(usuarios: readonly Usuario[], empresaId: string | null): OpcionBuscable<string>[] {
  const posibles = usuarios
    .filter(({ activo, empresas }) => activo && empresas.some((empresa) => empresa.empresaId === empresaId))
    .map((usuario) => ({ valor: usuario.id, texto: `${nombreDelUsuario(usuario)} (${usuario.usuario})` }))
    .sort(porTexto);
  return [{ valor: '', texto: 'No es usuario de Arrancar' }, ...posibles];
}

/** Lo que escribe quien da de alta a un beneficiario sin salir de la ventana. */
export interface EdicionDeBeneficiarioNuevo {
  tipo: 'individual' | 'juridica';
  nombres: string;
  apellidos: string;
  razonSocial: string;
}

export const beneficiarioNuevoVacio = (): EdicionDeBeneficiarioNuevo => ({
  tipo: 'individual',
  nombres: '',
  apellidos: '',
  razonSocial: '',
});

/** Los errores de lo escrito, antes de molestar al servidor. */
export function erroresDelBeneficiarioNuevo(edicion: EdicionDeBeneficiarioNuevo): Record<string, string> {
  if (edicion.tipo === 'individual') {
    return edicion.nombres.trim() ? {} : { nombres: 'Escriba los nombres de la persona.' };
  }
  return edicion.razonSocial.trim() ? {} : { razonSocial: 'Escriba la razón social de la empresa.' };
}

/** El cuerpo del alta: solo el nombre; el NIT y lo demás se completan después en Terceros. */
export function datosDelBeneficiarioNuevo(edicion: EdicionDeBeneficiarioNuevo): DatosDeBeneficiarioNuevo {
  const esPersona = edicion.tipo === 'individual';
  return {
    tipo: edicion.tipo,
    nombres: esPersona ? edicion.nombres.trim() : null,
    apellidos: esPersona ? edicion.apellidos.trim() || null : null,
    razonSocial: esPersona ? null : edicion.razonSocial.trim(),
  };
}
