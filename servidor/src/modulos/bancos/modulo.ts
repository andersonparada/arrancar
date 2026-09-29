import { z } from 'zod';
import { definirConfiguracion, type DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeBancos } from './composicion/bancos.js';
import { rutasDeChequeras } from './composicion/chequeras.js';
import { rutasDeCheques } from './composicion/cheques.js';
import { rutasDeConciliaciones } from './composicion/conciliaciones.js';
import { rutasDeCuentasBancarias } from './composicion/cuentas-bancarias.js';
import { rutasDeMovimientos } from './composicion/movimientos.js';
import { rutasDeNotas } from './composicion/notas.js';
import { rutasDeSaldosIniciales } from './composicion/saldos-iniciales.js';
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
    { clave: 'bancos.movimientos.ver', descripcion: 'Ver el reporte de movimientos' },
    { clave: 'bancos.movimientos.exportar', descripcion: 'Exportar el reporte de movimientos a Excel' },
    { clave: 'bancos.notas.ver', descripcion: 'Ver notas de crédito y de débito' },
    { clave: 'bancos.notas.gestionar', descripcion: 'Registrar y corregir notas de crédito y débito' },
    { clave: 'bancos.notas.anular', descripcion: 'Anular notas de crédito y débito (crea el movimiento inverso)' },
    { clave: 'bancos.notas.eliminar', descripcion: 'Eliminar notas de crédito y débito limpias' },
    { clave: 'bancos.transferencias.ver', descripcion: 'Ver transferencias entre cuentas propias' },
    { clave: 'bancos.transferencias.gestionar', descripcion: 'Registrar transferencias entre cuentas propias' },
    { clave: 'bancos.transferencias.anular', descripcion: 'Anular transferencias (crea los dos inversos)' },
    { clave: 'bancos.transferencias.eliminar', descripcion: 'Eliminar transferencias limpias' },
    {
      clave: 'bancos.saldos-iniciales.gestionar',
      descripcion: 'Registrar, corregir y eliminar el saldo inicial de las cuentas',
    },
    { clave: 'bancos.saldos-iniciales.importar', descripcion: 'Importar saldos iniciales desde Excel' },
    { clave: 'bancos.saldos-iniciales.exportar', descripcion: 'Exportar saldos iniciales a Excel' },
    { clave: 'bancos.chequeras.ver', descripcion: 'Ver chequeras' },
    { clave: 'bancos.chequeras.gestionar', descripcion: 'Crear e inactivar chequeras' },
    { clave: 'bancos.chequeras.importar', descripcion: 'Importar chequeras desde Excel' },
    { clave: 'bancos.chequeras.exportar', descripcion: 'Exportar chequeras a Excel' },
    { clave: 'bancos.cheques.ver', descripcion: 'Ver cheques' },
    { clave: 'bancos.cheques.emitir', descripcion: 'Emitir cheques' },
    { clave: 'bancos.cheques.anular', descripcion: 'Anular cheques' },
    { clave: 'bancos.cheques.blanquear', descripcion: 'Blanquear cheques emitidos por error' },
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
    definirConfiguracion({
      clave: 'bancos.anulaciones.misma_fecha',
      descripcion:
        'El movimiento inverso de una anulación usa la fecha del original en vez de la fecha que escriba el usuario, mientras el mes del original no esté conciliado.',
      esquema: z.boolean(),
      predeterminado: false,
      niveles: ['instalacion', 'empresa'],
      publica: true,
    }),
  ],
  rutas: rutasDelModulo([
    rutasDeBancos(),
    rutasDeCuentasBancarias(),
    rutasDeMovimientos(),
    rutasDeNotas(),
    rutasDeSaldosIniciales(),
    rutasDeTransferencias(),
    rutasDeChequeras(),
    rutasDeCheques(),
    rutasDeConciliaciones(),
    // generador: rutas
  ]),
};
