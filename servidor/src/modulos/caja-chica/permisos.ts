import type { DefinicionPermiso } from '../core/modulos-sistema/definicion-modulo.js';

/** Permisos que declara Caja chica (PLAN §3.5: uno por acción; todo se anula, nada se elimina). */
export const PERMISOS_DE_CAJA_CHICA: DefinicionPermiso[] = [
  {
    clave: 'caja-chica.fondos.ver',
    descripcion: 'Ver los fondos que se le asignaron, su bandeja, comprobantes, reposiciones, arqueos y vales',
  },
  { clave: 'caja-chica.fondos.ver-todos', descripcion: 'Ver y usar todos los fondos de la empresa' },
  { clave: 'caja-chica.fondos.asignar', descripcion: 'Dar y quitar a los usuarios el acceso a los fondos' },
  {
    clave: 'caja-chica.fondos.crear',
    descripcion: 'Abrir un fondo (genera el cheque o la nota en Bancos sin pedir permisos de Bancos)',
  },
  {
    clave: 'caja-chica.fondos.editar',
    descripcion: 'Editar el nombre, la localidad, el tope y la cuenta; cambiar el custodio',
  },
  { clave: 'caja-chica.fondos.cambiar-monto', descripcion: 'Aumentar y disminuir el monto del fondo' },
  { clave: 'caja-chica.fondos.cerrar', descripcion: 'Cerrar un fondo y anular una apertura sin uso' },
  {
    clave: 'caja-chica.fondos.cerrar-con-documentos-por-resolver',
    descripcion: 'Cerrar un fondo que aún tiene documentos anulados por su emisor sin resolver (con motivo)',
  },
  {
    clave: 'caja-chica.comprobantes.crear',
    descripcion: 'Asignar documentos a un fondo, devolverlos a la bandeja y registrar vales de gasto',
  },
  { clave: 'caja-chica.comprobantes.anular', descripcion: 'Anular vales de gasto' },
  {
    clave: 'caja-chica.comprobantes.resolver',
    descripcion:
      'Resolver un documento anulado por su emisor: reemplazo, devolución, cobro, sin recuperación y su disputa',
  },
  {
    clave: 'caja-chica.comprobantes.sobre-el-tope',
    descripcion: 'Asignar o registrar un comprobante que pasa del tope, con motivo',
  },
  {
    clave: 'caja-chica.comprobantes.con-retencion',
    descripcion: 'Asignar a un fondo un documento con retención (excepción), con motivo; queda en la auditoría',
  },
  { clave: 'caja-chica.vales.crear', descripcion: 'Entregar vales provisionales' },
  {
    clave: 'caja-chica.vales.liquidar',
    descripcion: 'Liquidar vales provisionales (asigna sus documentos y registra sus vales de gasto)',
  },
  { clave: 'caja-chica.vales.anular', descripcion: 'Anular vales provisionales' },
  { clave: 'caja-chica.reposiciones.crear', descripcion: 'Reponer el fondo (genera el cheque o la nota en Bancos)' },
  { clave: 'caja-chica.reposiciones.anular', descripcion: 'Anular reposiciones' },
  { clave: 'caja-chica.arqueos.crear', descripcion: 'Registrar arqueos' },
  { clave: 'caja-chica.arqueos.anular', descripcion: 'Anular arqueos' },
  { clave: 'caja-chica.reportes.ver', descripcion: 'Ver los reportes de caja chica' },
  { clave: 'caja-chica.reportes.exportar', descripcion: 'Exportar los reportes de caja chica' },
];
