import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { BookOpenCheck, LayoutDashboard, LogOut, Menu, Printer, SlidersHorizontal, Users, CheckCircle2, Clock, X } from "lucide-react";
import { Alert } from "@/components/arc/alert/alert";
import { Avatar } from "@/components/arc/avatar/avatar";
import { Badge } from "@/components/arc/badge/badge";
import { BarChart } from "@/components/arc/bar-chart/bar-chart";
import { Button } from "@/components/arc/button/button";
import { Checkbox } from "@/components/arc/checkbox/checkbox";
import { ConfirmMorph } from "@/components/arc/confirm-morph/confirm-morph";
import { DatePicker } from "@/components/arc/date-picker/date-picker";
import { Dialog, DialogContent } from "@/components/arc/dialog/dialog";
import { DonutChart } from "@/components/arc/donut-chart/donut-chart";
import { EmptyState } from "@/components/arc/empty-state/empty-state";
import { Input } from "@/components/arc/input/input";
import { MetricCard } from "@/components/arc/metric-card/metric-card";
import { PasswordField } from "@/components/arc/password-field/password-field";
import { Progress } from "@/components/arc/progress/progress";
import { SearchField } from "@/components/arc/search-field/search-field";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Select } from "@/components/arc/select/select";
import { Skeleton } from "@/components/arc/skeleton/skeleton";
import { Textarea } from "@/components/arc/textarea/textarea";
import s from "./app.module.css";

const SUPABASE_URL = "https://xxqekpqbpvjkkqhupdad.supabase.co";
const SUPABASE_KEY = "sb_publishable_xCWlum8mPFrenqj_poq3jg_4z-JeK1I";
const LOGO_ID = "16G9OfkB8B77E0Qrj0C0KdHtmW6OvwG4P";
const LOGOS = [`https://lh3.googleusercontent.com/d/${LOGO_ID}`, `https://drive.google.com/thumbnail?id=${LOGO_ID}&sz=w400`, `https://drive.google.com/uc?export=view&id=${LOGO_ID}`];
const BADGES = ["Sangat Baik", "Konsisten", "Semangatnya Luar Biasa", "Perlu Ditingkatkan"];

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
const opts = (o: string | null) => (o || "").split(",").map((x) => x.trim()).filter(Boolean);
const SISWA = "\u00A0siswa";
const inert = { inert: "" } as Record<string, string>;

type User = { UserID: string; Nama: string; Kelas?: string; Role: string; ID_Guru_Pengampu?: string };
type Field = { id: number; FieldID: string; Label: string; Type: string; Options: string | null };
type Row = User & { sudahIsi: boolean; jurnalData: Record<string, string> | null; feedbackData: { badge?: string; catatan?: string } | null };
type Tab = "dashboard" | "siswa" | "form" | "print";
type Filter = "all" | "sudah" | "belum";

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

function Logo({ size = 40 }: { size?: number }) {
  const [i, setI] = useState(0);
  return (
    <span className={s.logo} style={{ width: size, height: size }}>
      {i < LOGOS.length ? <img src={LOGOS[i]} alt="Logo SMP Maria Immaculata" onError={() => setI(i + 1)} /> : <BookOpenCheck size={size / 2} strokeWidth={1.75} aria-hidden />}
    </span>
  );
}

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
    } catch (err) { notify("Error koneksi", msg(err), "error"); } finally { setBusy(false); }
  }
  return (
    <section className={s.login}>
      <form className={s.loginCard} onSubmit={submit} autoComplete="on">
        <div className={s.center}>
          <Logo size={80} />
          <h1 className={s.h1}>Jurnal binaan</h1>
          <p className={s.muted}>SMP Maria Immaculata</p>
        </div>
        <Input label="UserID pengguna" value={u} onChange={(e) => setU(e.target.value)} required autoComplete="username" placeholder="Masukkan UserID" />
        <PasswordField label="Kata sandi" value={p} onChange={(e) => setP(e.target.value)} required autoComplete="current-password" placeholder="Masukkan kata sandi" messages={{ showPassword: "Tampilkan kata sandi", hidePassword: "Sembunyikan kata sandi" }} />
        <Button type="submit" loading={busy}>Masuk</Button>
      </form>
    </section>
  );
}

