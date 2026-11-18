/**
 * Los textos de la carga inicial de Bancos, incluidos los que citan artículos de ley: todos viven aquí para
 * cambiarlos sin buscar. Los de ley salen del dictamen de `contador-guatemala`
 * (docs/modulos/dictamen-textos-legales-de-bancos-2026-11-18.md, «Texto para la app»). Las fechas llegan ya
 * formateadas (`formatearFecha`): este archivo no depende de la sesión.
 */

export const TITULO_SALDOS_INICIALES = 'Saldos iniciales';

export const SIN_FECHA_DE_INICIO =
  'Defina la fecha de inicio en Empresas antes de cargar los saldos iniciales: de ella sale la fecha de corte.';

export const CARGA_ABIERTA = 'Carga inicial abierta';
export const CARGA_CERRADA = 'Carga inicial cerrada: solo lectura';
export const AYUDA_DE_CARGA_CERRADA = 'Para corregir un saldo inicial pida que reabran la carga en Empresas.';

export const CUENTA_SIN_SALDO =
  'Sin saldo inicial. Si la cuenta se abrió después de la fecha de inicio, no lleva saldo inicial.';

export const AYUDA_DEL_CUADRE =
  'Saldo en libros al corte = saldo según el estado de cuenta + depósitos en tránsito − cheques en circulación − débitos en tránsito ± errores del banco. Los cheques posfechados no entran: cuentan en su fecha.';

export const AYUDA_DE_BANCOS_Y_SOBREGIROS =
  'Bancos suma las cuentas con saldo positivo al corte y Sobregiros bancarios las de saldo negativo, cada uno por separado: no se compensan.';

export const ETIQUETA_DE_LIBROS_ANTERIORES = 'Saldo de la cuenta contable en los libros anteriores';

export const AYUDA_DE_LIBROS_ANTERIORES =
  'Es solo para comparar con el saldo en libros al corte: no cambia ningún saldo. Es el de la cuenta contable de este banco, no el del estado de cuenta.';

export const AYUDA_DEL_SALDO_DEL_BANCO =
  'El saldo que dice el estado de cuenta del banco a la fecha de corte. Si el banco le cobra a la empresa (sobregiro), escríbalo con signo negativo.';

/** §2.3 y cambio 2: solo cheques entregados. */
export const textoDeChequesEntregados = (corte: string) =>
  `Solo cheques entregados al beneficiario a más tardar el ${corte}. Un cheque firmado que sigue en la oficina no está en circulación: no lo cargue (el pago no se hizo).`;

/** §5.2: notas del banco que aparecen después de cargar. */
export const textoDeNotasDelBancoPosteriores = (corte: string) =>
  `Si después del corte aparece una nota del banco anterior al ${corte} (una comisión o un interés que no se registró), no la registre con su fecha: regístrela con una fecha posterior al corte (la del primer mes) y avise a su contador, que decidirá si es un ajuste del período o la corrección de un error de períodos anteriores. Mientras la carga esté abierta, también puede corregir el saldo inicial.`;

export const AYUDA_DEL_DEPOSITO_EN_TRANSITO =
  'Depósitos que la empresa ya registró y el banco todavía no acredita al corte.';

export const AYUDA_DEL_DEBITO_EN_TRANSITO =
  'Notas de débito que la empresa ya registró y el banco todavía no carga al corte (son raras).';

export const AYUDA_DEL_ERROR_DEL_BANCO =
  'Un cargo o abono equivocado del banco que este corregirá después. Si el banco cargó de más o abonó de menos, suma; al revés, resta.';

/** El posfechado cuenta en su fecha; el 501 dice que el banco puede pagarlo antes. */
export const AYUDA_DEL_POSFECHADO =
  'Cheques entregados antes del corte con fecha posterior. No entran al cuadre: cuentan en su fecha, como cualquier cheque. El banco puede pagarlos antes de su fecha (Código de Comercio, art. 501).';

export const AYUDA_DEL_CONCEPTO_DEL_POSFECHADO =
  'Con este concepto sale en el flujo de efectivo, en la fecha del cheque.';

export const AYUDA_DEL_SALDO_GLOBAL =
  'Este saldo se cargó sin partidas (el saldo «de antes»). Para registrar cheques o depósitos en tránsito, sepárelo en partidas con el saldo del estado de cuenta.';

