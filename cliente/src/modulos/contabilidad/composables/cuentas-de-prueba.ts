import type { Cuenta } from '../servicios/cuentas.api';

/** Una cuenta de prueba con lo mínimo; el nivel sale de su código. */
export function cuentaDePrueba(codigo: string, propias: Partial<Cuenta> = {}): Cuenta {
  const grupos = codigo.split('.');
  return {
    id: `id-${codigo}`,
    codigo,
    nombre: `Cuenta ${codigo}`,
    esDeDetalle: false,
    naturaleza: 'deudora',
    tipo: 'balance',
    rubro: null,
    corriente: false,
    claseDeFlujo: null,
    esMonetaria: false,
    pideTercero: false,
    pideCentroDeCosto: false,
    esDeControl: false,
    tratamientoFiscal: 'no_aplica',
    activo: true,
    padreId: grupos.length > 1 ? `id-${grupos.slice(0, -1).join('.')}` : null,
    padreCodigo: grupos.length > 1 ? grupos.slice(0, -1).join('.') : null,
    nivel: grupos.length,
    monedaCodigo: null,
    ...propias,
  };
}
