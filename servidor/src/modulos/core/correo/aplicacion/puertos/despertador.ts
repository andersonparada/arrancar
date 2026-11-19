/** Avisa al trabajador de la bandeja que hay correo nuevo, para que no espere al siguiente ciclo. */
export interface Despertador {
  despertar(): void;
}
