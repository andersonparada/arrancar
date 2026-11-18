/**
 * Mapas de mensajes entre módulos para el mediador (patrón Mediator,
 * `core/mediador`): cada módulo que atiende una orden o escucha un aviso amplía
 * estas interfaces con `declare module`, sin que el core conozca a los módulos
 * (igual que `EventosDominio` en `core/eventos/bus-eventos.ts`).
 *
 * Un archivo por módulo que atiende, por ejemplo `core/contratos/bancos.contratos.ts`:
 *
 * @example
 * declare module './mediador.contratos.js' {
 *   interface OrdenesEntreModulos {
 *     'bancos.emitir_cheque': { datos: EmisionDeCheque; respuesta: ChequeEmitidoDto };
 *   }
 *   interface AvisosEntreModulos {
 *     'bancos.movimiento_de_origen_anulado': { movimientoId: string };
 *   }
 * }
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface OrdenesEntreModulos {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AvisosEntreModulos {}
/**
 * Preguntas que se hacen a todos los módulos a la vez (`mediador.preguntarATodos`): cada módulo activo que tiene algo
 * que decir responde; el que no, responde `null` y se omite.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PreguntasEntreModulos {}

export type NombreDeOrden = keyof OrdenesEntreModulos;
export type NombreDeAviso = keyof AvisosEntreModulos;
export type NombreDePregunta = keyof PreguntasEntreModulos;
