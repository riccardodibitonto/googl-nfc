"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  ChevronDown,
  CircleHelp,
  Copy,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Menu,
  Moon,
  Package,
  Pencil,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Sun,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type View = "Dashboard" | "Clienti" | "Inventario" | "Acquisti" | "Vendite" | "Impostazioni";
type Client = { id: string; name: string; initials: string; color: string; country: string; cards: number; delivered: number; revenue: number; url: string; google_place_id?: string };
type Sale = { id: string; client: string; client_id: string; quantity: number; total: number; date: string };
type Purchase = { id: string; quantity: number; total: number; date: string };
type NewPurchase = Omit<Purchase, "id">;
type NewSale = Omit<Sale, "id" | "client_id">;
type NewClient = Omit<Client, "id" | "cards" | "delivered" | "revenue">;

const nav = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Clienti", icon: Users },
  { label: "Inventario", icon: Package },
  { label: "Acquisti", icon: ShoppingBag },
  { label: "Vendite", icon: CreditCard },
  { label: "Impostazioni", icon: Settings },
] as const;

const euro = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);

function StatCard({ label, value, detail, icon: Icon, tone = "blue" }: { label: string; value: string; detail: string; icon: typeof Package; tone?: "blue" | "green" | "orange" | "purple" }) {
  const tones = {
    blue: "bg-[#eaf1ff] text-[#4169a8]",
    green: "bg-[#e8f6ee] text-[#37805a]",
    orange: "bg-[#fff3e4] text-[#bd7622]",
    purple: "bg-[#f2edff] text-[#7551ba]",
  };
  return (
    <div className="stat-card">
      <div className={`icon-box ${tones[tone]}`}><Icon size={19} strokeWidth={2} /></div>
      <p className="mt-5 text-[13px] font-medium text-[#788399]">{label}</p>
      <p className="mt-1 text-[26px] font-semibold tracking-tight text-[#1e293b]">{value}</p>
      <p className="mt-2 text-xs text-[#8d98a9]">{detail}</p>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/30 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1e293b]">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-[#8490a2] hover:bg-[#f4f6fa]" aria-label="Chiudi"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<View>("Dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [modal, setModal] = useState<"purchase" | "sale" | "client" | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const loadData = async () => {
    setLoading(true);
    const response = await fetch("/api/data", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) { notify(payload.error ?? "Impossibile caricare i dati."); setLoading(false); return; }
    setClients(payload.clients.map((item: { id: string; name: string; country: string; google_review_url?: string; google_place_id?: string }, index: number) => ({ id: item.id, name: item.name, initials: item.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), color: ["bg-[#e8f0ff] text-[#4169a8]", "bg-[#f9e8e4] text-[#af5846]", "bg-[#e8f5ed] text-[#42845c]"][index % 3], country: item.country, cards: 0, delivered: 0, revenue: 0, url: item.google_review_url ?? "", google_place_id: item.google_place_id })));
    setPurchases(payload.purchases.map((item: { id: string; quantity: number; total_cost: number; purchase_date: string }) => ({ id: item.id, quantity: item.quantity, total: Number(item.total_cost), date: item.purchase_date })));
    setSales(payload.sales.map((item: { id: string; client_id: string; quantity: number; total_revenue: number; sale_date: string; clients?: { name: string } | null }) => ({ id: item.id, client_id: item.client_id, client: item.clients?.name ?? "Cliente", quantity: item.quantity, total: Number(item.total_revenue), date: item.sale_date })));
    setLoading(false);
  };
  // Initial hydration must come from the database, not from client-side demo state.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { void loadData(); }, []);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDarkMode(window.localStorage.getItem("review-cards-theme") === "dark");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("review-cards-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const totals = useMemo(() => {
    const purchased = purchases.reduce((sum, item) => sum + item.quantity, 0);
    const sold = sales.reduce((sum, item) => sum + item.quantity, 0);
    const costs = purchases.reduce((sum, item) => sum + item.total, 0);
    const revenue = sales.reduce((sum, item) => sum + item.total, 0);
    const average = purchased ? costs / purchased : 0;
    return { purchased, sold, available: purchased - sold, costs, revenue, average, inventoryValue: (purchased - sold) * average, profit: revenue - sold * average, cashflow: revenue - costs };
  }, [purchases, sales]);

  const filteredClients = clients.map((client) => ({ ...client, cards: sales.filter((sale) => sale.client_id === client.id).reduce((sum, sale) => sum + sale.quantity, 0), delivered: sales.filter((sale) => sale.client_id === client.id).reduce((sum, sale) => sum + sale.quantity, 0), revenue: sales.filter((sale) => sale.client_id === client.id).reduce((sum, sale) => sum + sale.total, 0) })).filter((client) => client.name.toLowerCase().includes(search.toLowerCase()));

  async function mutate(url: string, options: RequestInit, success: string) {
    const response = await fetch(url, options);
    const payload = await response.json();
    if (!response.ok) { notify(payload.error ?? "Operazione non riuscita."); return false; }
    await loadData(); notify(success); return true;
  }

  function copyLink(url: string) {
    if (!url) return;
    void navigator.clipboard?.writeText(url);
    notify("Link copiato negli appunti");
  }

  async function signOut() {
    await getSupabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className={`app-shell ${darkMode ? "dark-mode" : ""}`}>
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={17} fill="currentColor" /></div>
          <div><p className="brand-name">Review Cards</p><p className="brand-subtitle">MANAGER</p></div>
        </div>
        <div className="workspace-switcher"><div className="workspace-icon"><Store size={16} /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-[#3d4960]">La tua attività</p><p className="text-[10px] text-[#9aa3b3]">Workspace principale</p></div><ChevronDown size={15} className="text-[#9aa3b3]" /></div>
        <p className="nav-heading">MENU PRINCIPALE</p>
        <nav className="space-y-1">
          {nav.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setView(label); setMobileNav(false); }} className={`nav-item ${view === label ? "active" : ""}`}><Icon size={17} /><span>{label}</span>{label === "Clienti" && <span className="nav-count">{clients.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="help-card"><CircleHelp size={17} className="text-[#7082a0]" /><div><p className="text-xs font-semibold text-[#4c5a70]">Hai bisogno di aiuto?</p><p className="mt-1 text-[10px] text-[#909bad]">Consulta la guida rapida</p></div></div><button className="user-row user-menu" onClick={() => void signOut()} title="Esci"><div className="avatar">RD</div><div className="min-w-0 flex-1 text-left"><p className="truncate text-xs font-semibold text-[#465268]">Riccardo Di Bitonto</p><p className="text-[10px] text-[#9aa3b3]">Esci dall’account</p></div><ChevronDown size={14} className="text-[#98a1b0]" /></button></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}><Menu size={20} /></button><div><p className="eyebrow">MARTEDÌ, 8 SETTEMBRE 2026</p><h1>{view === "Dashboard" ? "Buongiorno, Riccardo" : view}</h1></div><div className="top-actions"><div className="top-search"><Search size={16} /><input placeholder="Cerca..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><button className="icon-button theme-toggle" onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? "Attiva tema chiaro" : "Attiva tema scuro"} title={darkMode ? "Tema chiaro" : "Tema scuro"}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-button"><CircleHelp size={18} /></button><div className="avatar top-avatar">RD</div></div></header>
        {loading ? <div className="page-body"><div className="panel p-8 text-sm text-[#7a879a]">Caricamento dati dal database...</div></div> : view === "Dashboard" ? <Dashboard totals={totals} clientCount={clients.length} sales={sales} purchases={purchases} onAction={setModal} /> : <SectionView view={view} clients={filteredClients} totals={totals} sales={sales} purchases={purchases} onAction={setModal} copyLink={copyLink} onEdit={(client) => { const name = window.prompt("Nome attività", client.name); if (!name || name === client.name) return; void mutate("/api/clients", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: client.id, name, country: client.country, google_place_id: client.google_place_id, google_review_url: client.url }) }, "Cliente aggiornato"); }} onDelete={(type, id) => { if (!window.confirm(`Sei sicuro di voler eliminare questo ${type}?`)) return; void mutate(`/api/${type === "cliente" ? "clients" : type === "acquisto" ? "purchases" : "sales"}?id=${id}`, { method: "DELETE" }, `${type[0].toUpperCase()}${type.slice(1)} eliminato`); }} />}
      </main>
      {modal === "purchase" && <PurchaseModal available={totals.available} onClose={() => setModal(null)} onSave={async (item) => { if (await mutate("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: item.quantity, total_cost: item.total, purchase_date: item.date }) }, "Acquisto registrato")) setModal(null); }} />}
      {modal === "sale" && <SaleModal clients={clients} available={totals.available} onClose={() => setModal(null)} onSave={async (item) => { const client = clients.find((candidate) => candidate.name === item.client); if (client && await mutate("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: client.id, quantity: item.quantity, total_revenue: item.total, sale_date: item.date }) }, "Vendita registrata")) setModal(null); }} />}
      {modal === "client" && <ClientModal onClose={() => setModal(null)} onSave={async (client) => { if (await mutate("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: client.name, country: client.country, google_place_id: client.google_place_id, google_review_url: client.url }) }, "Cliente aggiunto")) setModal(null); }} />}
      {toast && <div className="toast"><span className="toast-dot" />{toast}</div>}
    </div>
  );
}

function Dashboard({ totals, clientCount, sales, purchases, onAction }: { totals: Totals; clientCount: number; sales: Sale[]; purchases: Purchase[]; onAction: (action: "purchase" | "sale" | "client") => void }) {
  return <div className="page-body">
    <div className="welcome-row"><div><p className="text-sm text-[#7a879a]">Ecco cosa sta succedendo oggi nel tuo workspace.</p></div><div className="flex gap-2"><button className="secondary-button" onClick={() => onAction("client")}><Plus size={15} /> Nuovo cliente</button><button className="primary-button" onClick={() => onAction("sale")}><Plus size={15} /> Registra vendita</button></div></div>
    <section className="stats-grid"><StatCard label="Clienti totali" value={String(clientCount)} detail="Dati dal database" icon={Users} tone="blue" /><StatCard label="Schede disponibili" value={totals.available.toLocaleString("it-IT")} detail={`${totals.sold} consegnate in totale`} icon={Package} tone="green" /><StatCard label="Ricavi totali" value={euro(totals.revenue)} detail="Dati dal database" icon={ArrowUpRight} tone="orange" /><StatCard label="Profitto" value={euro(totals.profit)} detail="Costo medio delle schede" icon={BarChart3} tone="purple" /></section>
    <div className="dashboard-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h2>Andamento finanziario</h2><p>Entrate e uscite negli ultimi 6 mesi</p></div><button className="select-button">Ultimi 6 mesi <ChevronDown size={14} /></button></div><div className="chart-legend"><span><i className="legend-dot revenue" /> Ricavi</span><span><i className="legend-dot costs" /> Costi</span></div><div className="fake-chart"><div className="y-labels"><span>€ 2.000</span><span>€ 1.500</span><span>€ 1.000</span><span>€ 500</span><span>€ 0</span></div><div className="chart-area"><div className="grid-lines"><i /><i /><i /><i /><i /></div><svg viewBox="0 0 600 190" preserveAspectRatio="none" className="chart-svg"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#7399ed" stopOpacity=".22" /><stop offset="100%" stopColor="#7399ed" stopOpacity="0" /></linearGradient></defs><path d="M0 145 C35 138 55 140 83 124 S125 130 165 105 S210 122 245 95 S290 112 330 76 S370 95 410 70 S455 87 490 45 S540 55 600 25 L600 190 L0 190Z" fill="url(#area)" /><path d="M0 145 C35 138 55 140 83 124 S125 130 165 105 S210 122 245 95 S290 112 330 76 S370 95 410 70 S455 87 490 45 S540 55 600 25" fill="none" stroke="#6f95e6" strokeWidth="2.5" /><path d="M0 164 C50 163 65 156 105 151 S150 160 190 142 S245 151 275 133 S325 143 360 120 S410 133 455 105 S510 120 550 102 S575 105 600 92" fill="none" stroke="#f0a85a" strokeWidth="2.5" strokeDasharray="5 5" /></svg><div className="x-labels"><span>Apr</span><span>Mag</span><span>Giu</span><span>Lug</span><span>Ago</span><span>Set</span></div></div></div></section><section className="panel inventory-panel"><div className="panel-heading"><div><h2>Stato inventario</h2><p>Riepilogo schede fisiche</p></div><button className="more-button">•••</button></div><div className="donut-wrap"><div className="donut"><div><strong>{totals.available}</strong><span>disponibili</span></div></div><div className="inventory-key"><p><i className="key-dot available" /> Disponibili <b>{totals.available}</b></p><p><i className="key-dot delivered" /> Consegnate <b>{totals.sold}</b></p><p><i className="key-dot total" /> Totali acquistate <b>{totals.purchased}</b></p></div></div><div className="inventory-value"><span>Valore inventario</span><strong>{euro(totals.inventoryValue)}</strong></div></section></div>
    <section className="panel activity-panel"><div className="panel-heading"><div><h2>Attività recente</h2><p>Ultimi movimenti di acquisto e vendita</p></div><button className="text-button">Vedi tutto <ArrowUpRight size={14} /></button></div><div className="activity-list">{[...purchases.map((item) => ({ type: "purchase", title: "Acquisto schede", description: `${item.quantity} schede dal fornitore`, amount: `−${euro(item.total)}`, date: item.date })), ...sales.map((item) => ({ type: "sale", title: item.client, description: `Consegna di ${item.quantity} schede`, amount: `+${euro(item.total)}`, date: item.date }))].slice(0, 4).map((item, index) => <div className="activity-row" key={`${item.title}-${index}`}><div className={`activity-icon ${item.type}`}><>{item.type === "purchase" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#3e4a60]">{item.title}</p><p className="mt-1 text-xs text-[#99a3b2]">{item.description}</p></div><div className="text-right"><p className={`text-sm font-semibold ${item.type === "purchase" ? "text-[#dc8251]" : "text-[#4b9a70]"}`}>{item.amount}</p><p className="mt-1 text-[11px] text-[#a4adba]">{item.date}</p></div></div>)}</div></section>
  </div>;
}

type Totals = { purchased: number; sold: number; available: number; costs: number; revenue: number; average: number; inventoryValue: number; profit: number; cashflow: number };

function SectionView({ view, clients, totals, sales, purchases, onAction, copyLink, onEdit, onDelete }: { view: View; clients: Client[]; totals: Totals; sales: Sale[]; purchases: Purchase[]; onAction: (action: "purchase" | "sale" | "client") => void; copyLink: (url: string) => void; onEdit: (client: Client) => void; onDelete: (type: "cliente" | "acquisto" | "vendita", id: string) => void }) {
  if (view === "Clienti") return <div className="page-body"><div className="section-title"><div><p className="text-sm text-[#7a879a]">Gestisci le attività e i loro link per le recensioni.</p></div><button className="primary-button" onClick={() => onAction("client")}><Plus size={15} /> Nuovo cliente</button></div><div className="panel table-panel"><div className="table-toolbar"><div><h2>Clienti</h2><p>{clients.length} attività registrate</p></div><div className="table-search"><Search size={15} /><input placeholder="Cerca cliente..." /></div></div><div className="table-wrap"><table><thead><tr><th>ATTIVITÀ</th><th>PAESE</th><th>SCHEDE</th><th>RICAVI</th><th>LINK GOOGLE</th><th /></tr></thead><tbody>{clients.map((client) => <tr key={client.id}><td><div className="client-cell"><span className={`client-avatar ${client.color}`}>{client.initials}</span><div><p className="font-semibold text-[#3e4a60]">{client.name}</p><p className="text-xs text-[#9ba5b5]">Dal database</p></div></div></td><td>{client.country}</td><td><span className="status-badge">{client.cards} schede</span></td><td className="font-semibold text-[#3e4a60]">{euro(client.revenue)}</td><td>{client.url ? <button className="copy-link" onClick={() => copyLink(client.url)}><Copy size={13} /> Copia link</button> : <span className="text-xs text-[#a7afbc]">Non configurato</span>}</td><td><button className="more-button" onClick={() => onEdit(client)}><Pencil size={14} /></button><button className="more-button" onClick={() => onDelete("cliente", client.id)}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div></div></div>;
  if (view === "Inventario") return <div className="page-body"><div className="section-title"><div><p className="text-sm text-[#7a879a]">Il saldo viene calcolato automaticamente dai movimenti.</p></div><button className="secondary-button" onClick={() => onAction("purchase")}><Plus size={15} /> Registra acquisto</button></div><section className="stats-grid"><StatCard label="Schede acquistate" value={totals.purchased.toLocaleString("it-IT")} detail={`Costo totale ${euro(totals.costs)}`} icon={ShoppingBag} tone="blue" /><StatCard label="Schede vendute" value={totals.sold.toLocaleString("it-IT")} detail="Da tutti i clienti" icon={ArrowUpRight} tone="orange" /><StatCard label="Disponibili" value={totals.available.toLocaleString("it-IT")} detail="Saldo attuale" icon={Package} tone="green" /><StatCard label="Costo medio" value={euro(totals.average)} detail={`Valore inventario ${euro(totals.inventoryValue)}`} icon={BarChart3} tone="purple" /></section><div className="panel table-panel"><div className="table-toolbar"><div><h2>Movimenti inventario</h2><p>Storico completo delle variazioni</p></div></div><div className="table-wrap"><table><thead><tr><th>DATA</th><th>TIPO</th><th>DESCRIZIONE</th><th>QUANTITÀ</th><th>IMPORTO</th></tr></thead><tbody>{[...purchases.map((p) => ({ date: p.date, type: "Acquisto", description: "Fornitore esterno", quantity: `+${p.quantity}`, amount: `−${euro(p.total)}` })), ...sales.map((s) => ({ date: s.date, type: "Vendita", description: s.client, quantity: `−${s.quantity}`, amount: `+${euro(s.total)}` }))].map((row, index) => <tr key={index}><td>{row.date}</td><td><span className={`movement ${row.type === "Acquisto" ? "purchase" : "sale"}`}>{row.type}</span></td><td>{row.description}</td><td className="font-semibold">{row.quantity}</td><td className="font-semibold">{row.amount}</td></tr>)}</tbody></table></div></div></div>;
  if (view === "Acquisti") return <div className="page-body"><div className="section-title"><div><p className="text-sm text-[#7a879a]">Registra gli acquisti dal fornitore per aggiornare il magazzino.</p></div><button className="primary-button" onClick={() => onAction("purchase")}><Plus size={15} /> Nuovo acquisto</button></div><div className="panel table-panel"><div className="table-toolbar"><div><h2>Acquisti</h2><p>{purchases.length} registrazioni</p></div></div><div className="table-wrap"><table><thead><tr><th>DATA</th><th>QUANTITÀ</th><th>COSTO TOTALE</th><th>COSTO UNITARIO</th><th /></tr></thead><tbody>{purchases.map((item) => <tr key={item.id}><td>{item.date}</td><td className="font-semibold">{item.quantity} schede</td><td className="font-semibold text-[#dc8251]">{euro(item.total)}</td><td>{euro(item.total / item.quantity)}</td><td><button className="more-button" onClick={() => onDelete("acquisto", item.id)}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div></div></div>;
  if (view === "Vendite") return <div className="page-body"><div className="section-title"><div><p className="text-sm text-[#7a879a]">Registra consegne e vendite senza superare il saldo disponibile.</p></div><button className="primary-button" onClick={() => onAction("sale")}><Plus size={15} /> Nuova vendita</button></div><div className="panel table-panel"><div className="table-toolbar"><div><h2>Vendite e consegne</h2><p>{sales.length} registrazioni · {euro(totals.revenue)} di ricavi</p></div></div><div className="table-wrap"><table><thead><tr><th>DATA</th><th>CLIENTE</th><th>SCHEDE</th><th>RICAVO</th><th>PREZZO UNITARIO</th><th /></tr></thead><tbody>{sales.map((item) => <tr key={item.id}><td>{item.date}</td><td className="font-semibold text-[#3e4a60]">{item.client}</td><td>{item.quantity}</td><td className="font-semibold text-[#4b9a70]">{euro(item.total)}</td><td>{euro(item.total / item.quantity)}</td><td><button className="more-button" onClick={() => onDelete("vendita", item.id)}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div></div></div>;
  return <div className="page-body"><div className="section-title"><div><p className="text-sm text-[#7a879a]">Preferenze del workspace e configurazione integrazioni.</p></div></div><div className="settings-grid"><div className="panel settings-card"><div className="settings-icon"><Building2 size={18} /></div><h2>Informazioni attività</h2><p>Personalizza il nome visualizzato nel workspace.</p><label>Nome attività<input defaultValue="Review Cards Manager" /></label><button className="secondary-button">Salva modifiche</button></div><div className="panel settings-card"><div className="settings-icon green"><ExternalLink size={18} /></div><h2>Google Places API</h2><p>La chiave viene utilizzata solo dal server.</p><div className="api-status"><span className="status-dot" /> Modalità fallback attiva</div><p className="mt-4 text-xs leading-5 text-[#929baa]">Configura <code>GOOGLE_PLACES_API_KEY</code> nel file .env.local per abilitare la ricerca automatica.</p></div></div></div>;
}

function Field({ label, type = "text", placeholder, value, onChange }: { label: string; type?: string; placeholder?: string; value?: string; onChange?: (value: string) => void }) {
  return <label className="form-label">{label}<input type={type} placeholder={placeholder} value={value} onChange={(event) => onChange?.(event.target.value)} /></label>;
}

function PurchaseModal({ onClose, onSave }: { available: number; onClose: () => void; onSave: (item: NewPurchase) => void }) {
  const [quantity, setQuantity] = useState(""); const [total, setTotal] = useState("");
  return <Modal title="Registra acquisto" onClose={onClose}><div className="form-grid"><Field label="Quantità schede" type="number" placeholder="es. 100" value={quantity} onChange={setQuantity} /><Field label="Costo totale (€)" type="number" placeholder="es. 180" value={total} onChange={setTotal} /></div><Field label="Data" type="date" value="2026-09-08" /><Field label="Note (opzionale)" placeholder="Numero ordine o note..." /><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Annulla</button><button className="primary-button" disabled={!quantity || !total} onClick={() => onSave({ quantity: Number(quantity), total: Number(total), date: "08/09/2026" })}>Salva acquisto</button></div></Modal>;
}

function SaleModal({ clients, available, onClose, onSave }: { clients: Client[]; available: number; onClose: () => void; onSave: (item: NewSale) => void }) {
  const [client, setClient] = useState(clients[0]?.name ?? ""); const [quantity, setQuantity] = useState(""); const [total, setTotal] = useState("");
  const invalid = Number(quantity) > available;
  return <Modal title="Registra vendita" onClose={onClose}><label className="form-label">Cliente<select value={client} onChange={(event) => setClient(event.target.value)}>{clients.map((item) => <option key={item.name}>{item.name}</option>)}</select></label><div className="form-grid"><Field label="Quantità schede" type="number" placeholder={`Max ${available}`} value={quantity} onChange={setQuantity} /><Field label="Prezzo totale (€)" type="number" placeholder="es. 160" value={total} onChange={setTotal} /></div>{invalid && <p className="error-message">La quantità supera le {available} schede disponibili.</p>}<Field label="Data" type="date" value="2026-09-08" /><Field label="Note (opzionale)" placeholder="Aggiungi una nota..." /><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Annulla</button><button className="primary-button" disabled={!quantity || !total || invalid} onClick={() => onSave({ client, quantity: Number(quantity), total: Number(total), date: "08/09/2026" })}>Salva vendita</button></div></Modal>;
}

function ClientModal({ onClose, onSave }: { onClose: () => void; onSave: (client: NewClient) => void }) {
  const [name, setName] = useState(""); const [country, setCountry] = useState("Italia"); const [placeId, setPlaceId] = useState(""); const [found, setFound] = useState(false); const [results, setResults] = useState<Array<{ placeId: string; name: string; address: string; rating: number | null }>>([]); const [searching, setSearching] = useState(false); const [searchError, setSearchError] = useState("");
  const generated = placeId ? `https://search.google.com/local/writereview?placeid=${placeId}` : "";
  async function searchPlaces() {
    setSearching(true);
    setSearchError("");
    setResults([]);
    setFound(false);
    try {
      const response = await fetch(`/api/places/search?name=${encodeURIComponent(name)}&country=${encodeURIComponent(country)}`);
      const payload = await response.json() as { results?: Array<{ placeId: string; name: string; address: string; rating: number | null }>; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Ricerca Google non riuscita.");
      setResults(payload.results ?? []);
      setFound(true);
      if (!payload.results?.length) setSearchError("Nessuna attività trovata. Verifica nome e paese.");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Ricerca Google non riuscita.");
    } finally {
      setSearching(false);
    }
  }
  return <Modal title="Nuovo cliente" onClose={onClose}><Field label="Nome attività" placeholder="es. Trattoria del Borgo" value={name} onChange={setName} /><Field label="Paese" value={country} onChange={setCountry} /><div className="place-search"><div className="flex-1"><Field label="Google Place ID (fallback sviluppo)" placeholder="Inserisci solo senza API configurata" value={placeId} onChange={(value) => { setPlaceId(value); setSearchError(""); }} /></div><button className="secondary-button find-button" disabled={!name || !country || searching} onClick={() => void searchPlaces()}><Search size={14} /> {searching ? "Cerco..." : "Trova attività"}</button></div>{searchError && <p className="error-message">{searchError}</p>}{found && results.map((result) => <button key={result.placeId} className="place-result w-full text-left" onClick={() => { setPlaceId(result.placeId); setName(result.name); setSearchError(""); }}><div className="place-result-icon"><Store size={16} /></div><div><p className="font-semibold text-[#435168]">{result.name}</p><p className="text-xs text-[#8e99aa]">{result.address}{result.rating ? ` · ★ ${result.rating}` : ""}</p></div><span className="result-check">✓</span></button>)}{generated && <div className="generated-link"><ExternalLink size={14} /><span className="truncate">{generated}</span><button className="copy-link" onClick={() => void navigator.clipboard?.writeText(generated)}><Copy size={13} /> Copia</button></div>}<div className="modal-actions"><button className="secondary-button" onClick={onClose}>Annulla</button><button className="primary-button" disabled={!name || !placeId} onClick={() => onSave({ name, country, initials: name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), color: "bg-[#f2edff] text-[#7551ba]", url: generated, google_place_id: placeId })}>Salva cliente</button></div></Modal>;
}
