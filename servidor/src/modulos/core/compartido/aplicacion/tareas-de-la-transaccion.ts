/**
 * Trabajo que depende de cómo termine la unidad de trabajo en curso: lo que toca el disco o el exterior no se
 * puede deshacer con la transacción, así que se ata a su resultado.
 */
export interface TareasDeLaTransaccion {
  /**
   * Corre cuando la transacción más externa se confirma; si se deshace, se descarta. Sin transacción en curso
   * corre de inmediato.
   */
  despuesDeConfirmar(tarea: () => Promise<void>): Promise<void>;
  /**
   * Corre si la transacción más externa se deshace (error del caso de uso o del `commit`); si se confirma, se
   * descarta. Sin transacción en curso no hay nada que deshacer y no corre.
   */
  siSeDeshace(tarea: () => Promise<void>): void;
}
