export interface Colores {
  principal: string;
  acento: string;
}

export const PALETAS: (Colores & { nombre: string })[] = [
  { nombre: 'Campo', principal: '#1f4d2c', acento: '#e9c46a' },
  { nombre: 'Tierra', principal: '#5b3a24', acento: '#e0a458' },
  { nombre: 'Cielo', principal: '#1e3a5f', acento: '#7cc6fe' },
  { nombre: 'Vino', principal: '#5e1f2e', acento: '#f2c14e' },
  { nombre: 'Grafito', principal: '#2b2d31', acento: '#4ade80' },
  { nombre: 'Arena', principal: '#eadfc8', acento: '#7a4b2a' },
];

/** Por debajo de este contraste el acento casi no se distingue del color principal. */
export const CONTRASTE_MINIMO_DEL_ACENTO = 1.6;
