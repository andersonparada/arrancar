import type { DatosRol, Rol } from '../../servicios/roles.api';

export interface EdicionDeRol extends DatosRol {
  abierta: boolean;
  rolId: string | null;
  descripcion: string;
}

const ROL_NUEVO = { rolId: null, nombre: '', descripcion: '', accesoTotal: false, permisos: [] };

const datosDe = (rol: Rol) => ({
  rolId: rol.id,
  nombre: rol.nombre,
  descripcion: rol.descripcion ?? '',
  accesoTotal: rol.accesoTotal,
  permisos: [...rol.permisos],
});

/** La ventana abierta con los datos del rol, o vacía si es nuevo. */
export const edicionDe = (rol?: Rol): EdicionDeRol => ({ ...(rol ? datosDe(rol) : ROL_NUEVO), abierta: true });

export const datosDelRol = ({ nombre, descripcion, accesoTotal, permisos }: EdicionDeRol): DatosRol => ({
  nombre,
  descripcion: descripcion || null,
  accesoTotal,
  permisos,
});

export const resumenDePermisos = (rol: Rol) =>
  `${rol.accesoTotal ? 'Todos los permisos' : `${rol.permisos.length} permisos`} · ${rol.totalUsuarios} asignaciones`;
