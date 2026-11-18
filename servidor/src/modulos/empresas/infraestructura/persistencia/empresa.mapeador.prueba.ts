import { describe, expect, it } from 'vitest';
import { Nit } from '../../../core/compartido/dominio/objetos-valor/nit.js';
import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { Empresa } from '../../dominio/empresa.js';
import { mapeadorDeEmpresa } from './empresa.mapeador.js';

describe('mapeador de empresa', () => {
  it('no manda el momento de creación: lo pone la base, y de él depende la comprobación de empresa nueva', () => {
    const empresa = Empresa.registrar(Identificador.desde(crypto.randomUUID()), {
      nombre: 'Rancho',
      nit: Nit.crear('12345679'),
      direccion: null,
      telefono: null,
      correo: null,
      activa: true,
    });

    const fila = mapeadorDeEmpresa.aFila(empresa);

    expect(fila).not.toHaveProperty('creadoEn');
    expect(fila).not.toHaveProperty('actualizadoEn');
  });
});
