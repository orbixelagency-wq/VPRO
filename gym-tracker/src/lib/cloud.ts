// Sincronización opcional con el espacio privado del usuario cuando la app se
// abre como página publicada en claude.ai. Fuera de ese visor (npm run dev,
// GitHub Pages, archivo suelto) todo sigue funcionando solo con localStorage.

type DocSnap = { exists: boolean; data(): Record<string, unknown> | undefined }
type DocRef = { get(): Promise<DocSnap>; set(d: Record<string, unknown>): Promise<void> }
type DB = { doc(path: string): DocRef }
type UserNs = { id(): Promise<string | null> }
type DownloadsNs = { save(r: { filename: string; data: string }): Promise<{ status: string }> }
type ClaudeGlobal = { use(name: string): Promise<unknown> }

const claude = (): ClaudeGlobal | undefined => (window as unknown as { claude?: ClaudeGlobal }).claude

export type Cloud = { doc: (key: string) => DocRef }

/** Resuelve el acceso al almacén privado del usuario, o null si no hay. */
export async function connectCloud(): Promise<Cloud | null> {
  const c = claude()
  if (!c?.use) return null
  try {
    const [db, user] = (await Promise.all([c.use("db"), c.use("user")])) as [DB | null, UserNs | null]
    if (!db || !user) return null
    const id = await user.id()
    if (!id) return null
    return { doc: (key: string) => db.doc(`data/users/${id}/${key}`) }
  } catch {
    return null
  }
}

/** Guarda un archivo: por el visor de claude.ai si existe, si no con un enlace de descarga. */
export async function saveFile(filename: string, data: string): Promise<"saved" | "declined" | "failed"> {
  const c = claude()
  if (c?.use) {
    try {
      const dl = (await c.use("downloads")) as DownloadsNs | null
      if (dl) {
        const r = await dl.save({ filename, data })
        return r.status === "saved" || r.status === "delivered" ? "saved" : "failed"
      }
    } catch (e) {
      return (e as { code?: string })?.code === "declined" ? "declined" : "failed"
    }
  }
  try {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }))
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    return "saved"
  } catch {
    return "failed"
  }
}
