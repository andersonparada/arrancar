import { z } from 'zod';
import { definirConfiguracion, type DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasDelModulo } from '../core/modulos-sistema/rutas-del-modulo.js';
import { rutasDeBancos } from './composicion/bancos.js';
import { rutasDeChequeras } from './composicion/chequeras.js';
import { rutasDeCheques } from './composicion/cheques.js';
import { rutasDeChequesCaducos } from './composicion/cheques-caducos.js';
import {
  MESES_DE_VENCIMIENTO_POR_OMISION,
  MESES_MAXIMOS_DE_VENCIMIENTO,
  MESES_MINIMOS_DE_VENCIMIENTO,
} from './dominio/cheques-en-circulacion.js';
import { CONFIANZA_MINIMA_POR_OMISION, VIDA_MEDIA_POR_OMISION } from './dominio/sugerencias/constantes.js';
import { rutasDeConciliaciones } from './composicion/conciliaciones.js';
import { rutasDeCorrelativos } from './composicion/correlativos.js';
import { rutasDeCuentasBancarias } from './composicion/cuentas-bancarias.js';
import { rutasDeMovimientos } from './composicion/movimientos.js';
import { rutasDeNotas } from './composicion/notas.js';
import { rutasDeSaldosIniciales } from './composicion/saldos-iniciales.js';
import { rutasDeTransferencias } from './composicion/transferencias.js';
import { rutasDeConceptos } from './composicion/conceptos.js';
import { rutasDeReportesPorConcepto } from './composicion/reportes-por-concepto.js';
// generador: importaciones

