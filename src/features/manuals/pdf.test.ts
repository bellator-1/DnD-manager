import { describe, expect, it } from 'vitest'
import { describeError } from './pdf'

const err = (name: string, message = 'x') => Object.assign(new Error(message), { name })

describe('describeError', () => {
  it('distingue il file non trovato da quello non leggibile', () => {
    expect(describeError(err('NotFoundError')).problem).toBe('notfound')
    expect(describeError(err('NotReadableError')).problem).toBe('locked')
    expect(describeError(err('NotAllowedError')).problem).toBe('denied')
  })
  it('errori del PDF', () => {
    expect(describeError(err('PasswordException')).problem).toBe('password')
    expect(describeError(err('InvalidPDFException')).problem).toBe('invalid')
  })
  it('browser troppo vecchio e errore imprevisto', () => {
    expect(describeError(new TypeError('Promise.withResolvers is not a function')).problem).toBe('oldbrowser')
    expect(describeError(err('Boh', 'qualcosa')).problem).toBe('other')
    expect(describeError('stringa').detail).toContain('stringa')
  })
})
