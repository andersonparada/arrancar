import type { DefinicionPermiso } from '../core/modulos-sistema/definicion-modulo.js';

/** Permisos que declara Cuentas por liquidar (PLAN §3.5: uno por acción; todo se anula, nada se elimina). */
export const PERMISOS_DE_CUENTAS_POR_LIQUIDAR: DefinicionPermiso[] = [
  { clave: 'cuentas-por-liquidar.anticipos.ver', descripcion: 'Ver los anticipos, sus gastos y la bandeja' },
  {
    clave: 'cuentas-por-liquidar.anticipos.crear',
    descripcion: 'Entregar anticipos (genera el cheque o la nota en Bancos sin pedir permisos de Bancos)',
  },
  { clave: 'cuentas-por-liquidar.anticipos.anular', descripcion: 'Anular anticipos sin gastos' },
  { clave: 'cuentas-por-liquidar.anticipos.liquidar', descripcion: 'Liquidar anticipos y reabrir los liquidados' },
  {
    clave: 'cuentas-por-liquidar.anticipos.con-vencidos',
    descripcion: 'Entregar un anticipo a quien tiene anticipos vencidos sin liquidar, con motivo',
  },
  {
    clave: 'cuentas-por-liquidar.gastos.crear',
    descripcion: 'Asignar documentos a un anticipo y registrar gastos sin documento',
  },
  { clave: 'cuentas-por-liquidar.gastos.anular', descripcion: 'Quitar gastos de un anticipo abierto' },
  {
    clave: 'cuentas-por-liquidar.gastos.con-retencion',
    descripcion: 'Asignar a un anticipo un documento con retención (excepción), con motivo; queda en la auditoría',
  },
  { clave: 'cuentas-por-liquidar.reportes.ver', descripcion: 'Ver los reportes de cuentas por liquidar' },
  { clave: 'cuentas-por-liquidar.reportes.exportar', descripcion: 'Exportar los reportes de cuentas por liquidar' },
];
