// backend/tests/storage/LocalStorageAdapter.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { LocalStorageAdapter } from '../../src/infrastructure/storage/LocalStorageAdapter'

const TEST_BASE = '/tmp/teststool-test-uploads'

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter

  beforeEach(() => {
    mkdirSync(TEST_BASE, { recursive: true })
    adapter = new LocalStorageAdapter(TEST_BASE)
  })

  afterEach(() => {
    rmSync(TEST_BASE, { recursive: true, force: true })
  })

  it('saves a file and returns the relative path', async () => {
    const buf = Buffer.from('hello world')
    const path = await adapter.save('projects/1/bugs/1/test.txt', buf, 'text/plain')
    expect(path).toBe('projects/1/bugs/1/test.txt')
    expect(existsSync(join(TEST_BASE, path))).toBe(true)
  })

  it('deletes a saved file', async () => {
    const buf = Buffer.from('hello')
    const path = await adapter.save('projects/1/test.txt', buf, 'text/plain')
    await adapter.delete(path)
    expect(existsSync(join(TEST_BASE, path))).toBe(false)
  })

  it('getUrl returns the relative path (served via API)', async () => {
    const url = await adapter.getUrl('projects/1/test.txt')
    expect(url).toBe('projects/1/test.txt')
  })
})
