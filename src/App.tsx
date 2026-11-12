import { createContext, useCallback, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { ChevronLeft, ChevronRight, LogOut, Printer, RefreshCw, Settings2 } from "lucide-react";
import { Alert } from "@/components/arc/alert/alert";
import { Avatar } from "@/components/arc/avatar/avatar";
import { Badge } from "@/components/arc/badge/badge";
import { Button } from "@/components/arc/button/button";
import { Checkbox } from "@/components/arc/checkbox/checkbox";
import { ConfirmMorph } from "@/components/arc/confirm-morph/confirm-morph";
import { DatePicker } from "@/components/arc/date-picker/date-picker";
import { Dialog, DialogContent } from "@/components/arc/dialog/dialog";
import { Drawer, DrawerClose, DrawerContent } from "@/components/arc/drawer/drawer";
import { EmptyState } from "@/components/arc/empty-state/empty-state";
import { Input } from "@/components/arc/input/input";
import { MetricCard } from "@/components/arc/metric-card/metric-card";
import { Progress } from "@/components/arc/progress/progress";
import { SearchField } from "@/components/arc/search-field/search-field";
import { PasswordField } from "@/components/arc/password-field/password-field";
import { RadioGroup } from "@/components/arc/radio-group/radio-group";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Select } from "@/components/arc/select/select";
import { Skeleton } from "@/components/arc/skeleton/skeleton";
import { Textarea } from "@/components/arc/textarea/textarea";
import s from "./app.module.css";

/* ---------- Supabase (tidak diubah) ---------- */
const SUPABASE_URL = "https://xxqekpqbpvjkkqhupdad.supabase.co";
const SUPABASE_KEY = "sb_publishable_xCWlum8mPFrenqj_poq3jg_4z-JeK1I";

async function sbFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", ...(options.headers as object) };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, { ...options, headers });
  if (!res.ok) throw new Error((await res.text()) || "Terjadi kesalahan pada database Supabase.");
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
const q = encodeURIComponent;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

type User = { UserID: string; Nama: string; Kelas?: string; Role: string; ID_Guru_Pengampu?: string };
type Field = { id: number; FieldID: string; Label: string; Type: string; Options: string | null };
type Row = User & { sudahIsi: boolean; jurnalData: Record<string, string> | null; feedbackData: { badge?: string; catatan?: string } | null };
type Nav = { prev?: string; next?: string; go: (id: string) => void };
type PrintData = { nama: string; kelas: string; start: string; end: string; rows: any[] };

/* ---------- Dialog notifikasi ---------- */
type Notify = (title: string, message: string, type?: "success" | "error", onOk?: () => void) => void;
const NotifyCtx = createContext<Notify>(() => {});
const useNotify = () => useContext(NotifyCtx);

function NotifyProvider({ children }: { children: ReactNode }) {
  const [a, setA] = useState<{ title: string; message: string; type: string; onOk?: () => void } | null>(null);
  const notify: Notify = useCallback((title, message, type = "success", onOk) => setA({ title, message, type, onOk }), []);
  const close = () => { const cb = a?.onOk; setA(null); cb?.(); };
  return (
    <NotifyCtx.Provider value={notify}>
      {children}
      <Dialog open={!!a} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent title={a?.title ?? ""} description={a?.message}>
          <div className={s.row2}>
            <Badge tone={a?.type === "error" ? "danger" : "success"}>{a?.type === "error" ? "Gagal" : "Berhasil"}</Badge>
            <Button onClick={close}>Mengerti</Button>
          </div>
        </DialogContent>
      </Dialog>
    </NotifyCtx.Provider>
  );
}

