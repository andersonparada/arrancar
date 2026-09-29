import type { PapelTercero } from './servicios/terceros.api';
import { VENTANA_DEL_PAPEL } from './textos';

/** Los permisos de un papel: registrar con él (`crear`), asignarlo o cambiarlo (`editar`) y quitarlo (`eliminar`). */
interface PermisosDelPapel {
  crear: string;
  editar: string;
  eliminar: string;
}

/** Cada acción sobre un papel exige su propio permiso, además del de `terceros` que le corresponda. */
export const PERMISOS_DEL_PAPEL: Record<PapelTercero, PermisosDelPapel> = {
  cliente: { crear: 'clientes.crear', editar: 'clientes.editar', eliminar: 'clientes.eliminar' },
  proveedor: { crear: 'proveedores.crear', editar: 'proveedores.editar', eliminar: 'proveedores.eliminar' },
};

/** Cada papel tiene su pantalla: `clientes`, `clientes.nuevo`, `clientes.ficha`, `clientes.editar`… */
export const RUTAS_DEL_PAPEL: Record<PapelTercero, 'clientes' | 'proveedores'> = {
  cliente: 'clientes',
  proveedor: 'proveedores',
};

/** De la ficha, y del alta, se vuelve a la lista del papel. */
export const volverALaLista = (papel: PapelTercero) => ({
  texto: `Volver a ${VENTANA_DEL_PAPEL[papel].titulo}`,
  ruta: { name: RUTAS_DEL_PAPEL[papel] },
});

/** De la edición se vuelve a la ficha, sin guardar nada. */
export const volverALaFicha = (papel: PapelTercero, terceroId: string) => ({
  texto: 'Volver a la ficha',
  ruta: { name: `${RUTAS_DEL_PAPEL[papel]}.ficha`, params: { terceroId } },
});
