// Opens and saves Simbooks on the user's computer. Chrome and Edge open and save the same file in
// place (File System Access API); other browsers pick a file to open and download a copy to save.
// Nothing goes to a server.
import { SIMBOOK_EXTENSION } from './simbook'

// Minimal typings: the File System Access API is not in TypeScript's DOM library.
interface WritableFile {
  write(data: string): Promise<void>
  close(): Promise<void>
}
export interface SimbookHandle {
  name: string
  getFile(): Promise<File>
  createWritable(): Promise<WritableFile>
}
interface PickerOptions {
  suggestedName?: string
  types: { description: string; accept: Record<string, string[]> }[]
  excludeAcceptAllOption?: boolean
}
interface PickerWindow {
  showOpenFilePicker?: (options: PickerOptions) => Promise<SimbookHandle[]>
  showSaveFilePicker?: (options: PickerOptions) => Promise<SimbookHandle>
}

const picker = window as unknown as PickerWindow
const TYPES = [{ description: 'Simbook de BusLab', accept: { 'application/json': [SIMBOOK_EXTENSION] } }]

/** True where the file can be saved back in place. */
export const canSaveInPlace = typeof picker.showSaveFilePicker === 'function'

export interface OpenedSimbook {
  name: string
  text: string
  /** Missing where the browser cannot save in place. */
  handle?: SimbookHandle
}

/** Null when the user cancels. */
export async function openSimbookFile(): Promise<OpenedSimbook | null> {
  if (picker.showOpenFilePicker) {
    try {
      const [handle] = await picker.showOpenFilePicker({ types: TYPES })
      const file = await handle.getFile()
      return { name: file.name, text: await file.text(), handle }
    } catch (error) {
      if (isCancel(error)) return null
      throw error
    }
  }
  const file = await pickWithInput()
  return file ? { name: file.name, text: await file.text() } : null
}

/**
 * Writes to the handle when there is one, otherwise asks where to save (or downloads). Returns where
 * it was saved, or null when the user cancels.
 */
export async function saveSimbookFile(
  text: string,
  name: string,
  handle?: SimbookHandle,
): Promise<{ name: string; handle?: SimbookHandle } | null> {
  if (!handle && picker.showSaveFilePicker) {
    try {
      handle = await picker.showSaveFilePicker({ suggestedName: withExtension(name), types: TYPES })
    } catch (error) {
      if (isCancel(error)) return null
      throw error
    }
  }
  if (handle) {
    const writable = await handle.createWritable()
    await writable.write(text)
    await writable.close()
    return { name: handle.name, handle }
  }
  download(text, withExtension(name))
  return { name: withExtension(name) }
}

export function withExtension(name: string) {
  return name.toLowerCase().endsWith(SIMBOOK_EXTENSION) ? name : `${name}${SIMBOOK_EXTENSION}`
}

const isCancel = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

function pickWithInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = SIMBOOK_EXTENSION
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