export const AYUDA_DE_SEPARAR =
  'Escriba el saldo según el estado de cuenta al corte. Si la cuenta ya tiene movimientos anteriores a la fecha de inicio, el servidor lo rechazará y le dirá qué hacer.';

/** Dictamen, art. 508: el banco ya no está obligado a pagar pasados 6 meses. */
export const textoDeChequeAntiguo = (cheque: { numero: number; fecha: string; corte: string; meses: number }) =>
  `El cheque ${cheque.numero} es del ${cheque.fecha}: al ${cheque.corte} tiene ${cheque.meses} meses. Pasados 6 meses de su fecha, el banco ya no está obligado a pagarlo (Código de Comercio, art. 508). Revise si sigue en circulación o si conviene anularlo y reponerlo.`;

export const textoDeDepositoViejo = (deposito: { fecha: string; dias: number }) =>
  `El depósito del ${deposito.fecha} tiene ${deposito.dias} días al corte: un depósito tarda uno o dos días en verse en el banco. Revise que de verdad se haya depositado.`;

export const INSIGNIAS_DE_AVISO = { antiguo: 'Antiguo', deposito_viejo: 'Revisar' } as const;

/** §9.2 y dictamen 408/410: qué pasa al anular y que la deuda sigue. */
export const textoDeAnulacionDeCheque = (corte: string) =>
  `Se registrará una nota de crédito en la fecha que elija (después del ${corte}). El cheque se recibe salvo buen cobro (Código de Comercio, arts. 408 y 410): mientras no se cobre, no paga la deuda. Si todavía se le debe al beneficiario, regístrelo en Cuentas por pagar.`;

export const textoDeAnulacionDeDeposito = (corte: string) =>
  `Se registrará el movimiento inverso (un débito) en la fecha que elija (después del ${corte}). La comisión que cobre el banco por el rechazo no va aquí: es una nota de débito aparte. Si el cliente sigue debiendo ese dinero, regístrelo como cuenta por cobrar.`;

export const textoDeAnulacionDeOtra = (corte: string) =>
  `Se registrará el movimiento inverso en la fecha que elija (después del ${corte}); la partida original queda anulada y en la auditoría.`;

export const AYUDA_DEL_PAGADOR = 'Quién debe ese dinero: el cliente cuyo depósito el banco rechazó.';

export const textoDeEliminarPartida =
  'Se borra de verdad y queda en la auditoría. Si es un cheque, su número queda libre.';

export const textoDeEliminarCabecera = (cantidad: number) =>
  `Se borrará el saldo inicial de esta cuenta con sus ${cantidad} partidas (también los cheques de la carga inicial). No se puede si la cuenta tiene conciliaciones. Queda en la auditoría.`;

export const NOTAS_DE_IMPORTAR_SALDOS = [
  'Primero se crean los saldos de las cuentas (esta hoja) y después sus partidas con «Importar partidas de apertura».',
  'Solo crea el saldo de las cuentas que todavía no lo tienen; para corregir uno use su ficha.',
];

export const notasDeImportarPartidas = (corte: string) => [
  'La cuenta ya debe tener su saldo según el estado de cuenta: cárguelo primero.',
  textoDeChequesEntregados(corte),
  `El cheque posfechado lleva fecha posterior al ${corte} y el concepto con que sale en el flujo de efectivo.`,
];

/** La ayuda de cada grupo de partidas de la ficha. */
export const ayudaDelGrupo = (parte: string, corte: string): string =>
  ({
    cheque_en_circulacion: textoDeChequesEntregados(corte),
    deposito_en_transito: AYUDA_DEL_DEPOSITO_EN_TRANSITO,
    debito_en_transito: AYUDA_DEL_DEBITO_EN_TRANSITO,
    error_del_banco: AYUDA_DEL_ERROR_DEL_BANCO,
    cheque_posfechado: AYUDA_DEL_POSFECHADO,
  })[parte as 'cheque_en_circulacion'] ?? '';

export const AYUDA_DE_CONCILIACIONES =
  'La cuenta ya tiene conciliaciones: para cambiar el saldo del banco o eliminar el saldo inicial, elimine primero esas conciliaciones.';
