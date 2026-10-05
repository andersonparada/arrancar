import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import type { PropiedadesFiscalesDeEmpresa } from '../../../dominio/datos-fiscales-de-empresa.js';
import type { PropiedadesFiscalesDeProveedor } from '../../../dominio/datos-fiscales-de-proveedor.js';
import { DatosFiscalesInvalidos } from '../../../dominio/errores.js';
import {
  AccesoAEmpresasEnMemoria,
  DatosFiscalesDeEmpresaEnMemoria,
  DatosFiscalesDeProveedorEnMemoria,
} from '../../../pruebas/dobles-de-datos-fiscales.js';
import { GuardarDatosFiscalesDeEmpresa } from './guardar-datos-fiscales-de-empresa.js';
import { GuardarDatosFiscalesDeProveedor } from './guardar-datos-fiscales-de-proveedor.js';
import { ObtenerDatosFiscalesDeEmpresa } from './obtener-datos-fiscales-de-empresa.js';
import { ObtenerDatosFiscalesDeProveedor } from './obtener-datos-fiscales-de-proveedor.js';

const operador = operadorDePrueba();
const empresaId = operador.empresaId;
const proveedorId = crypto.randomUUID();

const datosDeEmpresa = (cambios: Partial<PropiedadesFiscalesDeEmpresa> = {}): PropiedadesFiscalesDeEmpresa => ({
  regimenIva: 'general',
  regimenIsr: 'utilidades',
  agenteDeRetencionIva: 'ninguno',
  esAgenteDeRetencionIsr: true,
  ...cambios,
});

const datosDeProveedor = (cambios: Partial<PropiedadesFiscalesDeProveedor> = {}): PropiedadesFiscalesDeProveedor => ({
  esPequenoContribuyente: false,
  regimenIsr: 'utilidades',
  esAgenteDeRetencionIva: false,
  seLeRetieneIva: true,
  seLeRetieneIsr: false,
  seLeRetieneIvaPequenoContribuyente: false,
  ...cambios,
});

let unidadDeTrabajo: UnidadDeTrabajoEnMemoria;
let auditoria: AuditoriaEnMemoria;
let empresas: DatosFiscalesDeEmpresaEnMemoria;
let proveedores: DatosFiscalesDeProveedorEnMemoria;

beforeEach(() => {
  unidadDeTrabajo = new UnidadDeTrabajoEnMemoria();
  auditoria = new AuditoriaEnMemoria();
  empresas = new DatosFiscalesDeEmpresaEnMemoria();
  proveedores = new DatosFiscalesDeProveedorEnMemoria();
  proveedores.existentes.add(proveedorId);
});

describe('guardar los datos fiscales de la empresa', () => {
  const guardar = () => new GuardarDatosFiscalesDeEmpresa({ unidadDeTrabajo, repositorio: empresas, auditoria });

  it('la primera vez que cambia lo que valía por omisión queda en la auditoría con lo que valía', async () => {
    await guardar().ejecutar(operador, { empresaId, datos: datosDeEmpresa({ agenteDeRetencionIva: 'exportador' }) });

    expect(auditoria.acciones()).toEqual(['libro-de-compras.datos-fiscales-de-empresa:corregir']);
    expect(auditoria.entradas[0]).toMatchObject({
      registroId: empresaId,
      anterior: { agenteDeRetencionIva: 'ninguno', guardado: false },
    });
    expect(empresas.filas.get(empresaId)?.instantanea().agenteDeRetencionIva).toBe('exportador');
  });

  it('guardar lo mismo que valía no audita nada, ni la primera vez', async () => {
    await guardar().ejecutar(operador, { empresaId, datos: datosDeEmpresa() });
    await guardar().ejecutar(operador, { empresaId, datos: datosDeEmpresa() });

    expect(auditoria.entradas).toEqual([]);
    expect(empresas.filas.has(empresaId)).toBe(true);
  });

  it('cada cambio posterior audita cómo estaba antes', async () => {
    await guardar().ejecutar(operador, { empresaId, datos: datosDeEmpresa({ esAgenteDeRetencionIsr: false }) });
    await guardar().ejecutar(operador, { empresaId, datos: datosDeEmpresa({ regimenIsr: 'opcional_simplificado' }) });

    expect(auditoria.entradas[1]).toMatchObject({
      accion: 'corregir',
      anterior: { esAgenteDeRetencionIsr: false, guardado: true },
    });
  });

  it('rechaza datos contradictorios sin guardar ni auditar', async () => {
    const contradictorios = datosDeEmpresa({ regimenIva: 'pequeno_contribuyente', agenteDeRetencionIva: 'otro' });

    await expect(guardar().ejecutar(operador, { empresaId, datos: contradictorios })).rejects.toThrow(
      DatosFiscalesInvalidos,
    );
    expect(empresas.filas.size).toBe(0);
    expect(auditoria.entradas).toEqual([]);
  });
});

describe('guardar los datos fiscales del proveedor', () => {
  const guardar = () => new GuardarDatosFiscalesDeProveedor({ unidadDeTrabajo, repositorio: proveedores, auditoria });

  it('un cambio de régimen queda en la auditoría con lo que valía', async () => {
    const pequeno = datosDeProveedor({
      esPequenoContribuyente: true,
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
      anterior: { esPequenoContribuyente: false, seLeRetieneIva: true, guardado: false },
    });
  });

  it('guardar lo que valía por omisión no audita nada', async () => {
    await guardar().ejecutar(operador, { proveedorId, datos: datosDeProveedor() });

    expect(auditoria.entradas).toEqual([]);
    expect(proveedores.filas.has(proveedorId)).toBe(true);
  });

  it('rechaza datos contradictorios sin guardar', async () => {
    const contradictorios = datosDeProveedor({ esPequenoContribuyente: true, regimenIsr: 'utilidades' });

    await expect(guardar().ejecutar(operador, { proveedorId, datos: contradictorios })).rejects.toThrow(
      DatosFiscalesInvalidos,
    );
    expect(proveedores.filas.size).toBe(0);
  });
});

describe('leer los datos fiscales', () => {
  it('una empresa sin datos guardados devuelve los de omisión, con la empresa pedida como empresa de la transacción', async () => {
    const otraEmpresa = crypto.randomUUID();
    const acceso = new AccesoAEmpresasEnMemoria([otraEmpresa]);

    const datos = await new ObtenerDatosFiscalesDeEmpresa({
      unidadDeTrabajo,
      repositorio: empresas,
      acceso,
    }).ejecutar(operador, otraEmpresa);

    expect(datos).toEqual({ empresaId: otraEmpresa, ...datosDeEmpresa(), guardado: false });
    expect(unidadDeTrabajo.contextos).toEqual([{ ...operador, empresaId: otraEmpresa }]);
  });

  it('una empresa a la que el operador no tiene acceso responde como si no existiera', async () => {
    const obtener = new ObtenerDatosFiscalesDeEmpresa({
      unidadDeTrabajo,
      repositorio: empresas,
      acceso: new AccesoAEmpresasEnMemoria([]),
    });

    await expect(obtener.ejecutar(operador, empresaId)).rejects.toThrow(RecursoNoEncontrado);
  });

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
