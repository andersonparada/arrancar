/** El color y el signo con que se distinguen los créditos, débitos y cheques en pantalla. */
export const CLASE_DE_TIPO: Record<'credito' | 'debito' | 'cheque', string> = {
  credito: 'text-campo-700 dark:text-campo-400',
  debito: 'text-red-700 dark:text-red-400',
  cheque: 'text-red-700 dark:text-red-400',
};

export const SIGNO_DE_TIPO: Record<'credito' | 'debito' | 'cheque', string> = {
  credito: '+',
  debito: '−',
  cheque: '−',
};
