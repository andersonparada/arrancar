import { z } from 'zod';
import { definirConfiguracion, type DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeBancos } from './composicion/bancos.js';
import { rutasDeCuentasBancarias } from './composicion/cuentas-bancarias.js';
// generador: importaciones

/** Cuentas bancarias, notas, cheques y conciliaciones de cada empresa. Ver `docs/modulos/bancos.md`. */
export const moduloBancos: DefinicionModulo = {
  clave: 'bancos',
  nombre: 'Bancos',
  descripcion: 'Cuentas bancarias, notas, cheques y conciliaciones de cada empresa.',
  dependeDe: [],
  permisos: [
    { clave: 'bancos.bancos.ver', descripcion: 'Ver bancos' },
    { clave: 'bancos.bancos.gestionar', descripcion: 'Registrar, editar e inactivar bancos' },
    { clave: 'bancos.bancos.importar', descripcion: 'Importar bancos desde Excel' },
    { clave: 'bancos.bancos.exportar', descripcion: 'Exportar bancos a Excel' },
    { clave: 'bancos.cuentas-bancarias.ver', descripcion: 'Ver cuentas bancarias' },
    { clave: 'bancos.cuentas-bancarias.gestionar', descripcion: 'Registrar, editar e inactivar cuentas bancarias' },
    { clave: 'bancos.cuentas-bancarias.importar', descripcion: 'Importar cuentas bancarias desde Excel' },
    { clave: 'bancos.cuentas-bancarias.exportar', descripcion: 'Exportar cuentas bancarias a Excel' },
    // generador: permisos
  ],
  configuracion: [
    definirConfiguracion({
      clave: 'bancos.cuentas.permitir_sobregiro',
      descripcion: 'Permite que el saldo de una cuenta bancaria quede negativo.',
      esquema: z.boolean(),
      predeterminado: false,
      niveles: ['instalacion', 'empresa'],
      publica: true,
    }),
    definirConfiguracion({
      clave: 'bancos.chequeras.maximo_cheques',
      descripcion: 'Cantidad máxima de cheques al crear una chequera.',
      esquema: z.number().int().positive(),
      predeterminado: 5000,
      niveles: ['instalacion', 'empresa'],
      publica: true,
    }),
  ],
  rutas: rutasDelModulo([
    rutasDeBancos(),
    rutasDeCuentasBancarias(),
    // generador: rutas
  ]),
};
