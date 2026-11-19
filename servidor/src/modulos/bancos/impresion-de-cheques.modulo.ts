import { z } from 'zod';
import {
  definirConfiguracion,
  type DefinicionConfiguracion,
  type DefinicionPermiso,
} from '../core/modulos-sistema/definicion-modulo.js';

/** Los permisos de la impresión de cheques y su comprobante de egreso (`docs/modulos/diseno-impresion-de-cheques.md` §7). */
export const permisosDeImpresionDeCheques: readonly DefinicionPermiso[] = [
  { clave: 'bancos.formatos-de-cheque.ver', descripcion: 'Ver formatos de cheque e imprimir la prueba de alineación' },
  { clave: 'bancos.formatos-de-cheque.crear', descripcion: 'Crear formatos de cheque' },
  {
    clave: 'bancos.formatos-de-cheque.editar',
    descripcion: 'Editar, inactivar, reactivar y marcar como probados los formatos de cheque',
  },
  { clave: 'bancos.formatos-de-cheque.eliminar', descripcion: 'Eliminar formatos de cheque que ninguna chequera usa' },
  { clave: 'bancos.cheques.imprimir', descripcion: 'Imprimir cheques por primera vez, también en lote' },
  { clave: 'bancos.cheques.reimprimir', descripcion: 'Reimprimir cheques o su comprobante de egreso con un motivo' },
  { clave: 'bancos.correlativos-de-cheques.ver', descripcion: 'Ver e imprimir el reporte de correlativos de cheques' },
  {
    clave: 'bancos.correlativos-de-cheques.exportar',
    descripcion: 'Exportar el reporte de correlativos de cheques a Excel',
  },
];

/** El lugar que encabeza la fecha impresa del cheque. */
export const configuracionDeImpresionDeCheques: readonly DefinicionConfiguracion[] = [
  definirConfiguracion({
    clave: 'bancos.cheques.lugar_de_emision',
    descripcion: 'Lugar que se imprime antes de la fecha del cheque (por ejemplo, «Guatemala»).',
    esquema: z.string().trim().min(1).max(60),
    predeterminado: 'Guatemala',
    niveles: ['instalacion', 'empresa'],
    publica: true,
  }),
];
