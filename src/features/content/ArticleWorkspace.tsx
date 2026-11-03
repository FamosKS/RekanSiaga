import { z } from 'zod'
import { ArticleImagePicker } from './ArticleImagePicker'
import { uploadArticleCover, articleMediaEnabled } from './articleMedia'
import { useState } from 'react'
import { useDraftState } from '../drafts/useDraftState'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Dialog } from '../../components/ui/Dialog'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { AdminPageHeader } from '../../components/shared/AdminPageHeader'
import { DataTable } from '../../components/shared/DataTable'
import { Panel } from '../../components/shared/PageElements'
import { formatDate } from '../../lib/publicFormatting'
import { Pagination } from '../../components/shared/Pagination'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { articleInputSchema, contentError, publicationStatuses, type ArticleInput, type ArticleRow } from './contracts'
import { articleWritesApproved, archiveRemoteArticle, getAdminArticle, listAdminArticles, saveRemoteArticle, setFeaturedArticle } from './articleAdminService'
import { featuredArticleEnabled } from './contracts'
import { getHomeFeaturedArticle } from './contentService'

const blank: ArticleInput = { title: '', slug: '', summary: '', content: '', source_url: '', publication_status: 'draft' }
export function ArticleWorkspace() {
  const client = useQueryClient()
  const allowed = articleWritesApproved
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)
  const query = useQuery({ queryKey: ['admin-content', 'articles', page, debouncedSearch, status], queryFn: ({ signal }) => listAdminArticles(signal, { page, search: debouncedSearch, status }), retry: false, refetchInterval: 30_000, refetchOnWindowFocus: true })
  const featuredQuery = useQuery({ queryKey: ['public-content', 'featured-article'], queryFn: getHomeFeaturedArticle, enabled: featuredArticleEnabled, retry: false, refetchOnWindowFocus: true, refetchOnReconnect: true })
  const rows = query.data?.rows ?? []
  const [editor, setEditor, clearEditor] = useDraftState('article:editor', false)
  const [existing, setExisting, clearExisting] = useDraftState<ArticleRow | undefined>('article:existing', undefined)
  const [values, setValues, clearValues, hasDraft] = useDraftState<ArticleInput>('article:values', blank)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [removing, setRemoving] = useState<ArticleRow>()
  const [notice, setNotice] = useState('')
  const [reconciling,setReconciling] = useState(false)
  const [image,setImage] = useState<File|null>(null), [uploadProgress,setUploadProgress] = useState<number|null>(null)
  const refresh = async () => {
    await Promise.all([client.invalidateQueries({ queryKey: ['admin-content', 'articles'] }), client.invalidateQueries({ queryKey: ['public-content'] })])
  }
  const save = useMutation({ mutationFn: async (input: ArticleInput) => {
    let current = existing
    if (image) {
      if (!articleMediaEnabled) throw Error('Paket upload artikel belum diaktifkan operator. Teks tetap dapat disimpan tanpa gambar baru.')
      if (!current) { current = await saveRemoteArticle({ ...input, publication_status: 'draft' }); setExisting(current) }
      setUploadProgress(0)
      current = await uploadArticleCover(image,current,setUploadProgress)
      setExisting(current); setImage(null); setValues(previous=>({...previous,cover_image_path:current!.cover_image_path??''}))
      return saveRemoteArticle({ ...input, cover_image_path: undefined },current)
    }
    return saveRemoteArticle(input,current)
  }, onSuccess: async () => {
    clearEditor(); clearExisting(); clearValues(); setImage(null); setUploadProgress(null)
    setNotice('Artikel tersimpan di Supabase dev; respons server telah diterima.')
    await refresh()
  } })
  const remove = useMutation({ mutationFn: async (row: ArticleRow) => archiveRemoteArticle(row), onSuccess: async () => {
    setRemoving(undefined)
    setPage(1)
    setNotice('Pengarsipan artikel dikonfirmasi Supabase dev.')
    await refresh()
  } })
  const feature = useMutation({ mutationFn: ({ row, enabled }: { row: Pick<ArticleRow, 'id' | 'updated_at'> & Partial<Pick<ArticleRow, 'publication_status' | 'published_at'>>; enabled: boolean }) => setFeaturedArticle(row, enabled), onSuccess: async (_result, variables) => {
    setNotice(variables.enabled ? 'Informasi Utama diperbarui di Supabase dev.' : 'Pilihan Informasi Utama dibatalkan di Supabase dev.')
    await refresh()
  } })
  function open(row?: ArticleRow) {
    if (hasDraft) { if (existing?.id === row?.id) { setEditor(true); return }; if (!window.confirm('Ganti draf artikel yang sedang diedit?')) return }
    setExisting(row)
    setValues(row ? { title: row.title, slug: row.slug, summary: row.summary ?? '', content: row.content, source_url: row.source_url ?? '', publication_status: row.publication_status, cover_image_path: row.cover_image_path?.startsWith('https://') || row.cover_image_path?.startsWith('article-media/') ? row.cover_image_path : undefined } : blank)
    setFieldErrors({}); save.reset(); setNotice(''); setImage(null); setUploadProgress(null); setEditor(true)
  }
  function field(name: keyof ArticleInput) { return { value: values[name] ?? '', onChange: (event: { target: { value: string } }) => setValues({ ...values, [name]: event.target.value }), error: fieldErrors[name], disabled: save.isPending } }
  const filtered = rows
  return <>
    <AdminPageHeader title="Artikel" description="CMS artikel pada rekansiaga-dev. Izin efektif ditentukan oleh database."><Button onClick={() => open()}>Buat artikel</Button>{hasDraft && !editor && <Button variant="secondary" onClick={() => setEditor(true)}>Lanjutkan draf artikel</Button>}</AdminPageHeader>
    <Alert tone="warning">{allowed ? 'Penulisan diaktifkan melalui konfigurasi operator. Hanya ubah data dalam cakupan izin yang disetujui.' : 'READ-ONLY: penulisan remote belum disetujui dan belum diuji. Operator perlu memverifikasi RLS/grants dev serta menyetujui data dan tindakan demo.'}</Alert>
    {notice && <p role="status">{notice}</p>}
    {featuredArticleEnabled && featuredQuery.data?.is_featured && <Alert tone="primary"><span>Informasi Utama saat ini: <strong>{featuredQuery.data.title}</strong>.</span> <Button size="sm" variant="secondary" disabled={!allowed || feature.isPending} loading={feature.isPending} onClick={() => feature.mutate({ row: featuredQuery.data!, enabled: false })}>Batalkan pilihan</Button></Alert>}
    <Panel><div className="admin-toolbar"><Input label="Cari artikel" type="search" maxLength={120} value={search} onChange={event => { setSearch(event.target.value); setPage(1) }}/><Select label="Status publikasi" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">Semua status</option>{publicationStatuses.map(value => <option key={value}>{value}</option>)}</Select>{<Button variant="secondary" onClick={() => { void query.refetch() }} loading={query.isFetching}>Muat ulang</Button>}</div>
      <DataTable title="Artikel" rows={filtered} rowKey={row => row.id} loading={query.isPending} error={query.isError ? contentError(query.error) : undefined} emptyDescription="Belum ada artikel yang cocok. Tidak ada data yang dibuat otomatis." columns={[
        { key: 'title', label: 'Judul', render: row => <>{row.title}<small className="muted"> / {row.slug}</small></> },
        { key: 'status', label: 'Publikasi', render: row => <>{<Badge>{row.publication_status}</Badge>}{featuredQuery.data?.is_featured && featuredQuery.data.id === row.id && <Badge tone="primary">Informasi Utama</Badge>}</> },
        { key: 'published', label: 'Terbit', render: row => row.published_at ? formatDate(row.published_at) : 'Belum terbit' },
        { key: 'updated', label: 'Diperbarui', render: row => formatDate(row.updated_at) },
        { key: 'actions', label: 'Tindakan', render: row => <div className="action-row"><Button size="sm" variant="secondary" onClick={() => open(row)}>Edit</Button>{row.publication_status === 'published' && <Link to={`/informasi/${encodeURIComponent(row.slug)}`}>Lihat publik</Link>}{featuredArticleEnabled && row.publication_status === 'published' && row.published_at && <Button size="sm" variant="secondary" disabled={!allowed || feature.isPending || featuredQuery.isError || featuredQuery.isPending} onClick={() => feature.mutate({ row, enabled: !(featuredQuery.data?.is_featured && featuredQuery.data.id === row.id) })}>{featuredQuery.data?.is_featured && featuredQuery.data.id === row.id ? 'Batalkan Informasi Utama' : 'Jadikan Informasi Utama'}</Button>}<Button size="sm" variant="danger" disabled={!allowed} onClick={() => { remove.reset(); setRemoving(row) }}>Arsipkan</Button></div> },
      ]}/>
      {featuredArticleEnabled && (featuredQuery.isError || feature.isError) && <Alert tone="danger">{contentError(feature.error ?? featuredQuery.error)}</Alert>}
      {featuredArticleEnabled && featuredQuery.isPending && <p className="muted" role="status">Memeriksa Informasi Utama…</p>}
      <Pagination page={page} totalPages={Math.ceil((query.data?.count ?? 0) / 20)} onChange={setPage}/>
    </Panel>
    <Dialog open={editor} onClose={() => { if (!save.isPending) setEditor(false) }} title={existing ? 'Edit artikel' : 'Buat artikel'} description="Penyimpanan remote memerlukan izin operator, sesi dan role staf yang valid.">
      <form className="form-stack" noValidate onSubmit={event => { event.preventDefault(); if (!allowed || save.isPending) return; const parsed = articleInputSchema.safeParse(values); if (!parsed.success) { setFieldErrors(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message]))); return } setFieldErrors({}); save.mutate(parsed.data) }}>
        <fieldset className="form-stack" disabled={save.isPending} style={{ border: 0, padding: 0 }}>
          <Input label="Judul artikel" maxLength={180} required {...field('title')}/><Input label="Slug artikel" hint="Huruf kecil, angka, dan tanda hubung. Contoh: simulasi-demo-dosen" maxLength={160} required {...field('slug')}/>
          <Textarea label="Ringkasan" maxLength={1000} required {...field('summary')}/><Textarea label="Isi artikel" rows={8} maxLength={20000} required {...field('content')}/><Input label="URL sumber eksternal (opsional)" hint="Kosongkan untuk artikel original Admin." type="url" {...field('source_url')}/>
          <Select label="Status artikel" {...field('publication_status')}>{publicationStatuses.map(value => <option key={value}>{value}</option>)}</Select>
          <ArticleImagePicker file={image} onFile={setImage} path={values.cover_image_path??existing?.cover_image_path} onRemove={()=>setValues(previous=>({...previous,cover_image_path:''}))} disabled={save.isPending||!articleMediaEnabled} progress={uploadProgress}/>
          {!articleMediaEnabled&&<p className="muted">Upload menunggu aktivasi paket konten. Gambar lama dipertahankan; draft tanpa gambar tetap dapat disimpan.</p>}
          <details><summary>Preview artikel</summary><h2>{values.title||'Judul artikel'}</h2><p>{values.summary}</p><div style={{whiteSpace:'pre-wrap'}}>{values.content}</div></details>
        </fieldset>
        {save.isError && <Alert tone="danger">{save.error instanceof Error && !(save.error instanceof z.ZodError) ? save.error.message : contentError(save.error)}</Alert>}
        {save.isError&&existing&&<Button variant="secondary" loading={reconciling} onClick={async()=>{
          if(!window.confirm('Ambil versi terbaru untuk melanjutkan? Teks dan status pilihan Anda dipertahankan, gambar pilihan lokal dibatalkan dan sampul server digunakan. Periksa perubahan sebelum menyimpan.'))return
          setReconciling(true)
          try{const latest=await getAdminArticle(existing.id);setExisting(latest);setImage(null);setUploadProgress(null);setValues(previous=>({...previous,cover_image_path:latest.cover_image_path??''}));save.reset();setNotice('Versi server diambil. Teks draf tetap ada; tinjau sebelum menyimpan.')}catch{setNotice('Versi server belum dapat dibaca. Draf tetap dipertahankan.')}finally{setReconciling(false)}
        }}>Perbarui versi server, pertahankan teks</Button>}
        <Button type="submit" disabled={!allowed||reconciling} loading={save.isPending}>Simpan ke dev</Button>
      </form>
    </Dialog>
    <Dialog open={!!removing} onClose={() => { if (!remove.isPending) setRemoving(undefined) }} title="Arsipkan artikel?" description="Artikel ditarik dari publik tanpa menghapus baris atau gambar terkait.">
      <p>{removing?.title}</p>{remove.isError && <Alert tone="danger">{contentError(remove.error)}</Alert>}<div className="action-row"><Button variant="secondary" disabled={remove.isPending} onClick={() => setRemoving(undefined)}>Batal</Button><Button variant="danger" disabled={!allowed} loading={remove.isPending} onClick={() => { if (removing && !remove.isPending) remove.mutate(removing) }}>Konfirmasi arsip</Button></div>
    </Dialog>
  </>
}