/* ---------- Login ---------- */
function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const notify = useNotify();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await sbFetch(`datapengguna?UserID=eq.${q(u.trim())}&Password=eq.${q(p.trim())}&select=*`);
      if (data && data.length > 0) onLogin(data[0]);
      else notify("Gagal login", "UserID atau password salah.", "error");
    } catch (err) {
      notify("Kesalahan koneksi", msg(err), "error");
    } finally { setBusy(false); }
  }

  return (
    <section className={s.login}>
      <form className={s.loginCard} onSubmit={submit} autoComplete="on">
        <div>
          <h2 className={s.h2}>Masuk portal</h2>
          <p className={s.muted}>Sistem jurnal binaan dan harian siswa</p>
        </div>
        <Input label="UserID" value={u} onChange={(e) => setU(e.target.value)} required autoComplete="username" placeholder="Masukkan UserID Anda" />
        <PasswordField label="Password" value={p} onChange={(e) => setP(e.target.value)} required autoComplete="current-password" messages={{ showPassword: "Tampilkan password", hidePassword: "Sembunyikan password" }} />
        <Button type="submit" loading={busy}>Masuk sistem</Button>
      </form>
    </section>
  );
}

/* ---------- Form builder guru ---------- */
function FormBuilder({ open, onOpenChange, user, schema, reload }: { open: boolean; onOpenChange: (o: boolean) => void; user: User; schema: Field[]; reload: () => Promise<void> }) {
  const notify = useNotify();
  const [label, setLabel] = useState("");
  const [type, setType] = useState("checkbox");
  const [options, setOptions] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    const payload = { GuruID: user.UserID, FieldID: "f_" + Math.random().toString(36).substring(2, 9), Label: label.trim(), Type: type, Options: options.trim() || null, Urutan: schema.length + 1 };
    try {
      await sbFetch("form_kustom_guru", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(payload) });
      setLabel(""); setType("checkbox"); setOptions("");
      await reload();
      notify("Berhasil", "Komponen form baru berhasil ditambahkan untuk siswa binaan Anda.");
    } catch (err) { notify("Gagal", msg(err), "error"); }
  }

  async function remove(id: number) {
    try {
      await sbFetch(`form_kustom_guru?id=eq.${id}`, { method: "DELETE" });
      await reload();
    } catch (err) { notify("Gagal", msg(err), "error"); throw err; }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent title="Kustomisasi form siswa binaan" description="Tambah, edit, atau hapus komponen form isian untuk siswa binaan Anda.">
        <div className={s.stack}>
          <form className={s.stack} onSubmit={add}>
            <h4 className={s.h3}>Tambah pertanyaan baru</h4>
            <Input label="Label pertanyaan" value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="Contoh: Sholat dhuha berjamaah" />
            <Select label="Tipe input" value={type} onValueChange={setType} options={[
              { value: "checkbox", label: "Checklist (ya / tidak)" }, { value: "text", label: "Teks pendek" },
              { value: "textarea", label: "Teks panjang" }, { value: "dropdown", label: "Dropdown (pilihan)" }]} />
            {type === "dropdown" && <Input label="Opsi dropdown" description="Pisahkan dengan koma" value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Sangat baik, Baik, Cukup, Kurang" />}
            <Button type="submit" variant="secondary">Tambahkan ke form siswa</Button>
          </form>
          <h4 className={s.h3}>Daftar form aktif</h4>
          {schema.length === 0 ? <p className={s.muted}>Belum ada form kustom. Siswa Anda akan mengisi form standar.</p> : schema.map((f, i) => (
            <div key={f.id} className={s.fieldRow}>
              <div>
                <p className={s.h3}>{i + 1}. {f.Label}</p>
                <p className={s.muted}>{f.Type}{f.Options ? ` · ${f.Options}` : ""}</p>
              </div>
              <ConfirmMorph label="Hapus" prompt="Hapus field?" confirmLabel="Hapus" cancelLabel="Batal" pendingLabel="Menghapus" doneLabel="Terhapus" errorLabel="Gagal" retryLabel="Ulangi" onConfirm={() => remove(f.id)} />
            </div>
          ))}
          <DrawerClose asChild><Button>Selesai dan simpan</Button></DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ---------- Detail jurnal + umpan balik ---------- */
function Detail({ siswa, tanggal, user, schema, nav, onSaved }: { nav: Nav; schema: Field[]; siswa: Row; tanggal: Date; user: User; onSaved: () => Promise<void> }) {
  const notify = useNotify();
  const [badge, setBadge] = useState(siswa.feedbackData?.badge || "⭐ Bintang Emas");
  const [catatan, setCatatan] = useState(siswa.feedbackData?.catatan || "");
  const [busy, setBusy] = useState(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const tgl = iso(tanggal);
    try {
      const existing = await sbFetch(`jurnal_siswa?UserID=eq.${siswa.UserID}&Tanggal=eq.${tgl}&select=id`);
      if (existing && existing.length > 0) {
        await sbFetch(`jurnal_siswa?id=eq.${existing[0].id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ FeedbackBadge: badge, FeedbackCatatan: catatan.trim(), GuruPenilaiID: user.UserID }) });
      } else {
        notify("Peringatan", "Siswa ini belum mengisi jurnal pada tanggal tersebut, sehingga belum ada data jawaban yang dapat diberi feedback.", "error");
        return;
      }
      notify("Berhasil", "Umpan balik berhasil disimpan.");
      await onSaved();
    } catch (err) { notify("Gagal", msg(err), "error"); } finally { setBusy(false); }
  }

  const head = (
    <div className={s.panelHead}>
      <div className={s.row2}>
        <Avatar name={siswa.Nama} />
        <div>
          <h3 className={s.h3}>{siswa.Nama}</h3>
          <p className={s.muted}>ID: {siswa.UserID} | Kelas: {siswa.Kelas}</p>
        </div>
      </div>
      <div className={s.navBtns}>
        <Badge tone={siswa.sudahIsi ? "success" : "warning"} dot>{siswa.sudahIsi ? "Sudah mengisi" : "Belum mengisi"}</Badge>
        <Button variant="ghost" aria-label="Siswa sebelumnya" disabled={!nav.prev} onClick={() => nav.prev && nav.go(nav.prev)}><ChevronLeft size={16} strokeWidth={1.75} aria-hidden /></Button>
        <Button variant="ghost" aria-label="Siswa berikutnya" disabled={!nav.next} onClick={() => nav.next && nav.go(nav.next)}><ChevronRight size={16} strokeWidth={1.75} aria-hidden /></Button>
      </div>
    </div>
  );
  if (!siswa.sudahIsi) return <>{head}<div className={s.empty}><EmptyState title="Belum mengisi jurnal" description={`Siswa ${siswa.Nama} belum menyerahkan laporan jurnal pada tanggal terpilih.`} /></div></>;
  const answers = siswa.jurnalData || {};
  const label = (k: string) => schema.find((f) => f.FieldID === k)?.Label ?? "Pertanyaan yang sudah dihapus";
  const order = (k: string) => { const i = schema.findIndex((f) => f.FieldID === k); return i < 0 ? 999 : i; };
  const keys = Object.keys(answers).sort((x, y) => order(x) - order(y));
  return (
    <>
      {head}
      <div className={s.detailBody}>
        {keys.length === 0 ? <p className={s.muted}>Data jawaban kosong.</p> : (
          <div className={s.answersGrid}>
            {keys.map((k, i) => (
              <div key={k} className={s.answer}>
                <small>{i + 1}. {label(k)}</small>
                {answers[k] === "YA" ? <Badge tone="success">YA</Badge> : answers[k] === "TIDAK" ? <Badge tone="danger">TIDAK</Badge> : <span>{answers[k]}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <form className={s.feedbackBar} onSubmit={send}>
        <div className={s.feedbackTop}>
          <h4 className={s.h3}>Umpan balik</h4>
          <SegmentedControl label="Lencana" value={badge} onValueChange={setBadge} options={[{ value: "⭐ Bintang Emas", label: "⭐ Bintang Emas" }, { value: "👍 Jempol Super", label: "👍 Jempol Super" }]} />
        </div>
        <div className={s.feedbackRow}>
          <Textarea label="Catatan motivasi" rows={2} required value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Tuliskan apresiasi atau catatan..." />
          <Button type="submit" loading={busy}>Simpan umpan balik</Button>
        </div>
      </form>
    </>
  );
}

/* ---------- Dashboard guru ---------- */
function Guru({ user }: { user: User }) {
  const notify = useNotify();
  const [schema, setSchema] = useState<Field[]>([]);
  const [tanggal, setTanggal] = useState(() => new Date());
  const [cache, setCache] = useState<Row[]>([]);
  const [filter, setFilter] = useState("all");
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [builder, setBuilder] = useState(false);
  const [cetak, setCetak] = useState({ id: "", start: new Date(), end: new Date() });
  const [print, setPrint] = useState<PrintData | null>(null);
  const [search, setSearch] = useState("");
  const [printOpen, setPrintOpen] = useState(false);

  const loadSchema = useCallback(async () => {
    try { setSchema((await sbFetch(`form_kustom_guru?GuruID=eq.${q(user.UserID)}&order=Urutan.asc,id.asc&select=*`)) || []); }
    catch (err) { console.warn("Gagal memuat form kustom:", err); setSchema([]); }
  }, [user.UserID]);

  const load = useCallback(async () => {
    setLoading(true); setActive(null);
    try {
      const siswa: User[] = (await sbFetch(`datapengguna?Role=eq.Siswa&ID_Guru_Pengampu=eq.${q(user.UserID)}&select=*`)) || [];
      const jurnal: any[] = (await sbFetch(`jurnal_siswa?Tanggal=eq.${iso(tanggal)}&select=*`)) || [];
      const map: Record<string, any> = {};
      jurnal.forEach((j) => { map[j.UserID] = j; });
      setCache(siswa.map((x) => { const j = map[x.UserID]; return { ...x, sudahIsi: !!j, jurnalData: j ? j.Answers : null, feedbackData: j ? { badge: j.FeedbackBadge, catatan: j.FeedbackCatatan } : null }; }));
    } catch (err) { notify("Error", "Gagal memuat dashboard guru: " + msg(err), "error"); } finally { setLoading(false); }
  }, [user.UserID, tanggal, notify]);

  useEffect(() => { loadSchema(); }, [loadSchema]);
  useEffect(() => { load(); }, [load]);

  const sudah = cache.filter((x) => x.sudahIsi).length;
  const belum = cache.length - sudah;
  const pct = cache.length ? Math.round((sudah / cache.length) * 100) : 0;
  const kw = search.trim().toLowerCase();
  const list = (filter === "sudah" ? cache.filter((x) => x.sudahIsi) : filter === "belum" ? cache.filter((x) => !x.sudahIsi) : cache).filter((x) => !kw || x.Nama.toLowerCase().includes(kw));
  const selected = cache.find((x) => x.UserID === active);
  const idx = list.findIndex((x) => x.UserID === active);
  const nav: Nav = { prev: idx > 0 ? list[idx - 1].UserID : undefined, next: idx >= 0 && idx < list.length - 1 ? list[idx + 1].UserID : undefined, go: setActive };

  async function cetakLaporan() {
    if (!cetak.id) { notify("Peringatan", "Pilih siswa binaan terlebih dahulu.", "error"); return; }
    const start = iso(cetak.start), end = iso(cetak.end);
    try {
      const rows = await sbFetch(`jurnal_siswa?UserID=eq.${cetak.id}&Tanggal=gte.${start}&Tanggal=lte.${end}&order=Tanggal.asc&select=*`);
      const sw = cache.find((x) => x.UserID === cetak.id);
      flushSync(() => { setPrintOpen(false); setPrint({ nama: sw ? sw.Nama : cetak.id, kelas: sw ? sw.Kelas || "-" : "-", start, end, rows: (rows || []).map((r: any) => ({ ...r, Answers: Object.fromEntries(Object.entries(r.Answers || {}).map(([k, v]) => [schema.find((f) => f.FieldID === k)?.Label ?? k, v])) })) }); });
      window.print();
    } catch (err) { notify("Gagal", msg(err), "error"); }
  }

  return (
    <>
      <section className={s.hero}>
        <div className={s.heroMain}>
          <h2 className={s.h2}>Selamat datang, {user.Nama}</h2>
          <p className={s.muted}>{loading ? "Memuat data siswa binaan..." : `${sudah} dari ${cache.length} siswa binaan sudah mengisi jurnal (${pct}%)`}</p>
          <div className={s.progressWrap}><Progress label="Progres pengisian jurnal" value={sudah} max={Math.max(cache.length, 1)} showValue /></div>
        </div>
        <div className={s.toolbarActions}>
          <DatePicker label="Tanggal pantau" locale="id-ID" value={tanggal} onChange={(d) => d && setTanggal(d)} />
          <Button variant="ghost" aria-label="Segarkan data" onClick={load}><RefreshCw size={16} strokeWidth={1.75} aria-hidden /></Button>
          <Button variant="secondary" onClick={() => setPrintOpen(true)}><Printer size={16} strokeWidth={1.75} aria-hidden /> Cetak rekap</Button>
          <Button variant="secondary" onClick={() => setBuilder(true)}><Settings2 size={16} strokeWidth={1.75} aria-hidden /> Atur form</Button>
        </div>
      </section>

      <section className={s.metrics} aria-label="Ringkasan jurnal hari ini">
        <MetricCard label="Total binaan" value={cache.length} suffix=" siswa" context="Siswa binaan aktif" />
        <MetricCard label="Sudah mengisi" value={sudah} suffix=" siswa" context={`${pct}% dari total binaan`} />
        <MetricCard label="Belum mengisi" value={belum} suffix=" siswa" context="Perlu diingatkan" />
      </section>

      <SegmentedControl label="Filter siswa binaan" value={filter} onValueChange={setFilter} options={[
        { value: "all", label: "Semua" },
        { value: "sudah", label: "Sudah mengisi" },
        { value: "belum", label: "Belum mengisi" }]} />

      <section className={s.workspace}>
        <article className={s.panel}>
          <div className={s.searchBox}><SearchField label="Cari siswa" placeholder="Ketik nama siswa" value={search} onValueChange={setSearch} /></div>
          <div className={s.panelBody} aria-busy={loading}>
            {loading ? <Skeleton lines={4} label="Memuat siswa binaan" /> : list.length === 0 ? <EmptyState title="Tidak ada data" description="Tidak ada siswa yang cocok dengan filter ini." /> : list.map((x) => (
              <button key={x.UserID} type="button" aria-pressed={active === x.UserID} className={`${s.row} ${active === x.UserID ? s.rowActive : ""}`} onClick={() => setActive(x.UserID)}>
                <Avatar name={x.Nama} size="sm" />
                <span className={s.rowText}><span>{x.Nama}</span><small>{x.Kelas || "-"}</small></span>
                {x.sudahIsi && x.feedbackData?.badge && <Badge size="sm" tone="info">Dinilai</Badge>}
                <Badge size="sm" dot tone={x.sudahIsi ? "success" : "warning"}>{x.sudahIsi ? "Sudah" : "Belum"}</Badge>
              </button>
            ))}
          </div>
        </article>
        <article className={s.panel}>
          {selected ? <Detail nav={nav} schema={schema} key={selected.UserID + String(selected.sudahIsi)} siswa={selected} tanggal={tanggal} user={user} onSaved={async () => { const id = selected.UserID; await load(); setActive(id); }} />
            : <div className={s.empty}><EmptyState title="Pilih siswa binaan" description="Klik nama siswa di sebelah kiri untuk memeriksa jurnal dan memberi umpan balik." /></div>}
        </article>
      </section>

      <Drawer open={printOpen} onOpenChange={setPrintOpen}>
        <DrawerContent title="Cetak rekap jurnal" description="Pilih siswa dan rentang tanggal untuk mencetak laporan.">
          <div className={s.stack}>
            <Select label="Siswa" placeholder="Pilih siswa binaan" value={cetak.id} onValueChange={(v) => setCetak({ ...cetak, id: v })} options={cache.map((x) => ({ value: x.UserID, label: `${x.Nama} (${x.Kelas})` }))} />
            <DatePicker label="Mulai tanggal" locale="id-ID" value={cetak.start} onChange={(d) => d && setCetak({ ...cetak, start: d })} />
            <DatePicker label="Sampai tanggal" locale="id-ID" value={cetak.end} onChange={(d) => d && setCetak({ ...cetak, end: d })} />
            <Button onClick={cetakLaporan}><Printer size={16} strokeWidth={1.75} aria-hidden /> Cetak laporan</Button>
          </div>
        </DrawerContent>
      </Drawer>

      <FormBuilder open={builder} onOpenChange={(o) => { setBuilder(o); if (!o) loadSchema(); }} user={user} schema={schema} reload={loadSchema} />
      {print && createPortal(
        <div className="printArea">
          <h2>REKAPITULASI JURNAL HARIAN SISWA</h2>
          <p className="sub">Periode: {print.start} s.d. {print.end}</p>
          <table><tbody><tr><td>Nama siswa: {print.nama}</td><td>Kelas: {print.kelas}</td></tr></tbody></table>
          <table>
            <thead><tr><th style={{ width: "15%" }}>Tanggal</th><th>Jawaban jurnal</th><th style={{ width: "30%" }}>Umpan balik guru</th></tr></thead>
            <tbody>
              {print.rows.length === 0 ? <tr><td colSpan={3} style={{ textAlign: "center" }}>Tidak ada data jurnal pada rentang tanggal tersebut.</td></tr>
                : print.rows.map((r) => <tr key={r.id ?? r.Tanggal}><td>{r.Tanggal}</td><td><pre>{JSON.stringify(r.Answers, null, 2)}</pre></td><td>{r.FeedbackBadge || "-"}:<br />{r.FeedbackCatatan || "-"}</td></tr>)}
            </tbody>
          </table>
        </div>, document.body)}
    </>
  );
}

/* ---------- Dashboard siswa ---------- */
function Siswa({ user }: { user: User }) {
  const notify = useNotify();
  const [schema, setSchema] = useState<Field[] | null>(null);
  const [tanggal, setTanggal] = useState(() => new Date());
  const [ans, setAns] = useState<Record<string, string | boolean>>({});
  const [busy, setBusy] = useState(false);
  const set = (id: string, v: string | boolean) => setAns((a) => ({ ...a, [id]: v }));

  useEffect(() => {
    sbFetch(`form_kustom_guru?GuruID=eq.${q(user.ID_Guru_Pengampu || "")}&order=Urutan.asc,id.asc&select=*`)
      .then((r) => setSchema(r || [])).catch((err) => { console.warn("Gagal memuat form:", err); setSchema([]); });
  }, [user.ID_Guru_Pengampu]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const tgl = iso(tanggal);
    try {
      const fresh: Field[] = (await sbFetch(`form_kustom_guru?GuruID=eq.${q(user.ID_Guru_Pengampu || "")}&select=*`)) || [];
      const answers: Record<string, string> = {};
      fresh.forEach((f) => { const v = ans[f.FieldID]; answers[f.FieldID] = f.Type === "checkbox" ? (v === true ? "YA" : "TIDAK") : String(v ?? ""); });
      const payload = { UserID: user.UserID, Tanggal: tgl, Answers: answers, GuruPenilaiID: user.ID_Guru_Pengampu };
      const existing = await sbFetch(`jurnal_siswa?UserID=eq.${user.UserID}&Tanggal=eq.${tgl}&select=id`);
      if (existing && existing.length > 0) await sbFetch(`jurnal_siswa?id=eq.${existing[0].id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ Answers: answers }) });
      else await sbFetch("jurnal_siswa", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(payload) });
      notify("Berhasil!", "Jurnal harian Anda berhasil dikirim ke guru pembina.");
    } catch (err) { notify("Gagal", msg(err), "error"); } finally { setBusy(false); }
  }

  return (
    <div className={`${s.stack} ${s.narrow}`}>
      <section className={`${s.group} ${s.groupHead}`}>
        <div className={s.row2}>
          <Avatar name={user.Nama} size="lg" />
          <div><h2 className={s.h2}>{user.Nama}</h2><p className={s.muted}>{user.Kelas || "Kelas binaan"}</p></div>
        </div>
        <Badge tone="info">Guru pembina: {user.ID_Guru_Pengampu || "Guru pembina"}</Badge>
      </section>
      <section className={s.group}>
        <div className={s.groupHead}>
          <div><h3 className={s.h3}>Jurnal karakter dan aktivitas harian</h3><p className={s.muted}>Form di bawah dirancang khusus oleh guru pembina Anda.</p></div>
          <DatePicker label="Tanggal jurnal" locale="id-ID" value={tanggal} onChange={(d) => d && setTanggal(d)} />
        </div>
        {schema === null ? <Skeleton lines={3} label="Memuat form jurnal" /> : schema.length === 0 ? (
          <EmptyState title="Form belum diatur" description="Guru pembina belum mengatur form kustom. Silakan hubungi guru Anda." />
        ) : (
          <form className={s.stack} onSubmit={submit}>
            {schema.map((f, i) => {
              const label = `${i + 1}. ${f.Label}`;
              const id = `field_${f.FieldID}`;
              if (f.Type === "checkbox") return <Checkbox key={f.id} id={id} name={f.FieldID} label={label} checked={ans[f.FieldID] === true} onCheckedChange={(c) => set(f.FieldID, c === true)} />;
              if (f.Type === "dropdown") return <Select key={f.id} id={id} name={f.FieldID} label={label} placeholder="Pilih opsi" value={String(ans[f.FieldID] ?? "")} onValueChange={(v) => set(f.FieldID, v)} options={(f.Options || "").split(",").map((o) => o.trim()).filter(Boolean).map((o) => ({ value: o, label: o }))} />;
              if (f.Type === "textarea") return <Textarea key={f.id} id={id} name={f.FieldID} label={label} rows={3} placeholder="Tuliskan keterangan..." value={String(ans[f.FieldID] ?? "")} onChange={(e) => set(f.FieldID, e.target.value)} />;
              return <Input key={f.id} id={id} name={f.FieldID} label={label} placeholder="Masukkan jawaban..." value={String(ans[f.FieldID] ?? "")} onChange={(e) => set(f.FieldID, e.target.value)} />;
            })}
            <Button type="submit" loading={busy}>Kirim jurnal harian</Button>
          </form>
        )}
      </section>
    </div>
  );
}

