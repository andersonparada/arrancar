import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { PropiedadesFiscalesDeProveedor } from '../../../dominio/datos-fiscales-de-proveedor.js';
import { DatosFiscalesInvalidos } from '../../../dominio/errores.js';
import { DatosFiscalesDeProveedorEnMemoria } from '../../../pruebas/dobles-de-datos-fiscales.js';
import { GuardarDatosFiscalesDeProveedor } from './guardar-datos-fiscales-de-proveedor.js';
import { ObtenerDatosFiscalesDeProveedor } from './obtener-datos-fiscales-de-proveedor.js';

const operador = operadorDePrueba();
const proveedorId = crypto.randomUUID();

const datosDeProveedor = (cambios: Partial<PropiedadesFiscalesDeProveedor> = {}): PropiedadesFiscalesDeProveedor => ({
  regimenIva: 'general',
  regimenIsr: 'utilidades',
  esAgenteDeRetencionIva: false,
  seLeRetieneIva: true,
  seLeRetieneIsr: false,
  seLeRetieneIvaPequenoContribuyente: false,
  ...cambios,
});

let unidadDeTrabajo: UnidadDeTrabajoEnMemoria;
let auditoria: AuditoriaEnMemoria;
let proveedores: DatosFiscalesDeProveedorEnMemoria;

beforeEach(() => {
  unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  proveedores = new DatosFiscalesDeProveedorEnMemoria();
  proveedores.existentes.add(proveedorId);
});

describe('guardar los datos fiscales del proveedor', () => {
  const guardar = () => new GuardarDatosFiscalesDeProveedor({ unidadDeTrabajo, repositorio: proveedores, auditoria });

  it('un cambio de régimen queda en la auditoría con lo que valía', async () => {
    const pequeno = datosDeProveedor({
      regimenIva: 'pequeno_contribuyente',
      regimenIsr: null,
      seLeRetieneIva: false,
      seLeRetieneIvaPequenoContribuyente: true,
    });

    await guardar().ejecutar(operador, { proveedorId, datos: pequeno });

    expect(auditoria.entradas).toHaveLength(1);
    expect(auditoria.entradas[0]).toMatchObject({
      recurso: 'libro-de-compras.datos-fiscales-de-proveedor',
      registroId: proveedorId,
      accion: 'corregir',
      anterior: { regimenIva: 'general', seLeRetieneIva: true, guardado: false },
    });
  });

  it('guardar lo que valía por omisión no audita nada', async () => {
    await guardar().ejecutar(operador, { proveedorId, datos: datosDeProveedor() });

    expect(auditoria.entradas).toEqual([]);
    expect(proveedores.filas.has(proveedorId)).toBe(true);
  });

  it('rechaza datos contradictorios sin guardar', async () => {
    const contradictorios = datosDeProveedor({ regimenIva: 'pequeno_contribuyente', regimenIsr: 'utilidades' });

    await expect(guardar().ejecutar(operador, { proveedorId, datos: contradictorios })).rejects.toThrow(
      DatosFiscalesInvalidos,
    );
    expect(proveedores.filas.size).toBe(0);
  });
});

describe('leer los datos fiscales', () => {
  it('un proveedor sin datos guardados devuelve los de omisión; uno que no existe, no se encuentra', async () => {
    const obtener = new ObtenerDatosFiscalesDeProveedor({ unidadDeTrabajo, repositorio: proveedores });

    expect(await obtener.ejecutar(operador, proveedorId)).toEqual({
      proveedorId,
      ...datosDeProveedor(),
      guardado: false,
    });
    await expect(obtener.ejecutar(operador, crypto.randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });
});
