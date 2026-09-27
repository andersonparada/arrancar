import type { PapelTercero } from './servicios/terceros.api';
import { VENTANA_DEL_PAPEL } from './textos';

/** Asignar, cambiar o quitar un papel exige su propio permiso, además de `terceros.gestionar`. */
export const PERMISO_DEL_PAPEL: Record<PapelTercero, string> = {
  cliente: 'clientes.gestionar',
  proveedor: 'proveedores.gestionar',
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
