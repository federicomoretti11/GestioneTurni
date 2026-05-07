'use client'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface Categoria {
  id: string
  nome: string
  ordine: number
}

interface Documento {
  id: string
  nome: string
  mime_type: string
  dimensione_bytes: number
  created_at: string
}

function iconaFile(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  return '📁'
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentiPage() {
  const [categorie, setCategorie] = useState<Categoria[]>([])
  const [categoriaAttiva, setCategoriaAttiva] = useState<string | null>(null)
  const [documenti, setDocumenti] = useState<Documento[]>([])
  const [nuovaCategoria, setNuovaCategoria] = useState('')
  const [addingCategoria, setAddingCategoria] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [erroreUpload, setErroreUpload] = useState('')
  const [rinominando, setRinominando] = useState<string | null>(null)
  const [nuovoNome, setNuovoNome] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function caricaCategorie() {
    const res = await fetch('/api/admin/categorie-documenti')
    if (res.ok) {
      const data: Categoria[] = await res.json()
      setCategorie(data)
      if (data.length > 0 && !categoriaAttiva) setCategoriaAttiva(data[0].id)
    }
  }

  async function caricaDocumenti(catId: string) {
    const res = await fetch(`/api/admin/documenti?categoria_id=${catId}`)
    if (res.ok) setDocumenti(await res.json())
  }

  useEffect(() => { caricaCategorie() }, [])

  useEffect(() => {
    if (categoriaAttiva) caricaDocumenti(categoriaAttiva)
    else setDocumenti([])
  }, [categoriaAttiva])

  async function creaCategoria(e: React.FormEvent) {
    e.preventDefault()
    if (!nuovaCategoria.trim()) return
    const res = await fetch('/api/admin/categorie-documenti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nuovaCategoria.trim() }),
    })
    if (res.ok) {
      const cat: Categoria = await res.json()
      setNuovaCategoria('')
      setAddingCategoria(false)
      await caricaCategorie()
      setCategoriaAttiva(cat.id)
    }
  }

  async function eliminaCategoria(cat: Categoria) {
    if (!confirm(`Eliminare la categoria "${cat.nome}"?`)) return
    const res = await fetch(`/api/admin/categorie-documenti/${cat.id}`, { method: 'DELETE' })
    if (res.status === 409) {
      alert('Impossibile eliminare: la categoria contiene documenti.')
      return
    }
    if (res.ok) {
      if (categoriaAttiva === cat.id) setCategoriaAttiva(null)
      await caricaCategorie()
    }
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !categoriaAttiva) return
    setUploading(true)
    setErroreUpload('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('categoria_id', categoriaAttiva)
    const res = await fetch('/api/admin/documenti', { method: 'POST', body: fd })
    if (res.ok) {
      await caricaDocumenti(categoriaAttiva)
    } else {
      const d = await res.json()
      setErroreUpload(d.error ?? 'Errore durante il caricamento')
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function eliminaDocumento(doc: Documento) {
    if (!confirm(`Eliminare "${doc.nome}"?`)) return
    const res = await fetch(`/api/admin/documenti/${doc.id}`, { method: 'DELETE' })
    if (res.ok && categoriaAttiva) await caricaDocumenti(categoriaAttiva)
  }

  async function rinominaDocumento(doc: Documento) {
    if (!nuovoNome.trim() || nuovoNome.trim() === doc.nome) { setRinominando(null); return }
    await fetch(`/api/admin/documenti/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: nuovoNome.trim() }),
    })
    setRinominando(null)
    if (categoriaAttiva) await caricaDocumenti(categoriaAttiva)
  }

  async function apriUrl(docId: string, tipo: 'preview' | 'download') {
    const res = await fetch(`/api/admin/documenti/${docId}/url`)
    if (!res.ok) return
    const { preview_url, download_url } = await res.json()
    const url = tipo === 'preview' ? preview_url : download_url
    if (url) window.open(url, '_blank')
  }

  const nomeCategAttiva = categorie.find(c => c.id === categoriaAttiva)?.nome

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Archivio documenti</h1>

      {/* ── MOBILE: tab strip orizzontale ── */}
      <div className="md:hidden space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1 flex-1 min-w-0 scrollbar-hide">
            {categorie.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoriaAttiva(cat.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categoriaAttiva === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {cat.nome}
              </button>
            ))}
          </div>
          <button
            onClick={() => setAddingCategoria(v => !v)}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-lg font-medium"
          >
            +
          </button>
        </div>

        {addingCategoria && (
          <form onSubmit={creaCategoria} className="flex gap-2">
            <input
              autoFocus
              value={nuovaCategoria}
              onChange={e => setNuovaCategoria(e.target.value)}
              placeholder="Nome categoria"
              className="flex-1 border border-slate-900/20 rounded-lg px-2 py-1.5 text-sm"
            />
            <Button type="submit" size="sm">Crea</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setAddingCategoria(false)}>✕</Button>
          </form>
        )}
      </div>

      {/* ── LAYOUT PRINCIPALE ── */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:min-h-[500px]">

        {/* Sidebar categorie — solo desktop */}
        <div className="hidden md:block w-52 shrink-0 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Categorie</p>
          {categorie.map(cat => (
            <div
              key={cat.id}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer text-sm transition-colors ${
                categoriaAttiva === cat.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              onClick={() => setCategoriaAttiva(cat.id)}
            >
              <span className="truncate">{cat.nome}</span>
              <button
                onClick={ev => { ev.stopPropagation(); eliminaCategoria(cat) }}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs ml-1"
              >✕</button>
            </div>
          ))}

          {addingCategoria ? (
            <form onSubmit={creaCategoria} className="pt-1">
              <input
                autoFocus
                value={nuovaCategoria}
                onChange={e => setNuovaCategoria(e.target.value)}
                placeholder="Nome categoria"
                className="w-full border border-slate-900/20 rounded-lg px-2 py-1.5 text-sm mb-1"
              />
              <div className="flex gap-1">
                <Button type="submit" size="sm">Crea</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setAddingCategoria(false)}>✕</Button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAddingCategoria(true)}
              className="w-full text-left text-sm text-slate-400 hover:text-blue-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              + Nuova categoria
            </button>
          )}
        </div>

        {/* Area documenti */}
        <div className="flex-1 bg-white rounded-xl border border-slate-900/20 p-4 md:p-5" style={{ boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
          {!categoriaAttiva ? (
            <p className="text-sm text-slate-400 text-center pt-12">Seleziona una categoria</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700 truncate">{nomeCategAttiva}</p>
                <div className="shrink-0">
                  <input ref={fileRef} type="file" accept="*/*" className="hidden" onChange={uploadFile} />
                  <Button size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? 'Caricamento…' : '+ Carica'}
                  </Button>
                </div>
              </div>

              {erroreUpload && <p className="text-sm text-red-600">{erroreUpload}</p>}

              {documenti.length === 0 ? (
                <p className="text-sm text-slate-400 text-center pt-8">Nessun documento in questa categoria</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {documenti.map(doc => (
                    <div key={doc.id} className="py-3 space-y-2">
                      {/* Riga principale: icona + nome + meta */}
                      <div className="flex items-center gap-3">
                        <span className="text-xl shrink-0">{iconaFile(doc.mime_type)}</span>
                        <div className="flex-1 min-w-0">
                          {rinominando === doc.id ? (
                            <input
                              autoFocus
                              value={nuovoNome}
                              onChange={e => setNuovoNome(e.target.value)}
                              onBlur={() => rinominaDocumento(doc)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') rinominaDocumento(doc)
                                if (e.key === 'Escape') setRinominando(null)
                              }}
                              className="w-full border border-blue-300 rounded px-2 py-0.5 text-sm font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-400"
                            />
                          ) : (
                            <p className="text-sm font-medium text-slate-800 truncate">{doc.nome}</p>
                          )}
                          <p className="text-xs text-slate-400">
                            {formatBytes(doc.dimensione_bytes)} · {new Date(doc.created_at).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                      {/* Azioni — su mobile vanno a capo sotto il nome */}
                      <div className="flex gap-3 pl-8 md:pl-0 md:justify-end">
                        <button onClick={() => apriUrl(doc.id, 'preview')} className="text-xs text-blue-600 hover:underline">Anteprima</button>
                        <button onClick={() => apriUrl(doc.id, 'download')} className="text-xs text-blue-600 hover:underline">Scarica</button>
                        <button onClick={() => { setRinominando(doc.id); setNuovoNome(doc.nome) }} className="text-xs text-slate-500 hover:underline">Rinomina</button>
                        <button onClick={() => eliminaDocumento(doc)} className="text-xs text-red-500 hover:underline">Elimina</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
