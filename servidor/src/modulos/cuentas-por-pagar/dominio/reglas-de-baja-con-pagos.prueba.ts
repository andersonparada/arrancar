import { describe, expect, it } from 'vitest';
import type { DocumentoConAplicaciones, DocumentoPorPagar } from './documento-por-pagar.js';
import {
  noTenerPagosVigentes,
  noTenerReintegrosVigentes,
  REGLAS_PARA_ANULAR,
  REGLAS_PARA_DESAUTORIZAR,
  REGLAS_PARA_ELIMINAR,
} from './reglas-de-baja.js';

const documento = (cambios: Partial<DocumentoPorPagar> = {}): DocumentoPorPagar => ({
  id: 'doc',
  origen: 'libro_de_compras',
  documentoId: 'libro',
  serie: 'A',
  numero: '100',
  tipo: 'factura',
  proveedorId: 'proveedor',
  documentoAfectadoId: null,
  facturaDelSistemaAnterior: false,
  fechaEmision: '2026-03-10',
  totalCentavos: 11200,
  retencionesCentavos: 0,
  saldoAlInicioCentavos: null,
  retencionesPorPracticarCentavos: null,
  referencia: null,
  tieneActivoFijo: false,
  vencimiento: '2026-04-10',
  ingresadoPor: null,
  estado: 'pendiente',
  registradoEn: null,
  registradoPor: null,
  autorizadoEn: null,
  autorizadoPor: null,
  autorizacionPropia: false,
  ...cambios,
});
const guardado = (cambios: Partial<DocumentoPorPagar> = {}): DocumentoConAplicaciones => ({
  documento: documento(cambios),
  hechas: [],
  recibidas: [],
  ajustes: [],
  contrasenaVigente: null,
  contrasenas: [],
  notasQueLoCorrigen: 0,
  pagos: [],
  reintegros: [],
});

describe('reglas de baja con pagos y reintegros', () => {
  describe('no tener pagos ni reintegros vigentes', () => {
    const pago = (cambios: Partial<DocumentoConAplicaciones['pagos'][number]> = {}) => ({
      pagoId: 'p1',
      numero: 4,
      anioDeNumero: 0,
      forma: 'cheque' as const,
      fecha: '2026-03-15',
      estado: 'vigente' as const,
      contrasenaId: 'c1',
      cargoId: 'doc',
      montoCentavos: 100,
      retencionDescontadaCentavos: 0,
      ...cambios,
    });
    const reintegro = (estado: 'vigente' | 'anulado') => ({
      reintegroId: 'r1',
      numero: 2,
      anioDeNumero: 0,
      forma: 'deposito' as const,
      fecha: '2026-03-15',
      estado,
      notaId: 'doc',
      montoCentavos: 100,
    });

    it('un documento con pagos vigentes se rechaza y el mensaje nombra el pago', () => {
      const conPago = { ...guardado(), pagos: [pago()] };

      expect(() => noTenerPagosVigentes(conPago)).toThrow(expect.objectContaining({ codigo: 'documento_con_pagos' }));
      expect(() => noTenerPagosVigentes(conPago)).toThrow('el pago 4');
    });

    it('con varios pagos los nombra a todos una vez, y el año va en el número', () => {
      const dos = { ...guardado(), pagos: [pago(), pago({ pagoId: 'p2', numero: 7, anioDeNumero: 2026 }), pago()] };

      expect(() => noTenerPagosVigentes(dos)).toThrow('los pagos 4, 2026-7');
    });

    it('los pagos anulados no frenan nada', () => {
      const anulado = { ...guardado(), pagos: [pago({ estado: 'anulado' })] };

      expect(() => noTenerPagosVigentes(anulado)).not.toThrow();
      expect(() => REGLAS_PARA_ANULAR.forEach((regla) => regla(anulado))).not.toThrow();
    });

    it('la lista de eliminar y la de desautorizar rechazan un documento con pagos vigentes', () => {
      const conPago = { ...guardado({ estado: 'registrado' }), pagos: [pago()] };

      expect(() => REGLAS_PARA_ELIMINAR.forEach((regla) => regla(conPago))).toThrow(
        expect.objectContaining({ codigo: 'documento_con_pagos' }),
      );
      expect(() => REGLAS_PARA_DESAUTORIZAR.forEach((regla) => regla(conPago))).toThrow();
    });

    it('con pagos y en una contraseña el mensaje es el del pago, no el de la contraseña', () => {
      const ambos = { ...guardado(), pagos: [pago()], contrasenaVigente: { id: 'c1', numero: 15, anioDeNumero: 0 } };

      expect(() => REGLAS_PARA_ANULAR.forEach((regla) => regla(ambos))).toThrow(
        expect.objectContaining({ codigo: 'documento_con_pagos' }),
      );
    });

    it('una nota con reintegros vigentes no se anula ni se elimina; con los anulados sí', () => {
      const vigente = { ...guardado({ tipo: 'nota_de_credito' }), reintegros: [reintegro('vigente')] };
      const anulado = { ...guardado({ tipo: 'nota_de_credito' }), reintegros: [reintegro('anulado')] };

      expect(() => noTenerReintegrosVigentes(vigente)).toThrow(
        expect.objectContaining({ codigo: 'nota_con_reintegros' }),
      );
      expect(() => noTenerReintegrosVigentes(anulado)).not.toThrow();
    });
  });
});
