import type { DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeParcelas } from './composicion/parcelas.js';
import { rutasDeTiposDeParcela } from './composicion/tipos-de-parcela.js';
import { configuracionDeParcelas } from './configuracion.js';
// generador: importaciones

/** Fincas, potreros y lotes: superficie, uso y tenencia Ver `docs/modulos/parcelas.md`. */
export const moduloParcelas: DefinicionModulo = {
  clave: 'parcelas',
  nombre: 'Parcelas',
  descripcion: 'Fincas, potreros y lotes: superficie, uso y tenencia',
  dependeDe: ['terceros'],
  permisos: [
    { clave: 'parcelas.tipos-de-parcela.ver', descripcion: 'Ver tipos de parcela' },
    { clave: 'parcelas.tipos-de-parcela.crear', descripcion: 'Registrar tipos de parcela' },
    { clave: 'parcelas.tipos-de-parcela.editar', descripcion: 'Editar, inactivar y reactivar tipos de parcela' },
    {
      clave: 'parcelas.tipos-de-parcela.eliminar',
      descripcion: 'Eliminar tipos de parcela sin parcelas',
    },
    { clave: 'parcelas.tipos-de-parcela.importar', descripcion: 'Importar tipos de parcela desde Excel' },
    { clave: 'parcelas.tipos-de-parcela.exportar', descripcion: 'Exportar tipos de parcela a Excel' },
    { clave: 'parcelas.parcelas.ver', descripcion: 'Ver parcelas, su árbol y su ficha' },
    { clave: 'parcelas.parcelas.crear', descripcion: 'Registrar parcelas' },
    { clave: 'parcelas.parcelas.editar', descripcion: 'Editar, inactivar y reactivar parcelas y ligar sus inmuebles' },
    { clave: 'parcelas.parcelas.eliminar', descripcion: 'Eliminar parcelas sin subparcelas ni mediciones' },
    { clave: 'parcelas.parcelas.importar', descripcion: 'Importar parcelas desde Excel (y bajar la plantilla)' },
    { clave: 'parcelas.parcelas.exportar', descripcion: 'Exportar parcelas a Excel' },
    { clave: 'parcelas.mediciones.crear', descripcion: 'Registrar mediciones de la superficie de una parcela' },
    { clave: 'parcelas.mediciones.anular', descripcion: 'Anular mediciones de una parcela' },
    // generador: permisos
  ],
  configuracion: configuracionDeParcelas,
  rutas: rutasDelModulo([
    rutasDeTiposDeParcela(),
    rutasDeParcelas(),
    // generador: rutas
  ]),
};