function NavItem({ icon, label, count, active, onClick }: { icon: ReactNode; label: string; count?: number; active?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`${s.nav} ${active ? s.navActive : ""}`} aria-current={active ? "page" : undefined} onClick={onClick}>
      <span className={s.navIcon}>{icon}</span>
      <span className={s.navLabel}>{label}</span>
      {count !== undefined && <Badge size="sm">{count}</Badge>}
    </button>
  );
}

function Tile({ onClick, children }: { onClick?: () => void; children: ReactNode }) {
  const key = (e: KeyboardEvent) => { if (onClick && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onClick(); } };
  return <div className={s.tile} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} onKeyDown={key}>{children}</div>;
}

function Detail({ siswa, tanggal, user, schema, onSaved }: { siswa: Row; tanggal: Date; user: User; schema: Field[]; onSaved: () => Promise<void> }) {
  const notify = useNotify();
  const existBadge = siswa.feedbackData?.badge || "Sangat Baik";
  const existCatatan = siswa.feedbackData?.catatan || "";
  const [badge, setBadge] = useState(existBadge);
  const [catatan, setCatatan] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const tgl = iso(tanggal);
    try {
      const existing = await sbFetch(`jurnal_siswa?UserID=eq.${siswa.UserID}&Tanggal=eq.${tgl}&select=id`);
      if (!existing || existing.length === 0) { notify("Peringatan", "Siswa ini belum mengisi jurnal pada tanggal tersebut.", "error"); return; }
      await sbFetch(`jurnal_siswa?id=eq.${existing[0].id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ FeedbackBadge: badge, FeedbackCatatan: catatan.trim(), GuruPenilaiID: user.UserID }) });
      setCatatan("");
      notify("Berhasil", "Umpan balik pembina berhasil disimpan.");
      await onSaved();
    } catch (err) { notify("Gagal", msg(err), "error"); } finally { setBusy(false); }
  }

  if (!siswa.sudahIsi) return <div className={s.empty}><EmptyState title="Belum mengisi jurnal" description={`${siswa.Nama} (${siswa.Kelas || "-"}) belum menyerahkan jurnal pada tanggal terpilih.`} /></div>;
  const answers = siswa.jurnalData || {};
  const keys = Object.keys(answers);
  const title = (k: string, i: number) => { const x = schema.findIndex((f) => f.FieldID === k); return x >= 0 ? `${x + 1}. ${schema[x].Label}` : `${i + 1}. Pertanyaan (${k})`; };
  return (
    <>
      <div className={s.panelHead}>
        <div className={s.row2}>
          <Avatar name={siswa.Nama} />
          <div><h3 className={s.h3}>{siswa.Nama}</h3><p className={s.muted}>ID: {siswa.UserID} · Kelas {siswa.Kelas || "-"}</p></div>
        </div>
        <Badge tone="success" dot>Telah mengisi</Badge>
      </div>
      <div className={s.scroll}>
        <h4 className={s.h3}>Rincian jawaban jurnal</h4>
        {keys.length === 0 ? <p className={s.muted}>Data jawaban kosong.</p> : (
          <div className={s.answers}>
            {keys.map((k, i) => (
              <div key={k} className={s.answer}>
                <small>{title(k, i)}</small>
                {answers[k] === "YA" ? <Badge tone="success">YA</Badge> : answers[k] === "TIDAK" ? <Badge tone="warning">TIDAK</Badge> : <span>{answers[k] || "-"}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <form className={s.feedback} onSubmit={send}>
        <h4 className={s.h3}>Umpan balik pembina</h4>
        {(siswa.feedbackData?.badge || existCatatan) && <Alert tone="success" title={`Umpan balik tersimpan: ${existBadge}`}>{existCatatan ? `"${existCatatan}"` : undefined}</Alert>}
        <div className={s.badgeRow}>
          <SegmentedControl label="Lencana" value={badge} onValueChange={setBadge} options={BADGES.map((b) => ({ value: b, label: b }))} />
        </div>
        <div className={s.feedbackRow}>
          <Textarea label="Catatan motivasi guru" rows={2} required value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Tuliskan apresiasi atau arahan baru untuk siswa..." />
          <Button type="submit" loading={busy}>Simpan umpan balik</Button>
        </div>
      </form>
    </>
  );
}

function FormPage({ user, schema, reload }: { user: User; schema: Field[]; reload: () => Promise<void> }) {
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
      notify("Berhasil", "Komponen form baru berhasil ditambahkan.");
    } catch (err) { notify("Gagal", msg(err), "error"); }
  }
  async function remove(id: number) {
    try { await sbFetch(`form_kustom_guru?id=eq.${id}`, { method: "DELETE" }); await reload(); }
    catch (err) { notify("Gagal", msg(err), "error"); throw err; }
  }
  const noop = () => {};
  return (
    <>
      <header className={s.pageHead}><h2 className={s.h2}>Pengaturan form siswa binaan</h2></header>
      <div className={s.twoCol}>
        <div className={s.stack}>
          <form className={s.card} onSubmit={add}>
            <h3 className={s.h3}>Tambah komponen pertanyaan baru</h3>
            <div className={s.formGrid}>
              <Input label="Label pertanyaan" value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="Contoh: Sholat dhuha atau doa pagi" />
              <Select label="Tipe input" value={type} onValueChange={setType} options={[
                { value: "checkbox", label: "Checklist (ya atau tidak)" }, { value: "text", label: "Teks pendek" },
                { value: "textarea", label: "Teks panjang (uraian)" }, { value: "dropdown", label: "Dropdown (pilihan)" }]} />
            </div>
            {type === "dropdown" && <Input label="Opsi pilihan" description="Pisahkan dengan koma" value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Sangat baik, Baik, Cukup, Perlu bimbingan" />}
            <div><Button type="submit">Tambahkan ke form binaan</Button></div>
          </form>
          <article className={s.card}>
            <div className={s.between}><h3 className={s.h3}>Daftar pertanyaan aktif</h3><Badge>{schema.length} butir</Badge></div>
            {schema.length === 0 ? <p className={s.muted}>Belum ada pertanyaan kustom.</p> : schema.map((f, i) => (
              <div key={f.id} className={s.fieldRow}>
                <div>
                  <p className={s.h3}>#{i + 1} {f.Label}</p>
                  <p className={s.muted}>{f.Type.toUpperCase()}{f.Options ? ` · Opsi: ${f.Options}` : ""}</p>
                </div>
                <ConfirmMorph label="Hapus" prompt="Hapus field?" confirmLabel="Hapus" cancelLabel="Batal" pendingLabel="Menghapus" doneLabel="Terhapus" errorLabel="Gagal" retryLabel="Ulangi" onConfirm={() => remove(f.id)} />
              </div>
            ))}
          </article>
        </div>
        <article className={`${s.card} ${s.tinted}`}>
          <h3 className={s.h3}>Pratinjau tampilan siswa</h3>
          {schema.length === 0 ? <p className={s.muted}>Belum ada pratinjau.</p> : (
            <div className={s.stack} {...inert}>
              {schema.map((f, i) => {
                const l = `${i + 1}. ${f.Label}`;
                if (f.Type === "checkbox") return <Checkbox key={f.id} label={l} checked={false} onCheckedChange={noop} />;
                if (f.Type === "dropdown") return <Select key={f.id} label={l} placeholder="Pilih penilaian" value="" onValueChange={noop} options={opts(f.Options).map((o) => ({ value: o, label: o }))} />;
                if (f.Type === "textarea") return <Textarea key={f.id} label={l} rows={2} placeholder="Kolom jawaban panjang..." readOnly />;
                return <Input key={f.id} label={l} placeholder="Kolom teks singkat..." readOnly />;
              })}
            </div>
          )}
        </article>
      </div>
    </>
  );
}

function Report({ siswa, guru, start, end, rows, schema }: { siswa?: Row; guru: string; start: string; end: string; rows: any[]; schema: Field[] }) {
  const lab = (k: string, i: number) => { const x = schema.findIndex((f) => f.FieldID === k); return x >= 0 ? `${x + 1}. ${schema[x].Label}` : `${i + 1}. ${k}`; };
  return (
    <div className="report">
      <h2>Rekapitulasi jurnal karakter dan aktivitas siswa</h2>
      <p className="meta">SMP Maria Immaculata · Periode: {start} s.d. {end}</p>
      <table className="info"><tbody>
        <tr><td><b>Nama siswa:</b></td><td>{siswa?.Nama ?? "-"}</td><td><b>Kelas:</b></td><td>{siswa?.Kelas ?? "-"}</td></tr>
        <tr><td><b>Guru pembina:</b></td><td colSpan={3}>{guru}</td></tr>
      </tbody></table>
      <table className="data">
        <thead><tr><th style={{ width: "16%" }}>Tanggal</th><th>Isian jawaban jurnal</th><th style={{ width: "30%" }}>Umpan balik guru pembina</th></tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={3} style={{ textAlign: "center" }}>Tidak ada data jurnal pada rentang tanggal tersebut.</td></tr> : rows.map((r) => {
            const ans = r.Answers || {};
            const ks = Object.keys(ans);
            return (
              <tr key={r.id ?? r.Tanggal}>
                <td><b>{r.Tanggal}</b></td>
                <td>{ks.length === 0 ? "-" : ks.map((k, i) => <div key={k}><b>{lab(k, i)}:</b> {String(ans[k])}</div>)}</td>
                <td><b>{r.FeedbackBadge || "-"}</b><br />{r.FeedbackCatatan || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PrintPage({ cache, schema, user }: { cache: Row[]; schema: Field[]; user: User }) {
  const notify = useNotify();
  const [sid, setSid] = useState("");
  const [start, setStart] = useState(() => new Date());
  const [end, setEnd] = useState(() => new Date());
  const [rows, setRows] = useState<any[] | null>(null);
  const fetchRows = useCallback(async () => {
    if (!sid) { setRows(null); return null; }
    const data = (await sbFetch(`jurnal_siswa?UserID=eq.${sid}&Tanggal=gte.${iso(start)}&Tanggal=lte.${iso(end)}&order=Tanggal.asc&select=*`)) || [];
    setRows(data);
    return data;
  }, [sid, start, end]);
  useEffect(() => { fetchRows().catch((err) => notify("Gagal", msg(err), "error")); }, [fetchRows, notify]);

  async function cetak() {
    if (!sid) { notify("Peringatan", "Pilih siswa binaan terlebih dahulu.", "error"); return; }
    try {
      const data = await fetchRows();
      if (!data) return;
      flushSync(() => setRows(data));
      window.print();
    } catch (err) { notify("Gagal", msg(err), "error"); }
  }
  const report = rows && <Report siswa={cache.find((x) => x.UserID === sid)} guru={user.Nama} start={iso(start)} end={iso(end)} rows={rows} schema={schema} />;
  return (
    <>
      <header className={s.pageHead}><h2 className={s.h2}>Cetak dan pratinjau laporan siswa</h2></header>
      <div className={s.twoColPrint}>
        <article className={`${s.card} ${s.tinted}`}>
          <h3 className={s.h3}>Parameter laporan</h3>
          <Select label="Pilih siswa binaan" placeholder="Pilih siswa binaan" value={sid} onValueChange={setSid} options={cache.map((x) => ({ value: x.UserID, label: `${x.Nama} (${x.Kelas || "-"})` }))} />
          <DatePicker label="Mulai tanggal" locale="id-ID" value={start} onChange={(d) => d && setStart(d)} />
          <DatePicker label="Sampai tanggal" locale="id-ID" value={end} onChange={(d) => d && setEnd(d)} />
          <Button variant="secondary" onClick={() => fetchRows().catch((err) => notify("Gagal", msg(err), "error"))}>Muat ulang pratinjau</Button>
          <Button onClick={cetak}><Printer size={16} strokeWidth={1.75} aria-hidden /> Cetak atau simpan PDF</Button>
        </article>
        <article className={s.card}>
          <div className={s.between}><h3 className={s.h3}>Pratinjau dokumen cetak</h3><span className={s.muted}>Format kertas A4</span></div>
          <div className={s.preview}>{report ?? <EmptyState title="Belum ada pratinjau dipilih" description="Pilih siswa binaan untuk melihat laporan." />}</div>
        </article>
      </div>
      {report && createPortal(<div className="printArea">{report}</div>, document.body)}
    </>
  );
}

function Guru({ user, onLogout }: { user: User; onLogout: () => void }) {
  const notify = useNotify();
  const mainRef = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [filter, setFilter] = useState<Filter>("all");
  const [menu, setMenu] = useState(false);
  const [schema, setSchema] = useState<Field[]>([]);
  const [tanggal, setTanggal] = useState(() => new Date());
  const [cache, setCache] = useState<Row[]>([]);
  const [trend, setTrend] = useState<{ key: string; label: string; axisLabel: string; value: number }[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSchema = useCallback(async () => {
    try { setSchema((await sbFetch(`form_kustom_guru?GuruID=eq.${q(user.UserID)}&order=Urutan.asc,id.asc&select=*`)) || []); }
    catch { setSchema([]); }
  }, [user.UserID]);

  const seq = useRef(0);
  const load = useCallback(async () => {
    const my = ++seq.current;
    const tgl = iso(tanggal);
    const onDay = (v: unknown, day: string) => String(v).slice(0, 10) === day;
    setLoading(true); setActive(null); setCache([]); setTrend([]);
    try {
      const siswa: User[] = (await sbFetch(`datapengguna?Role=eq.Siswa&ID_Guru_Pengampu=eq.${q(user.UserID)}&select=*`)) || [];
      const jurnal: any[] = (await sbFetch(`jurnal_siswa?Tanggal=eq.${tgl}&select=*`)) || [];
      if (my !== seq.current) return;
      const map: Record<string, any> = {};
      jurnal.filter((j) => onDay(j.Tanggal, tgl)).forEach((j) => { map[j.UserID] = j; });
      const rows: Row[] = siswa.map((x) => { const j = map[x.UserID]; return { ...x, sudahIsi: !!j, jurnalData: j ? j.Answers : null, feedbackData: j ? { badge: j.FeedbackBadge, catatan: j.FeedbackCatatan } : null }; });
      setCache(rows);
      const dates = Array.from({ length: 7 }, (_, i) => new Date(tanggal.getFullYear(), tanggal.getMonth(), tanggal.getDate() - (6 - i)));
      const j7: any[] = rows.length ? (await sbFetch(`jurnal_siswa?Tanggal=gte.${iso(dates[0])}&Tanggal=lte.${iso(dates[6])}&select=UserID,Tanggal`)) || [] : [];
      if (my !== seq.current) return;
      const ids = new Set(rows.map((r) => r.UserID));
      setTrend(dates.map((d) => ({
        key: iso(d), label: d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }), axisLabel: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
        value: new Set(j7.filter((r) => onDay(r.Tanggal, iso(d)) && ids.has(r.UserID)).map((r) => r.UserID)).size,
      })));
    } catch (err) { if (my === seq.current) notify("Error", "Gagal memuat dashboard guru: " + msg(err), "error"); } finally { if (my === seq.current) setLoading(false); }
  }, [user.UserID, tanggal, notify]);

  useEffect(() => { loadSchema(); }, [loadSchema]);
  useEffect(() => { load(); }, [load]);

  const sudah = cache.filter((x) => x.sudahIsi).length;
  const belum = cache.length - sudah;
  const pct = cache.length ? Math.round((sudah / cache.length) * 100) : 0;
  const fbCount = useMemo(() => {
    const done = cache.filter((x) => x.sudahIsi);
    const by = BADGES.map((b) => done.filter((x) => x.feedbackData?.badge === b).length);
    return [...by, done.length - by.reduce((a, b) => a + b, 0)];
  }, [cache]);

  const go = (t: Tab, f?: Filter) => { if (f) setFilter(f); setTab(t); setMenu(false); mainRef.current?.scrollTo({ top: 0, behavior: "smooth" }); };
  const kw = search.trim().toLowerCase();
  const list = cache.filter((x) => (filter === "sudah" ? x.sudahIsi : filter === "belum" ? !x.sudahIsi : true))
    .filter((x) => !kw || (x.Nama || "").toLowerCase().includes(kw) || (x.Kelas || "").toLowerCase().includes(kw) || (x.UserID || "").toLowerCase().includes(kw));
  const selected = cache.find((x) => x.UserID === active);
  const heading = filter === "sudah" ? "Siswa sudah mengisi jurnal" : filter === "belum" ? "Siswa belum mengisi jurnal" : "Semua siswa binaan";
  const notif = belum > 0 ? { tone: "warning" as const, t: `Terdapat ${belum} siswa binaan belum menyerahkan jurnal pada tanggal terpilih.` }
    : cache.length > 0 ? { tone: "success" as const, t: `Seluruh siswa binaan (${cache.length} siswa) telah mengisi jurnal pada tanggal ini.` }
    : { tone: "info" as const, t: "Belum ada siswa binaan terdaftar." };
  const icon = { size: 16, strokeWidth: 1.75, "aria-hidden": true } as const;

  return (
    <div className={s.app}>
      {menu && <div className={s.backdrop} onClick={() => setMenu(false)} />}
      <aside className={`${s.sidebar} ${menu ? s.sidebarOpen : ""}`}>
        <div className={s.sbHead}>
          <div className={s.row2}><Logo size={32} /><div><div className={s.h3}>Jurnal binaan</div><div className={s.muted}>SMP Maria Immaculata</div></div></div>
          <span className={s.mobileOnly}><Button variant="ghost" aria-label="Tutup menu" onClick={() => setMenu(false)}><X {...icon} /></Button></span>
        </div>
        <div className={s.sbUser}><Avatar name={user.Nama} size="sm" /><div className={s.userText}><div className={s.h3}>{user.Nama}</div><div className={s.muted}>Guru pembina</div></div></div>
        <nav className={s.sbNav}>
          <p className={s.group}>Menu utama</p>
          <NavItem icon={<LayoutDashboard {...icon} />} label="Dasbor utama" active={tab === "dashboard"} onClick={() => go("dashboard")} />
          <p className={s.group}>Filter</p>
          <div className={s.sbDate}><DatePicker label="Tanggal pantau" locale="id-ID" value={tanggal} onChange={(d) => d && setTanggal(d)} /></div>
          <NavItem icon={<Users {...icon} />} label="Semua siswa" count={cache.length} active={tab === "siswa" && filter === "all"} onClick={() => go("siswa", "all")} />
          <NavItem icon={<CheckCircle2 {...icon} />} label="Sudah mengisi" count={sudah} active={tab === "siswa" && filter === "sudah"} onClick={() => go("siswa", "sudah")} />
          <NavItem icon={<Clock {...icon} />} label="Belum mengisi" count={belum} active={tab === "siswa" && filter === "belum"} onClick={() => go("siswa", "belum")} />
          <p className={s.group}>Perangkat</p>
          <NavItem icon={<SlidersHorizontal {...icon} />} label="Atur form binaan" active={tab === "form"} onClick={() => go("form")} />
          <NavItem icon={<Printer {...icon} />} label="Cetak dan pratinjau" active={tab === "print"} onClick={() => go("print")} />
        </nav>
        <div className={s.sbFoot}><Button variant="secondary" onClick={onLogout}><LogOut {...icon} /> Keluar</Button></div>
      </aside>

      <div className={s.content}>
        <div className={s.mobileBar}>
          <Button variant="secondary" aria-label="Buka menu navigasi" onClick={() => setMenu(true)}><Menu {...icon} /> Menu</Button>
          <span className={s.h3}>SMP Maria Immaculata</span>
        </div>
        <main ref={mainRef} className={s.main}>
          {tab === "dashboard" && (
            <>
              <section className={s.hero}>
                <div className={s.heroText}>
                  <p className={s.muted}>{tanggal.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
                  <h1 className={s.display}>Selamat datang, {user.Nama}</h1>
                  {loading ? <Skeleton lines={1} label="Memuat data siswa binaan" /> : <Alert tone={notif.tone} title={notif.t} />}
                </div>
                <div className={s.heroStat}>
                  <Progress label="Tingkat pengisian" value={sudah} max={Math.max(cache.length, 1)} showValue />
                  <p className={s.muted}>{sudah} dari {cache.length} siswa mengisi pada tanggal ini</p>
                </div>
              </section>
              <section className={s.kpis}>
                <Tile onClick={() => go("siswa", "all")}><MetricCard label="Total siswa binaan" value={cache.length} suffix={SISWA} context="Siswa terdaftar" /></Tile>
                <Tile onClick={() => go("siswa", "sudah")}><MetricCard label="Sudah mengisi jurnal" value={sudah} suffix={SISWA} context="Terkirim pada tanggal ini" /></Tile>
                <Tile onClick={() => go("siswa", "belum")}><MetricCard label="Belum mengisi jurnal" value={belum} suffix={SISWA} context="Menunggu pengisian" /></Tile>
              </section>
              <section className={s.charts}>
                <article className={s.card}>
                  <h2 className={s.h3}>Tren pengisian jurnal (7 hari terakhir)</h2>
                  <p className={s.muted}>Jumlah siswa yang sudah mengirimkan jurnal pada setiap tanggal.</p>
                  {trend.length > 0 && <BarChart data={trend} label="Siswa sudah mengisi" period={`${trend[0].axisLabel} sampai ${trend[6].axisLabel}`} unit={SISWA} averageLabel="Rata-rata harian" valueLabel="Jumlah" categoryLabel="Hari" height={220} />}
                </article>
                <article className={s.card}>
                  <h2 className={s.h3}>Komposisi status pada tanggal terpilih</h2>
                  <p className={s.muted}>Rasio pengisian dan ringkasan evaluasi pembina.</p>
                  <DonutChart label="Status pengisian jurnal" unit="siswa" totalLabel="Total" emptyLabel="Belum ada pengisian" size={160} thickness={18}
                    data={[{ key: "sudah", label: "Sudah mengisi", value: sudah }, { key: "belum", label: "Belum mengisi", value: belum }]} />
                  <h3 className={s.h3}>Status umpan balik guru</h3>
                  <div className={s.fbGrid}>
                    {[...BADGES, "Menunggu penilaian"].map((b, i) => <div key={b} className={s.fbTile}><strong>{fbCount[i]}</strong><small>{b}</small></div>)}
                  </div>
                </article>
              </section>
            </>
          )}

          {tab === "siswa" && (
            <section className={s.split}>
              <article className={`${s.panel} ${s.tinted}`}>
                <div className={s.panelHead}><h3 className={s.h3}>{heading}</h3><Badge tone="info">{list.length} siswa</Badge></div>
                <div className={s.searchBox}><SearchField label="Cari siswa" placeholder="Cari nama atau kelas..." value={search} onValueChange={setSearch} /></div>
                <div className={s.list} aria-busy={loading}>
                  {loading ? <Skeleton lines={4} label="Memuat siswa binaan" /> : list.length === 0 ? <EmptyState title="Tidak ada data siswa" description="Tidak ada siswa yang cocok dengan filter ini." /> : list.map((x) => (
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
                {selected ? <Detail key={selected.UserID + String(selected.sudahIsi)} siswa={selected} tanggal={tanggal} user={user} schema={schema} onSaved={async () => { const id = selected.UserID; await load(); setActive(id); }} />
                  : <div className={s.empty}><EmptyState title="Pilih siswa binaan" description="Klik nama siswa di sebelah kiri untuk memeriksa jurnal dan memberi umpan balik." /></div>}
              </article>
            </section>
          )}

          {tab === "form" && <FormPage user={user} schema={schema} reload={loadSchema} />}
          {tab === "print" && <PrintPage cache={cache} schema={schema} user={user} />}
        </main>
      </div>
    </div>
  );
}

function Siswa({ user, onLogout }: { user: User; onLogout: () => void }) {
  const notify = useNotify();
  const [schema, setSchema] = useState<Field[] | null>(null);
  const [tanggal, setTanggal] = useState(() => new Date());
  const [ans, setAns] = useState<Record<string, string | boolean>>({});
  const [busy, setBusy] = useState(false);
  const [fb, setFb] = useState<{ badge?: string; text: string; date?: string } | null>(null);
  const set = (id: string, v: string | boolean) => setAns((a) => ({ ...a, [id]: v }));
  const guru = q(user.ID_Guru_Pengampu || "");

  useEffect(() => {
    sbFetch(`form_kustom_guru?GuruID=eq.${guru}&order=Urutan.asc,id.asc&select=*`).then((r) => setSchema(r || [])).catch(() => setSchema([]));
  }, [guru]);

  useEffect(() => {
    (async () => {
      try {
        const rows = await sbFetch(`jurnal_siswa?UserID=eq.${q(user.UserID)}&or=(FeedbackBadge.not.is.null,FeedbackCatatan.not.is.null)&order=Tanggal.desc,id.desc&limit=1&select=Tanggal,FeedbackBadge,FeedbackCatatan`);
        const l = rows && rows[0];
        if (l && (l.FeedbackCatatan || l.FeedbackBadge)) {
          setFb({ badge: l.FeedbackBadge || undefined, text: l.FeedbackCatatan ? `"${l.FeedbackCatatan}"` : `Predikat evaluasi terakhir: ${l.FeedbackBadge}. Terus pertahankan semangat belajarmu!`, date: l.Tanggal ? `Evaluasi jurnal tanggal ${l.Tanggal}` : undefined });
        } else setFb({ text: `Selamat datang, ${user.Nama}! Silakan isi jurnal harianmu hari ini dengan jujur dan penuh semangat.` });
      } catch { setFb({ text: `Selamat datang, ${user.Nama}! Silakan isi jurnal harianmu hari ini.` }); }
    })();
  }, [user.UserID, user.Nama]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const tgl = iso(tanggal);
    try {
      const fresh: Field[] = (await sbFetch(`form_kustom_guru?GuruID=eq.${guru}&select=*`)) || [];
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
    <div className={s.studentShell}>
      <header className={s.studentHead}>
        <div className={s.row2}><Avatar name={user.Nama} /><div><h1 className={s.h3}>{user.Nama}</h1><p className={s.muted}>{user.Kelas || "Kelas binaan"}</p></div></div>
        <Button variant="secondary" onClick={onLogout}><LogOut size={16} strokeWidth={1.75} aria-hidden /> Keluar</Button>
      </header>
      <main className={s.studentMain}>
        <form className={s.stack} onSubmit={submit}>
          <div className={s.cardRow}><DatePicker label="Tanggal jurnal" locale="id-ID" value={tanggal} onChange={(d) => d && setTanggal(d)} /></div>
          <article className={`${s.card} ${s.tinted}`}>
            <div className={s.between}><h2 className={s.h3}>Sambutan guru pembina</h2>{fb?.badge && <Badge tone="info">{fb.badge}</Badge>}</div>
            {fb ? <p className={s.body}>{fb.text}</p> : <Skeleton lines={2} label="Memuat pesan dari guru pembina" />}
            {fb?.date && <p className={s.muted}>{fb.date}</p>}
          </article>
          {schema === null ? <Skeleton lines={3} label="Memuat form jurnal" /> : schema.length === 0 ? (
            <EmptyState title="Form belum diatur" description="Form jurnal belum diatur oleh guru pembina." />
          ) : schema.map((f, i) => {
            const label = `${i + 1}. ${f.Label}`;
            const id = `field_${f.FieldID}`;
            const v = String(ans[f.FieldID] ?? "");
            if (f.Type === "checkbox") return <div key={f.id} className={s.cardRow}><Checkbox id={id} name={f.FieldID} label={label} checked={ans[f.FieldID] === true} onCheckedChange={(c) => set(f.FieldID, c === true)} /></div>;
            if (f.Type === "dropdown") return <div key={f.id} className={s.cardRow}><Select id={id} name={f.FieldID} label={label} placeholder="Pilih penilaian" value={v} onValueChange={(x) => set(f.FieldID, x)} options={opts(f.Options).map((o) => ({ value: o, label: o }))} /></div>;
            if (f.Type === "textarea") return <div key={f.id} className={s.cardRow}><Textarea id={id} name={f.FieldID} label={label} rows={3} placeholder="Tuliskan uraian jawaban Anda..." value={v} onChange={(e) => set(f.FieldID, e.target.value)} /></div>;
            return <div key={f.id} className={s.cardRow}><Input id={id} name={f.FieldID} label={label} placeholder="Masukkan jawaban singkat..." value={v} onChange={(e) => set(f.FieldID, e.target.value)} /></div>;
          })}
          <Button type="submit" loading={busy}>Kirim jurnal harian</Button>
        </form>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  return <NotifyProvider><Shell user={user} setUser={setUser} /></NotifyProvider>;
}

function Shell({ user, setUser }: { user: User | null; setUser: (u: User | null) => void }) {
  const notify = useNotify();
  const login = (u: User) => { if (["Guru", "Admin", "Siswa"].includes(u.Role)) setUser(u); else notify("Gagal", "Role akun tidak dikenali.", "error"); };
  const logout = () => setUser(null);
  if (!user) return <Login onLogin={login} />;
  return user.Role === "Siswa" ? <Siswa key={user.UserID} user={user} onLogout={logout} /> : <Guru key={user.UserID} user={user} onLogout={logout} />;
}
