import { z } from 'zod';
import { definirConfiguracion, type DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeBancos } from './composicion/bancos.js';
import { rutasDeChequeras } from './composicion/chequeras.js';
import { rutasDeCheques } from './composicion/cheques.js';
import { rutasDeConciliaciones } from './composicion/conciliaciones.js';
import { rutasDeCuentasBancarias } from './composicion/cuentas-bancarias.js';
import { rutasDeMovimientos } from './composicion/movimientos.js';
import { rutasDeTransferencias } from './composicion/transferencias.js';
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
    { clave: 'bancos.movimientos.ver', descripcion: 'Ver movimientos' },
    { clave: 'bancos.movimientos.gestionar', descripcion: 'Registrar y corregir movimientos' },
    { clave: 'bancos.movimientos.anular', descripcion: 'Anular movimientos' },
    { clave: 'bancos.movimientos.importar', descripcion: 'Importar movimientos desde Excel' },
    { clave: 'bancos.transferencias.gestionar', descripcion: 'Registrar transferencias entre cuentas propias' },
    { clave: 'bancos.transferencias.anular', descripcion: 'Anular transferencias' },
    { clave: 'bancos.chequeras.ver', descripcion: 'Ver chequeras' },
    { clave: 'bancos.chequeras.gestionar', descripcion: 'Crear e inactivar chequeras' },
    { clave: 'bancos.chequeras.importar', descripcion: 'Importar chequeras desde Excel' },
    { clave: 'bancos.chequeras.exportar', descripcion: 'Exportar chequeras a Excel' },
    { clave: 'bancos.cheques.ver', descripcion: 'Ver cheques' },
    { clave: 'bancos.cheques.emitir', descripcion: 'Emitir cheques' },
    { clave: 'bancos.cheques.anular', descripcion: 'Anular cheques' },
    { clave: 'bancos.conciliaciones.ver', descripcion: 'Ver conciliaciones' },
    { clave: 'bancos.conciliaciones.conciliar', descripcion: 'Marcar documentos y terminar conciliaciones' },
    { clave: 'bancos.conciliaciones.autorizar', descripcion: 'Autorizar o devolver conciliaciones' },
    { clave: 'bancos.conciliaciones.eliminar', descripcion: 'Eliminar conciliaciones' },
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
    rutasDeMovimientos(),
    rutasDeTransferencias(),
    rutasDeChequeras(),
    rutasDeCheques(),
    rutasDeConciliaciones(),
    // generador: rutas
  ]),
};
