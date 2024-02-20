import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TestingOverrideExit, initializeCliOptions } from '../src/cli'

describe('initializeCliOptions', () => {
  let originalArgv: string[]

  beforeEach(() => {
    originalArgv = ['node', 'qr-verifier']
    process.argv = originalArgv
  })

  afterEach(() => {
    process.argv = originalArgv
  })

  it('should return default options', () => {
    const defaultOptions = {
      dirSource: process.cwd(),
      dirValid: join(process.cwd(), 'scannable'),
      dirInvalid: join(process.cwd(), 'non-scannable'),
      skipConfirm: false,
    }
    const options = initializeCliOptions()
    expect(options).toEqual(defaultOptions)
  })

  it('should throw `TestingOverrideExit` for invalid option', () => {
    process.argv.push('--garbage')
    expect(() => initializeCliOptions(true)).toThrowError(TestingOverrideExit)
  })

  it('should accept custom source directory with --dir-source', () => {
    const customDir = '/custom/dir'
    process.argv.push('--dir-source', customDir)
    const { dirSource } = initializeCliOptions()
    expect(dirSource).toBe(customDir)
  })

  it('should accept custom valid directory with --dir-valid', () => {
    const customDir = '/custom/dir'
    process.argv.push('--dir-valid', customDir)
    const { dirValid } = initializeCliOptions()
    expect(dirValid).toBe(customDir)
  })

  it('should accept custom invalid directory with --dir-invalid', () => {
    const customDir = '/custom/dir'
    process.argv.push('--dir-invalid', customDir)
    const { dirInvalid } = initializeCliOptions()
    expect(dirInvalid).toBe(customDir)
  })

  describe('mode', () => {
    it('should accept mode \'move\'', () => {
      const modeOption = 'move'
      process.argv.push('--mode', modeOption)
      const { mode } = initializeCliOptions()
      expect(mode).toBe(modeOption)
    })

    it('should accept mode \'copy\'', () => {
      const modeOption = 'copy'
      process.argv.push('--mode', modeOption)
      const { mode } = initializeCliOptions()
      expect(mode).toBe(modeOption)
    })

    it('should accept mode \'none\'', () => {
      process.argv.push('--mode', 'none')
      const { mode } = initializeCliOptions()
      expect(mode).toBe('none')
    })

    it('should accept mode \'move-valid\'', () => {
      process.argv.push('--mode', 'move-valid')
      const { mode } = initializeCliOptions()
      expect(mode).toBe('move-valid')
    })

    it('should accept mode \'move-invalid\'', () => {
      process.argv.push('--mode', 'move-invalid')
      const { mode } = initializeCliOptions()
      expect(mode).toBe('move-invalid')
    })

    it('should throw an error for invalid mode', () => {
      process.argv.push('--mode', 'invalid')
      expect(() => initializeCliOptions(true)).toThrowError(
        TestingOverrideExit,
      )
    })
  })

  describe('tolerance', () => {
    it('should accept tolerance \'none\'', () => {
      process.argv.push('--tolerance', 'none')
      const { tolerance } = initializeCliOptions()
      expect(tolerance).toBe('none')
    })

    it('should accept tolerance \'high\'', () => {
      process.argv.push('--tolerance', 'high')
      const { tolerance } = initializeCliOptions()
      expect(tolerance).toBe('high')
    })

    it('should accept tolerance \'medium\'', () => {
      process.argv.push('--tolerance', 'medium')
      const { tolerance } = initializeCliOptions()
      expect(tolerance).toBe('medium')
    })

    it('should throw `TestingOverrideExit` for invalid tolerance', () => {
      process.argv.push('--tolerance', 'invalid')
      expect(() => initializeCliOptions(true)).toThrowError(
        TestingOverrideExit,
      )
    })
  })

  it('should accept --skip-confirm', () => {
    process.argv.push('--skip-confirm')
    const { skipConfirm } = initializeCliOptions()
    expect(skipConfirm).toBe(true)
  })
})