/** Cuentas bancarias, notas, cheques y conciliaciones de cada empresa. Ver `docs/modulos/bancos.md`. */
export const moduloBancos: DefinicionModulo = {
  clave: 'bancos',
  nombre: 'Bancos',
  descripcion: 'Cuentas bancarias, notas, cheques y conciliaciones de cada empresa.',
  dependeDe: [],
  permisos: [
    { clave: 'bancos.bancos.ver', descripcion: 'Ver bancos' },
    { clave: 'bancos.bancos.crear', descripcion: 'Registrar bancos' },
    { clave: 'bancos.bancos.editar', descripcion: 'Editar, inactivar y reactivar bancos' },
    { clave: 'bancos.bancos.importar', descripcion: 'Importar bancos desde Excel' },
    { clave: 'bancos.bancos.exportar', descripcion: 'Exportar bancos a Excel' },
    { clave: 'bancos.cuentas-bancarias.ver', descripcion: 'Ver cuentas bancarias' },
    { clave: 'bancos.cuentas-bancarias.crear', descripcion: 'Registrar cuentas bancarias' },
    { clave: 'bancos.cuentas-bancarias.editar', descripcion: 'Editar, inactivar y reactivar cuentas bancarias' },
    { clave: 'bancos.cuentas-bancarias.importar', descripcion: 'Importar cuentas bancarias desde Excel' },
    { clave: 'bancos.cuentas-bancarias.exportar', descripcion: 'Exportar cuentas bancarias a Excel' },
    { clave: 'bancos.movimientos.ver', descripcion: 'Ver el reporte de movimientos' },
    { clave: 'bancos.movimientos.exportar', descripcion: 'Exportar el reporte de movimientos a Excel' },
    { clave: 'bancos.notas.ver', descripcion: 'Ver notas de crédito y de débito' },
    { clave: 'bancos.notas.crear', descripcion: 'Registrar notas de crédito y débito' },
    { clave: 'bancos.notas.editar', descripcion: 'Corregir y reclasificar notas de crédito y débito' },
    { clave: 'bancos.notas.anular', descripcion: 'Anular notas de crédito y débito (crea el movimiento inverso)' },
    { clave: 'bancos.notas.eliminar', descripcion: 'Eliminar notas de crédito y débito limpias' },
    { clave: 'bancos.transferencias.ver', descripcion: 'Ver transferencias entre cuentas propias' },
    { clave: 'bancos.transferencias.crear', descripcion: 'Registrar transferencias entre cuentas propias' },
    { clave: 'bancos.transferencias.anular', descripcion: 'Anular transferencias (crea los dos inversos)' },
    { clave: 'bancos.transferencias.eliminar', descripcion: 'Eliminar transferencias limpias' },
    { clave: 'bancos.saldos-iniciales.crear', descripcion: 'Registrar el saldo inicial de las cuentas' },
    { clave: 'bancos.saldos-iniciales.editar', descripcion: 'Corregir el saldo inicial de las cuentas' },
    { clave: 'bancos.saldos-iniciales.eliminar', descripcion: 'Eliminar el saldo inicial de las cuentas' },
    { clave: 'bancos.saldos-iniciales.importar', descripcion: 'Importar saldos iniciales desde Excel' },
    { clave: 'bancos.saldos-iniciales.exportar', descripcion: 'Exportar saldos iniciales a Excel' },
    { clave: 'bancos.chequeras.ver', descripcion: 'Ver chequeras' },
    { clave: 'bancos.chequeras.crear', descripcion: 'Crear chequeras' },
    { clave: 'bancos.chequeras.editar', descripcion: 'Inactivar y reactivar chequeras' },
    { clave: 'bancos.chequeras.importar', descripcion: 'Importar chequeras desde Excel' },
    { clave: 'bancos.chequeras.exportar', descripcion: 'Exportar chequeras a Excel' },
    { clave: 'bancos.cheques.ver', descripcion: 'Ver cheques' },
    { clave: 'bancos.cheques.emitir', descripcion: 'Emitir cheques' },
    { clave: 'bancos.cheques.anular', descripcion: 'Anular cheques' },
    { clave: 'bancos.cheques.reclasificar', descripcion: 'Reclasificar el concepto de cheques ya emitidos' },
    { clave: 'bancos.cheques.blanquear', descripcion: 'Blanquear cheques emitidos por error' },
    { clave: 'bancos.cheques-caducos.ver', descripcion: 'Ver el reporte de cheques caducos' },
    { clave: 'bancos.cheques-caducos.exportar', descripcion: 'Exportar el reporte de cheques caducos a Excel' },
    { clave: 'bancos.cheques-caducos.anular', descripcion: 'Anular cheques caducos en lote (crea sus notas inversas)' },
    { clave: 'bancos.conciliaciones.ver', descripcion: 'Ver conciliaciones' },
    { clave: 'bancos.conciliaciones.conciliar', descripcion: 'Marcar documentos y terminar conciliaciones' },
    { clave: 'bancos.conciliaciones.autorizar', descripcion: 'Autorizar o devolver conciliaciones' },
    { clave: 'bancos.conciliaciones.eliminar', descripcion: 'Eliminar conciliaciones' },
    { clave: 'bancos.conceptos.ver', descripcion: 'Ver conceptos' },
    { clave: 'bancos.conceptos.crear', descripcion: 'Registrar conceptos' },
    { clave: 'bancos.conceptos.editar', descripcion: 'Editar, inactivar y reactivar conceptos' },
    { clave: 'bancos.conceptos.eliminar', descripcion: 'Eliminar conceptos' },
    { clave: 'bancos.conceptos.importar', descripcion: 'Importar conceptos desde Excel' },
    { clave: 'bancos.conceptos.exportar', descripcion: 'Exportar conceptos a Excel' },
    { clave: 'bancos.flujo-de-efectivo.ver', descripcion: 'Ver el reporte de flujo de efectivo' },
    { clave: 'bancos.flujo-de-efectivo.exportar', descripcion: 'Exportar el reporte de flujo de efectivo a Excel' },
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
    definirConfiguracion({
      clave: 'bancos.cheques.meses_de_vencimiento',
      descripcion:
        'Meses que debe tener un cheque emitido y sin cobrar para aparecer en el reporte de cheques caducos.',
      esquema: z.number().int().min(MESES_MINIMOS_DE_VENCIMIENTO).max(MESES_MAXIMOS_DE_VENCIMIENTO),
      predeterminado: MESES_DE_VENCIMIENTO_POR_OMISION,
      niveles: ['instalacion', 'empresa'],
      publica: true,
    }),
    definirConfiguracion({
      clave: 'bancos.sugerencias.vida_media_dias',
      descripcion: 'Días tras los cuales un movimiento clasificado pesa la mitad al sugerir el concepto de otro.',
      esquema: z.number().int().min(30).max(1095),
      predeterminado: VIDA_MEDIA_POR_OMISION,
      niveles: ['instalacion', 'empresa'],
      publica: false,
    }),
    definirConfiguracion({
      clave: 'bancos.sugerencias.confianza_minima',
      descripcion: 'Confianza (en %) desde la que un concepto se muestra como sugerido.',
      esquema: z.number().int().min(30).max(95),
      predeterminado: CONFIANZA_MINIMA_POR_OMISION,
      niveles: ['instalacion', 'empresa'],
      publica: false,
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
    rutasDeCorrelativos(),
    rutasDeChequesCaducos(),
    rutasDeConceptos(),
    rutasDeReportesPorConcepto(),
    // generador: rutas
  ]),
};
