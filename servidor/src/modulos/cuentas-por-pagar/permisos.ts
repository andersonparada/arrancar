import type { DefinicionPermiso } from '../core/modulos-sistema/definicion-modulo.js';

/** Permisos que declara Cuentas por pagar (PLAN §3.5: uno por acción). */
export const PERMISOS_DE_CUENTAS_POR_PAGAR: DefinicionPermiso[] = [
  { clave: 'cuentas-por-pagar.documentos.ver', descripcion: 'Ver la bandeja, los documentos por pagar y sus saldos' },
  {
    clave: 'cuentas-por-pagar.documentos.registrar',
    descripcion: 'Completar los documentos de la bandeja y cambiar su vencimiento',
  },
  { clave: 'cuentas-por-pagar.documentos.autorizar', descripcion: 'Autorizar documentos por pagar' },
  {
    clave: 'cuentas-por-pagar.documentos.autorizar-propios',
    descripcion: 'Autorizar documentos que uno mismo ingresó o completó (excepción a la separación de funciones)',
  },
  {
    clave: 'cuentas-por-pagar.documentos.anular',
    descripcion: 'Anular documentos por pagar (anula también su registro en el libro de compras)',
  },
  {
    clave: 'cuentas-por-pagar.documentos.eliminar',
    descripcion: 'Eliminar documentos por pagar que no están autorizados (también en el libro de compras)',
  },
  {
    clave: 'cuentas-por-pagar.documentos.aplicar-notas',
    descripcion:
      'Aplicar el saldo a favor de una nota de crédito a otros documentos del proveedor y quitar esas aplicaciones',
  },
  {
    clave: 'cuentas-por-pagar.ajustes.crear',
    descripcion: 'Ajustar el saldo a favor de una nota de crédito (darlo de baja o trasladarlo a otra cuenta)',
  },
  {
    clave: 'cuentas-por-pagar.ajustes.anular',
    descripcion: 'Anular un ajuste del saldo a favor de una nota de crédito',
  },
  { clave: 'cuentas-por-pagar.saldos-iniciales.ver', descripcion: 'Ver los saldos iniciales cargados' },
  {
    clave: 'cuentas-por-pagar.saldos-iniciales.crear',
    descripcion: 'Cargar saldos iniciales (documentos del sistema anterior que seguían pendientes)',
  },
  {
    clave: 'cuentas-por-pagar.saldos-iniciales.editar',
    descripcion: 'Corregir saldos iniciales mientras la carga inicial esté abierta',
  },
  {
    clave: 'cuentas-por-pagar.saldos-iniciales.eliminar',
    descripcion: 'Eliminar saldos iniciales mientras la carga inicial esté abierta',
  },
  {
    clave: 'cuentas-por-pagar.saldos-iniciales.importar',
    descripcion: 'Importar saldos iniciales desde Excel (también bajar la plantilla)',
  },
  {
    clave: 'cuentas-por-pagar.saldos-iniciales.exportar',
    descripcion: 'Exportar la lista de saldos iniciales y su cuadre',
  },
  {
    clave: 'cuentas-por-pagar.contrasenas.ver',
    descripcion: 'Ver las contraseñas de pago y los documentos que se pueden meter en una',
  },
  {
    clave: 'cuentas-por-pagar.contrasenas.crear',
    descripcion: 'Crear contraseñas de pago con los documentos de un proveedor',
  },
  {
    clave: 'cuentas-por-pagar.contrasenas.editar',
    descripcion: 'Cambiar la fecha prometida, las observaciones y los documentos de una contraseña de pago',
  },
  {
    clave: 'cuentas-por-pagar.contrasenas.anular',
    descripcion: 'Anular contraseñas de pago (sus documentos quedan libres para otra contraseña)',
  },
  {
    clave: 'cuentas-por-pagar.pagos.ver',
    descripcion: 'Ver los proveedores por pagar, los medios de pago y lo que se puede pagar de cada proveedor',
  },
  {
    clave: 'cuentas-por-pagar.pagos.emitir',
    descripcion: 'Pagar a un proveedor con cheque o con nota de débito (crea el movimiento en Bancos)',
  },
  {
    clave: 'cuentas-por-pagar.reportes-de-saldos.ver',
    descripcion:
      'Ver e imprimir los reportes de saldos: por proveedor y antigüedad, documentos a una fecha, estado de cuenta, saldos a favor y contraseñas por pagar',
  },
  {
    clave: 'cuentas-por-pagar.reportes-de-saldos.exportar',
    descripcion: 'Exportar a Excel los reportes de saldos de proveedores',
  },
  {
    clave: 'cuentas-por-pagar.pagos.enviar-aviso',
    descripcion: 'Enviar y reenviar por correo el aviso de un pago al proveedor, y cancelar uno pendiente',
  },
  {
    clave: 'cuentas-por-pagar.avisos-de-pago.configurar',
    descripcion:
      'Cambiar los avisos de pago por correo de la empresa: si salen solos o con el botón, el asunto, el mensaje, el comprobante adjunto y la copia a la empresa',
  },
  {
    clave: 'cuentas-por-pagar.pagos.reaplicar',
    descripcion: 'Reaplicar un pago vigente a otros documentos de las contraseñas vigentes de su proveedor',
  },
  {
    clave: 'cuentas-por-pagar.pagos.anular',
    descripcion: 'Anular un pago (anula también su cheque o su nota en Bancos y sus diferencias de centavos)',
  },
  {
    clave: 'cuentas-por-pagar.pagos.ligar-notas-de-debito',
    descripcion: 'Pagar con una nota de débito ya registrada en Bancos y marcada para Cuentas por pagar',
  },
  {
    clave: 'cuentas-por-pagar.pagos.ligar-cheques-de-apertura',
    descripcion: 'Ligar un cheque posfechado de Bancos a un proveedor como pago de sus documentos',
  },
  {
    clave: 'cuentas-por-pagar.pagos.desligar-cheques-de-apertura',
    descripcion:
      'Desligar un cheque posfechado de su pago (el pago se anula y los documentos vuelven a quedar pendientes)',
  },
  {
    clave: 'cuentas-por-pagar.pagos.aplicar-a-apertura',
    descripcion:
      'Aplicar saldos iniciales a la cuenta de apertura (dar por pagado lo que ya se había pagado antes de la fecha de inicio)',
  },
  {
    clave: 'cuentas-por-pagar.retiros.ver',
    descripcion:
      'Ver los retiros de efectivo para pagos, lo que queda de cada uno y los retiros por liquidar a una fecha',
  },
  {
    clave: 'cuentas-por-pagar.retiros.crear',
    descripcion: 'Registrar un retiro de efectivo para pagos (crea el cheque o la nota de débito en Bancos)',
  },
  {
    clave: 'cuentas-por-pagar.retiros.liquidar',
    descripcion: 'Liquidar un retiro de efectivo (depositar lo que sobró o declarar el faltante) y reabrirlo',
  },
  {
    clave: 'cuentas-por-pagar.retiros.anular',
    descripcion: 'Anular un retiro de efectivo que no tiene pagos (anula también su cheque o su nota en Bancos)',
  },
  {
    clave: 'cuentas-por-pagar.reportes-de-pagos.ver',
    descripcion:
      'Ver e imprimir los reportes de pagos: pagos realizados, cheques posfechados, retiros de efectivo por liquidar y notas de débito sin aplicar',
  },
  {
    clave: 'cuentas-por-pagar.reportes-de-pagos.exportar',
    descripcion: 'Exportar a Excel los reportes de pagos',
  },
  {
    clave: 'cuentas-por-pagar.reportes-de-control.ver',
    descripcion:
      'Ver e imprimir los reportes de control: ajustes del mes y pagos en efectivo sobre el umbral de bancarización (para el contador)',
  },
  {
    clave: 'cuentas-por-pagar.reportes-de-control.exportar',
    descripcion: 'Exportar a Excel los reportes de control',
  },
  {
    clave: 'cuentas-por-pagar.pagos.pagar-en-efectivo',
    descripcion: 'Repartir el efectivo de un retiro entre uno o varios proveedores (un pago y un recibo por proveedor)',
  },
  {
    clave: 'cuentas-por-pagar.pagos.efectivo-sin-bancarizar',
    descripcion:
      'Pagar en efectivo sobre el umbral de bancarización cuando la empresa pierde costo o crédito fiscal, con un motivo',
  },
  {
    clave: 'cuentas-por-pagar.reintegros.crear',
    descripcion:
      'Registrar un reintegro del proveedor: el saldo a favor de sus notas de crédito devuelto por depósito o en efectivo',
  },
  {
    clave: 'cuentas-por-pagar.reintegros.anular',
    descripcion: 'Anular un reintegro del proveedor (anula también su nota de crédito en Bancos)',
  },
  {
    clave: 'cuentas-por-pagar.condiciones.importar',
    descripcion: 'Importar desde Excel los plazos de crédito de los proveedores (también bajar la plantilla)',
  },
  {
    clave: 'cuentas-por-pagar.condiciones.exportar',
    descripcion: 'Exportar a Excel los plazos de crédito de los proveedores',
  },
  // generador: permisos
];
