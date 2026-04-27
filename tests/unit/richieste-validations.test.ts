import { describe, it, expect } from 'vitest'
import { validateLeadTime, validateStatoTransition } from '@/lib/richieste/validations'

describe('validateLeadTime', () => {
  it('ferie: rifiuta se data_inizio < 7gg', () => {
    const domani = new Date()
    domani.setDate(domani.getDate() + 1)
    expect(validateLeadTime('ferie', domani.toISOString().slice(0, 10))).not.toBeNull()
  })
  it('ferie: accetta se data_inizio >= 7gg', () => {
    const traOtto = new Date()
    traOtto.setDate(traOtto.getDate() + 8)
    expect(validateLeadTime('ferie', traOtto.toISOString().slice(0, 10))).toBeNull()
  })
  it('permesso: rifiuta se data_inizio < 24h', () => {
    const traUnOra = new Date()
    traUnOra.setHours(traUnOra.getHours() + 1)
    expect(validateLeadTime('permesso', traUnOra.toISOString().slice(0, 10))).not.toBeNull()
  })
  it('malattia: sempre accettata', () => {
    expect(validateLeadTime('malattia', new Date().toISOString().slice(0, 10))).toBeNull()
  })
  it('cambio_turno: rifiuta se < 48h', () => {
    const domani = new Date()
    domani.setDate(domani.getDate() + 1)
    expect(validateLeadTime('cambio_turno', domani.toISOString().slice(0, 10))).not.toBeNull()
  })
})

describe('validateStatoTransition', () => {
  it('dipendente può annullare solo da pending', () => {
    expect(validateStatoTransition('pending', 'annullata', 'dipendente')).toBeNull()
    expect(validateStatoTransition('approvata_manager', 'annullata', 'dipendente')).not.toBeNull()
  })
  it('manager può approvare da pending', () => {
    expect(validateStatoTransition('pending', 'approvata_manager', 'manager')).toBeNull()
  })
  it('manager non può convalidare (solo admin)', () => {
    expect(validateStatoTransition('approvata_manager', 'approvata', 'manager')).not.toBeNull()
  })
  it('admin può bypassare a approvata da pending', () => {
    expect(validateStatoTransition('pending', 'approvata', 'admin')).toBeNull()
  })
  it('admin può convalidare da approvata_manager', () => {
    expect(validateStatoTransition('approvata_manager', 'approvata', 'admin')).toBeNull()
  })
  it('nessuno può tornare da rifiutata', () => {
    expect(validateStatoTransition('rifiutata', 'pending', 'admin')).not.toBeNull()
  })
})