/* ---------- Root ---------- */
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  return (
    <NotifyProvider>
      <Shell user={user} setUser={setUser} />
    </NotifyProvider>
  );
}

function Shell({ user, setUser }: { user: User | null; setUser: (u: User | null) => void }) {
  const notify = useNotify();
  const login = (u: User) => {
    if (["Guru", "Admin", "Siswa"].includes(u.Role)) setUser(u);
    else notify("Gagal", "Role akun tidak dikenali.", "error");
  };
  return (
    <div className={s.shell}>
      {user && (
        <header className={s.header}>
          <div className={s.headerIn}>
            <div><h1 className={s.title}>Portal Jurnal Harian</h1><p className={s.muted}>SMP Maria Immaculata</p></div>
            <Button variant="secondary" aria-label="Keluar" onClick={() => setUser(null)}><LogOut size={16} strokeWidth={1.75} aria-hidden /> Keluar</Button>
          </div>
        </header>
      )}
      <main className={s.page}>
        {!user ? <Login onLogin={login} /> : user.Role === "Siswa" ? <Siswa key={user.UserID} user={user} /> : <Guru key={user.UserID} user={user} />}
      </main>
      <footer className={s.footer}>&copy; 2026 Portal Jurnal Harian & Binaan Siswa. Terhubung ke Supabase.</footer>
    </div>
  );
}
