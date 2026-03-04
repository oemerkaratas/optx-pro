import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, PieChart, Pie, Legend
} from "recharts";

/* ══════════ THEME — Bloomberg amber terminal ══════════ */
const C = {
  bg:        "#07080c",
  bg2:       "#0b0d14",
  surface:   "#0f1218",
  border:    "#181e2e",
  borderLit: "#253045",
  amber:     "#f5a623",
  amberDim:  "rgba(245,166,35,0.10)",
  amberHot:  "rgba(245,166,35,0.22)",
  green:     "#00d68f",
  greenDim:  "rgba(0,214,143,0.10)",
  red:       "#ff4757",
  redDim:    "rgba(255,71,87,0.10)",
  blue:      "#4fc3f7",
  blueDim:   "rgba(79,195,247,0.10)",
  purple:    "#b39ddb",
  purpleDim: "rgba(179,157,219,0.10)",
  cyan:      "#18ffff",
  cyanDim:   "rgba(24,255,255,0.08)",
  text:      "#dde3f0",
  text2:     "#7a8caa",
  text3:     "#3d4e6a",
  mono:      "'Share Tech Mono', 'Courier New', monospace",
  sans:      "'Barlow Condensed', sans-serif",
};

/* ══════════ SEED DATA ══════════ */
const SEED = [
  { id:"s1", strategy:"Wheel", ticker:"SOFI", type:"Sell",     event:"Put",        strike:16,   qty:1, opn:"2025-02-23", exp:"2025-02-27", cls:"2025-02-27", fill:0.08,  closePrice:0.00,  fee:0.04, collateral:1600, iv:32, delta:-0.18, theta:0.04, dte:4,  broker:"Robinhood", status:"Closed", tags:"",         note:"Opening wheel put" },
  { id:"s2", strategy:"Wheel", ticker:"SOFI", type:"Sell",     event:"Put",        strike:18.5, qty:1, opn:"2025-02-26", exp:"2025-02-27", cls:"2025-02-27", fill:0.08,  closePrice:0.00,  fee:0.04, collateral:1850, iv:35, delta:-0.22, theta:0.06, dte:1,  broker:"Robinhood", status:"Closed", tags:"",         note:"" },
  { id:"s3", strategy:"Wheel", ticker:"SOFI", type:"Assigned", event:"Assignment", strike:18.5, qty:1, opn:"2025-02-27", exp:"2025-02-27", cls:"2025-03-06", fill:18.50, closePrice:18.00, fee:0.00, collateral:1850, iv:0,  delta:1,     theta:0,    dte:0,  broker:"Robinhood", status:"Closed", tags:"assigned", note:"Assigned — taking shares" },
  { id:"s4", strategy:"Wheel", ticker:"SOFI", type:"Sell",     event:"Call",       strike:18,   qty:1, opn:"2025-03-02", exp:"2025-03-06", cls:"2025-03-06", fill:0.54,  closePrice:0.00,  fee:0.04, collateral:1850, iv:40, delta:0.35,  theta:0.12, dte:4,  broker:"Robinhood", status:"Closed", tags:"",         note:"Covered call on shares" },
  { id:"s5", strategy:"Wheel", ticker:"SOFI", type:"Sell",     event:"Put",        strike:17,   qty:1, opn:"2025-03-03", exp:"2025-03-06", cls:"2025-03-06", fill:0.13,  closePrice:0.00,  fee:0.04, collateral:1700, iv:38, delta:-0.20, theta:0.05, dte:3,  broker:"Robinhood", status:"Closed", tags:"",         note:"" },
];

/* ══════════ MATH ══════════ */
const daysBetween = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
const calcPL = t => {
  if (t.event === "Assignment") return (parseFloat(t.closePrice) - parseFloat(t.fill)) * parseFloat(t.qty) * 100;
  return (parseFloat(t.fill) - parseFloat(t.closePrice)) * parseFloat(t.qty) * 100 - parseFloat(t.fee || 0);
};
const enrich = t => {
  const pl   = calcPL(t);
  const days = daysBetween(t.opn, t.cls || t.opn);
  const coll = parseFloat(t.collateral) || 1;
  const roc  = (pl / coll) * 100;
  const annR = (roc / days) * 365;
  const maxP = parseFloat(t.fill) * parseFloat(t.qty) * 100;
  return { ...t, pl, days, roc, annRoc: annR, ppd: pl / days, maxProfit: maxP, pctOfMax: maxP > 0 ? (pl / maxP) * 100 : 0 };
};

const f$  = v => { const a = Math.abs(v).toFixed(2); return v >= 0 ? `+$${a}` : `-$${a}`; };
const fp  = v => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const f2  = v => parseFloat(v || 0).toFixed(2);

/* ══════════ CONSTANTS ══════════ */
const BLANK = {
  strategy:"Wheel", ticker:"", type:"Sell", event:"Put",
  strike:"", qty:"1", opn:"", exp:"", cls:"",
  fill:"", closePrice:"0", fee:"0.04", collateral:"",
  iv:"", delta:"", theta:"", dte:"",
  status:"Closed", broker:"Robinhood", tags:"", note:""
};
const SNP_HIST    = 10.5;
const PIE_COLORS  = [C.amber, C.green, C.blue, C.purple, C.cyan, C.red];
const STORAGE_KEY = "optx_pro_trades_v1";

/* ══════════ SMALL COMPONENTS ══════════ */
const Badge = ({ color, children }) => (
  <span style={{
    background: color + "22", color, border: `1px solid ${color}44`,
    borderRadius: 3, padding: "1px 7px", fontSize: 10,
    fontFamily: C.mono, fontWeight: 700, letterSpacing: "0.06em", whiteSpace: "nowrap"
  }}>{children}</span>
);

const KPI = ({ label, value, color, sub }) => (
  <div style={{
    background: `linear-gradient(135deg, ${C.surface} 0%, ${C.bg2} 100%)`,
    border: `1px solid ${C.border}`, borderTop: `2px solid ${color}`,
    borderRadius: 8, padding: "16px 18px", flex: 1, minWidth: 130,
    position: "relative", overflow: "hidden",
  }}>
    <div style={{ position:"absolute", top:0, right:0, width:60, height:60, background:`radial-gradient(circle at top right, ${color}18, transparent 70%)`, pointerEvents:"none" }} />
    <div style={{ fontSize:10, color:C.text2, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:6, fontFamily:C.sans }}>{label}</div>
    <div style={{ fontSize:22, fontWeight:700, color, fontFamily:C.mono, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:C.text3, marginTop:5, fontFamily:C.sans }}>{sub}</div>}
  </div>
);

const Tip = ({ content }) => (
  <span title={content} style={{ cursor:"help", color:C.text3, fontSize:10, marginLeft:4 }}>(?)</span>
);

const FormField = ({ label, children, tip }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4, flex:1, minWidth:90 }}>
    <label style={{ fontSize:9, color:C.text2, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:C.sans, display:"flex", alignItems:"center" }}>
      {label}{tip && <Tip content={tip} />}
    </label>
    {children}
  </div>
);

const iStyle = {
  background: C.bg, border: `1px solid ${C.border}`,
  borderRadius: 5, color: C.text, padding: "7px 10px",
  fontSize: 12, fontFamily: C.mono, outline: "none", width: "100%",
};

const Sel = ({ val, onChange, opts }) => (
  <select value={val} onChange={e => onChange(e.target.value)} style={iStyle}>
    {opts.map(o => Array.isArray(o)
      ? <option key={o[0]} value={o[0]}>{o[1]}</option>
      : <option key={o} value={o}>{o}</option>)}
  </select>
);

const Inp = ({ val, onChange, type = "text", placeholder = "" }) => (
  <input value={val} type={type} placeholder={placeholder}
    onChange={e => onChange(e.target.value)} style={iStyle} />
);

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#141928", border:`1px solid ${C.borderLit}`, borderRadius:7, padding:"10px 14px", fontSize:11, fontFamily:C.mono }}>
      <div style={{ color:C.text2, marginBottom:5 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color:p.color }}>
          {p.name}: {typeof p.value === "number" ? (p.value >= 0 ? "+" : "") + p.value.toFixed(2) : p.value}
          {p.name?.includes("ROC") || p.name?.includes("S&P") || p.name?.includes("%") ? "%" : "$"}
        </div>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════ */
export default function App() {
  const [rawTrades, setRawTrades] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : SEED;
    } catch { return SEED; }
  });
  const [tab, setTab]         = useState("overview");
  const [form, setForm]       = useState(BLANK);
  const [editId, setEditId]   = useState(null);
  const [panel, setPanel]     = useState(false);
  const [snpYTD, setSnpYTD]   = useState("-0.8");
  const [filter, setFilter]   = useState({ ticker:"ALL", event:"ALL", strategy:"ALL" });
  const [sort, setSort]       = useState({ key:"opn", dir:1 });
  const [toast, setToast]     = useState(null);
  const [expandRow, setExpandRow] = useState(null);

  // Persist to localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rawTrades)); } catch {}
  }, [rawTrades]);

  const showToast = (msg, color = C.green) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2500);
  };

  const trades = useMemo(() =>
    rawTrades.map(enrich).sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key];
      return typeof av === "string" ? av.localeCompare(bv) * sort.dir : (av - bv) * sort.dir;
    }), [rawTrades, sort]);

  const filtered = useMemo(() =>
    trades.filter(t =>
      (filter.ticker   === "ALL" || t.ticker   === filter.ticker) &&
      (filter.event    === "ALL" || t.event    === filter.event) &&
      (filter.strategy === "ALL" || t.strategy === filter.strategy)
    ), [trades, filter]);

  const tickers    = ["ALL", ...new Set(trades.map(t => t.ticker))];
  const strategies = ["ALL", ...new Set(trades.map(t => t.strategy))];

  /* ── Global stats ── */
  const totalPL   = filtered.reduce((s, t) => s + t.pl, 0);
  const wins      = filtered.filter(t => t.pl > 0).length;
  const losses    = filtered.filter(t => t.pl < 0).length;
  const winRate   = filtered.length ? (wins / filtered.length) * 100 : 0;
  const maxColl   = filtered.length ? Math.max(...filtered.map(t => parseFloat(t.collateral) || 0)) : 1;
  const totalROC  = (totalPL / maxColl) * 100;
  const avgAnnROC = filtered.length ? filtered.reduce((s, t) => s + t.annRoc, 0) / filtered.length : 0;
  const snpNum    = parseFloat(snpYTD) || 0;
  const alpha     = avgAnnROC - snpNum;
  const avgDTE    = filtered.length ? filtered.reduce((s, t) => s + t.days, 0) / filtered.length : 0;
  const largestWin = filtered.length ? Math.max(...filtered.map(t => t.pl)) : 0;
  const largestL   = filtered.length ? Math.min(...filtered.map(t => t.pl)) : 0;
  const expectancy = filtered.length ? totalPL / filtered.length : 0;
  const profitFactor = (() => {
    const g = filtered.filter(t => t.pl > 0).reduce((s, t) => s + t.pl, 0);
    const l = Math.abs(filtered.filter(t => t.pl < 0).reduce((s, t) => s + t.pl, 0));
    return l ? (g / l).toFixed(2) : "∞";
  })();

  /* ── Charts data ── */
  const cumulData = useMemo(() => {
    let run = 0;
    return [...filtered]
      .sort((a, b) => new Date(a.cls || a.opn) - new Date(b.cls || b.opn))
      .map(t => { run += t.pl; return { date: (t.cls || t.opn).slice(5), pl: +run.toFixed(2) }; });
  }, [filtered]);

  const monthlyData = useMemo(() => {
    const m = {};
    filtered.forEach(t => {
      const k = (t.cls || t.opn).slice(0, 7);
      m[k] = (m[k] || 0) + t.pl;
    });
    return Object.entries(m).sort().map(([k, v]) => ({ month: k.slice(5), pl: +v.toFixed(2) }));
  }, [filtered]);

  const byEvent = useMemo(() => {
    const m = {};
    filtered.forEach(t => {
      if (!m[t.event]) m[t.event] = { count:0, pl:0 };
      m[t.event].count++; m[t.event].pl += t.pl;
    });
    return Object.entries(m).map(([k, v]) => ({ name:k, pl:+v.pl.toFixed(2), count:v.count }));
  }, [filtered]);

  /* ── Form handlers ── */
  const fSet = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const autoFillCollateral = (event, strike, qty) => {
    const s = parseFloat(strike), q = parseFloat(qty) || 1;
    if (!s) return;
    if (event === "Put" || event === "Call") fSet("collateral", String((s * 100 * q).toFixed(0)));
  };

  const submitTrade = () => {
    const required = ["ticker", "strike", "opn", "cls", "fill", "collateral"];
    if (required.some(k => !form[k])) { showToast("Fill in required fields (*)", C.red); return; }
    const trade = {
      ...form,
      id: editId || "t" + Date.now(),
      strike: +form.strike, qty: +form.qty || 1,
      fill: +form.fill, closePrice: +form.closePrice,
      fee: +form.fee || 0, collateral: +form.collateral,
      iv: +form.iv || 0, delta: +form.delta || 0,
      theta: +form.theta || 0, dte: +form.dte || 0,
    };
    if (editId) {
      setRawTrades(r => r.map(t => t.id === editId ? trade : t));
      showToast("Trade updated ✓");
    } else {
      setRawTrades(r => [...r, trade]);
      showToast("Trade added ✓");
    }
    setForm(BLANK); setEditId(null); setPanel(false);
  };

  const deleteTrade = id => {
    if (!window.confirm("Delete this trade?")) return;
    setRawTrades(r => r.filter(t => t.id !== id));
    showToast("Trade deleted", C.red);
  };

  const editTrade = t => {
    setForm({ ...BLANK, ...t,
      strike: String(t.strike), qty: String(t.qty), fill: String(t.fill),
      closePrice: String(t.closePrice), fee: String(t.fee), collateral: String(t.collateral),
      iv: String(t.iv || ""), delta: String(t.delta || ""), theta: String(t.theta || ""), dte: String(t.dte || "")
    });
    setEditId(t.id); setPanel(true); setTab("log");
  };

  const dupTrade = t => {
    setForm({ ...BLANK, ...t,
      strike: String(t.strike), qty: String(t.qty), fill: String(t.fill),
      closePrice: String(t.closePrice), fee: String(t.fee), collateral: String(t.collateral),
      cls:"", opn:"", exp:""
    });
    setEditId(null); setPanel(true); setTab("log");
  };

  const exportCSV = () => {
    const headers = ["ticker","type","event","strategy","strike","qty","opn","exp","cls","fill","closePrice","fee","collateral","pl","days","roc","annRoc","ppd","pctOfMax","iv","delta","theta","dte","broker","status","tags","note"];
    const rows = filtered.map(enrich).map(t => headers.map(h => t[h] ?? "").join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
    a.download = "optx_trades.csv";
    a.click();
    showToast("CSV exported ✓");
  };

  const sortBy = key => setSort(s => ({ key, dir: s.key === key ? -s.dir : 1 }));

  const eventColor = e => ({ Put:C.blue, Call:C.green, Assignment:C.amber, Expired:C.text3, Buy:C.purple })[e] || C.text2;
  const typeColor  = t => ({ Sell:C.green, Buy:C.blue, Assigned:C.amber, Expired:C.text3 })[t] || C.text2;

  const TABS = ["overview", "log", "analytics", "vs market"];

  /* ══════════════════════ RENDER ══════════════════════ */
  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text, fontFamily:C.sans }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Barlow+Condensed:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg};}
        select option{background:#0f1218;}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.35) sepia(1) saturate(2) hue-rotate(5deg);}
        ::-webkit-scrollbar{width:3px;height:3px;background:transparent;}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}
        .tr:hover td{background:${C.bg2}!important;}
        .btn-add:hover{background:${C.amber}!important;color:#000!important;}
        .tab-btn:hover{color:${C.text}!important;}
        .del:hover{color:${C.red}!important;}
        .dup:hover{color:${C.blue}!important;}
        .edt:hover{color:${C.amber}!important;}
        input:focus,select:focus{border-color:${C.borderLit}!important;outline:none;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .content{animation:fadeUp 0.28s ease;}
        @keyframes slideRight{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        .panel{animation:slideRight 0.22s ease;}
        @keyframes toastIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .toast{animation:toastIn 0.2s ease;}
        .sortable:hover{color:${C.amber}!important;cursor:pointer;}
        .row-expand{animation:fadeUp 0.15s ease;}
        @keyframes scanline{0%{top:0}100%{top:100%}}
        .scan::after{content:'';position:fixed;left:0;right:0;height:80px;background:linear-gradient(transparent,rgba(245,166,35,0.015),transparent);animation:scanline 6s linear infinite;pointer-events:none;z-index:0;}
      `}</style>

      <div className="scan" />

      {/* TOAST */}
      {toast && (
        <div className="toast" style={{ position:"fixed", bottom:24, right:24, zIndex:999, background:C.surface, border:`1px solid ${toast.color}55`, borderLeft:`3px solid ${toast.color}`, borderRadius:7, padding:"10px 18px", fontSize:12, color:toast.color, fontFamily:C.mono }}>
          {toast.msg}
        </div>
      )}

      {/* ══ HEADER ══ */}
      <header style={{ borderBottom:`1px solid ${C.border}`, background:`${C.bg}f2`, backdropFilter:"blur(10px)", position:"sticky", top:0, zIndex:100, padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:52 }}>
        <div style={{ display:"flex", alignItems:"center", gap:18 }}>
          <div style={{ fontFamily:C.mono, fontWeight:700, fontSize:16, color:C.amber, letterSpacing:"0.12em" }}>
            ⬡ OPTX<span style={{ color:C.text3, fontSize:11, marginLeft:6, letterSpacing:"0.2em" }}>PRO</span>
          </div>
          <div style={{ width:1, height:22, background:C.border }} />
          <div style={{ display:"flex", gap:0 }}>
            {TABS.map(t => (
              <button key={t} className="tab-btn" onClick={() => setTab(t)} style={{
                background:"none", border:"none", cursor:"pointer",
                padding:"0 16px", height:52, fontSize:12, fontWeight:600,
                letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:C.sans,
                color: tab===t ? C.amber : C.text2,
                borderBottom: tab===t ? `2px solid ${C.amber}` : "2px solid transparent",
                transition:"color 0.15s",
              }}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ fontSize:10, color:C.text3, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:C.sans }}>SPX YTD%</span>
            <input value={snpYTD} onChange={e => setSnpYTD(e.target.value)} placeholder="-0.8"
              style={{ ...iStyle, width:62, padding:"4px 8px", fontSize:12 }} />
          </div>
          <select value={filter.ticker} onChange={e => setFilter(f=>({...f,ticker:e.target.value}))} style={{ ...iStyle, width:92, padding:"4px 8px", fontSize:11 }}>
            {tickers.map(t => <option key={t} value={t}>{t === "ALL" ? "All Tickers" : t}</option>)}
          </select>
          <select value={filter.event} onChange={e => setFilter(f=>({...f,event:e.target.value}))} style={{ ...iStyle, width:110, padding:"4px 8px", fontSize:11 }}>
            {["ALL","Put","Call","Assignment","Expired"].map(e => <option key={e} value={e}>{e === "ALL" ? "All Events" : e}</option>)}
          </select>
          <button onClick={exportCSV} style={{ background:"none", color:C.text2, border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 12px", fontSize:11, cursor:"pointer", fontFamily:C.sans, letterSpacing:"0.06em" }}>
            ↓ CSV
          </button>
          <button className="btn-add" onClick={() => { setForm(BLANK); setEditId(null); setPanel(p=>!p); setTab("log"); }}
            style={{ background:C.amberDim, color:C.amber, border:`1px solid ${C.amber}55`, borderRadius:6, padding:"6px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:C.sans, letterSpacing:"0.08em", transition:"all 0.15s" }}>
            + NEW TRADE
          </button>
        </div>
      </header>

      <div style={{ padding:"20px 28px", position:"relative", zIndex:1 }} className="content">

        {/* ══════════ OVERVIEW ══════════ */}
        {tab === "overview" && (
          <>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
              <KPI label="Total P/L"     value={f$(totalPL)}        color={totalPL>=0?C.green:C.red}      sub={`${filtered.length} closed trades`} />
              <KPI label="ROC"           value={fp(totalROC)}       color={totalROC>=0?C.green:C.red}     sub="Return on max collateral" />
              <KPI label="Avg Ann. ROC"  value={fp(avgAnnROC)}      color={avgAnnROC>=0?C.amber:C.red}    sub="Annualized avg" />
              <KPI label="Win Rate"      value={`${winRate.toFixed(0)}%`} color={winRate>=60?C.green:winRate>=40?C.amber:C.red} sub={`${wins}W · ${losses}L`} />
              <KPI label="Alpha vs SPX"  value={fp(alpha)}          color={alpha>=0?C.cyan:C.red}         sub={`SPX YTD: ${fp(snpNum)}`} />
              <KPI label="Profit Factor" value={profitFactor}       color={C.purple}                       sub="Gross W / Gross L" />
              <KPI label="Expectancy"    value={f$(expectancy)}     color={expectancy>=0?C.green:C.red}   sub="Avg P/L per trade" />
              <KPI label="Avg Days Held" value={`${avgDTE.toFixed(1)}d`} color={C.blue}                   sub="Days per trade" />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div style={{ background:`linear-gradient(160deg,${C.surface} 0%,${C.bg2} 100%)`, border:`1px solid ${C.border}`, borderRadius:10, padding:"18px 20px" }}>
                <div style={{ fontSize:10, color:C.text2, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontFamily:C.sans }}>Cumulative P/L</div>
                {cumulData.length === 0
                  ? <div style={{ height:180, display:"flex", alignItems:"center", justifyContent:"center", color:C.text3, fontSize:12 }}>No data yet</div>
                  : <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={cumulData}>
                        <defs>
                          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={C.amber} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={C.amber} stopOpacity={0}   />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke={C.border} />
                        <XAxis dataKey="date" tick={{ fill:C.text3, fontSize:9, fontFamily:C.mono }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill:C.text3, fontSize:9, fontFamily:C.mono }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                        <Tooltip content={<CT />} />
                        <ReferenceLine y={0} stroke={C.border} strokeDasharray="4 4" />
                        <Area type="monotone" dataKey="pl" name="Cum. P/L" stroke={C.amber} strokeWidth={2} fill="url(#cg)" dot={{ fill:C.amber, r:3, strokeWidth:0 }} />
                      </AreaChart>
                    </ResponsiveContainer>}
              </div>

              <div style={{ background:`linear-gradient(160deg,${C.surface} 0%,${C.bg2} 100%)`, border:`1px solid ${C.border}`, borderRadius:10, padding:"18px 20px" }}>
                <div style={{ fontSize:10, color:C.text2, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontFamily:C.sans }}>Monthly P/L</div>
                {monthlyData.length === 0
                  ? <div style={{ height:180, display:"flex", alignItems:"center", justifyContent:"center", color:C.text3, fontSize:12 }}>No data yet</div>
                  : <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                        <XAxis dataKey="month" tick={{ fill:C.text3, fontSize:9, fontFamily:C.mono }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill:C.text3, fontSize:9, fontFamily:C.mono }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                        <Tooltip content={<CT />} />
                        <ReferenceLine y={0} stroke={C.border} />
                        <Bar dataKey="pl" name="Month P/L" radius={[4,4,0,0]}>
                          {monthlyData.map((d,i) => <Cell key={i} fill={d.pl>=0?C.green:C.red} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>}
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
              <div style={{ background:`linear-gradient(160deg,${C.surface} 0%,${C.bg2} 100%)`, border:`1px solid ${C.border}`, borderRadius:10, padding:"18px 20px" }}>
                <div style={{ fontSize:10, color:C.text2, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontFamily:C.sans }}>P/L Per Trade</div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={filtered.map(t => ({ name:`${t.event[0]} ${t.ticker}`, pl:+t.pl.toFixed(2) }))}>
                    <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill:C.text3, fontSize:8, fontFamily:C.mono }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:C.text3, fontSize:9, fontFamily:C.mono }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} width={32} />
                    <Tooltip content={<CT />} />
                    <ReferenceLine y={0} stroke={C.border} />
                    <Bar dataKey="pl" name="P/L" radius={[3,3,0,0]}>
                      {filtered.map((t,i) => <Cell key={i} fill={t.pl>=0?C.green:C.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background:`linear-gradient(160deg,${C.surface} 0%,${C.bg2} 100%)`, border:`1px solid ${C.border}`, borderRadius:10, padding:"18px 20px" }}>
                <div style={{ fontSize:10, color:C.text2, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontFamily:C.sans }}>P/L by Event</div>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={byEvent.filter(d=>d.pl>0)} dataKey="pl" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={28}>
                      {byEvent.filter(d=>d.pl>0).map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CT />} />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize:10, fontFamily:C.mono, color:C.text2 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background:`linear-gradient(160deg,${C.surface} 0%,${C.bg2} 100%)`, border:`1px solid ${C.border}`, borderRadius:10, padding:"18px 20px" }}>
                <div style={{ fontSize:10, color:C.text2, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:12, fontFamily:C.sans }}>Quick Stats</div>
                {[
                  ["Largest Win",    f$(largestWin),  C.green],
                  ["Largest Loss",   f$(largestL),    C.red],
                  ["Best Ann. ROC",  fp(filtered.length ? Math.max(...filtered.map(t=>t.annRoc)) : 0), C.amber],
                  ["Avg PPD",        f$(filtered.length ? filtered.reduce((s,t)=>s+t.ppd,0)/filtered.length : 0), C.blue],
                  ["Total Trades",   filtered.length, C.text2],
                  ["Unique Tickers", new Set(filtered.map(t=>t.ticker)).size, C.text2],
                ].map(([l,v,c]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:11, color:C.text2, fontFamily:C.sans }}>{l}</span>
                    <span style={{ fontSize:12, color:c, fontFamily:C.mono, fontWeight:600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══════════ LOG ══════════ */}
        {tab === "log" && (
          <>
            {panel && (
              <div className="panel" style={{ background:`linear-gradient(135deg,${C.surface},${C.bg2})`, border:`1px solid ${C.borderLit}`, borderRadius:10, padding:"20px 24px", marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.amber, fontFamily:C.mono, letterSpacing:"0.08em" }}>
                    {editId ? "▸ EDIT TRADE" : "▸ NEW TRADE"}
                  </div>
                  <button onClick={() => { setPanel(false); setEditId(null); setForm(BLANK); }}
                    style={{ background:"none", border:"none", color:C.text3, cursor:"pointer", fontSize:16 }}>✕</button>
                </div>

                {/* Section: Identity */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:9, color:C.text3, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, fontFamily:C.sans, borderBottom:`1px solid ${C.border}`, paddingBottom:4 }}>TRADE IDENTITY</div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    <FormField label="Strategy">
                      <Sel val={form.strategy} onChange={v=>fSet("strategy",v)} opts={["Wheel","Naked Put","Covered Call","Iron Condor","Iron Butterfly","Vertical Spread","Calendar Spread","Diagonal Spread","Straddle","Strangle","LEAPS","PMCC","Other"]} />
                    </FormField>
                    <FormField label="Ticker *">
                      <Inp val={form.ticker} onChange={v=>fSet("ticker",v.toUpperCase())} placeholder="SOFI" />
                    </FormField>
                    <FormField label="Trade Type">
                      <Sel val={form.type} onChange={v=>fSet("type",v)} opts={["Sell","Buy","Assigned","Expired","Rolled"]} />
                    </FormField>
                    <FormField label="Event">
                      <Sel val={form.event} onChange={v=>{ fSet("event",v); autoFillCollateral(v,form.strike,form.qty); }} opts={["Put","Call","Assignment","Expired","Spread","Straddle","Strangle"]} />
                    </FormField>
                    <FormField label="Status">
                      <Sel val={form.status} onChange={v=>fSet("status",v)} opts={["Closed","Open","Rolled","Expired","Challenged"]} />
                    </FormField>
                    <FormField label="Broker">
                      <Sel val={form.broker} onChange={v=>fSet("broker",v)} opts={["Robinhood","Tastytrade","TD Ameritrade","E*TRADE","Schwab","Webull","IBKR","Fidelity","Other"]} />
                    </FormField>
                  </div>
                </div>

                {/* Section: Pricing */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:9, color:C.text3, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, fontFamily:C.sans, borderBottom:`1px solid ${C.border}`, paddingBottom:4 }}>PRICING</div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    <FormField label="Strike $ *">
                      <Inp val={form.strike} type="number" onChange={v=>{ fSet("strike",v); autoFillCollateral(form.event,v,form.qty); }} placeholder="18.50" />
                    </FormField>
                    <FormField label="Contracts *" tip="Number of option contracts">
                      <Inp val={form.qty} type="number" onChange={v=>{ fSet("qty",v); autoFillCollateral(form.event,form.strike,v); }} placeholder="1" />
                    </FormField>
                    <FormField label="Fill $ *" tip="Premium received/paid per share">
                      <Inp val={form.fill} type="number" onChange={v=>fSet("fill",v)} placeholder="0.54" />
                    </FormField>
                    <FormField label="Close $ *" tip="Price paid to close. 0 = expired worthless">
                      <Inp val={form.closePrice} type="number" onChange={v=>fSet("closePrice",v)} placeholder="0.00" />
                    </FormField>
                    <FormField label="Total Fees $" tip="Commission + exchange fees">
                      <Inp val={form.fee} type="number" onChange={v=>fSet("fee",v)} placeholder="0.04" />
                    </FormField>
                    <FormField label="Collateral $" tip="Auto-fills for standard puts/calls. Adjust for spreads.">
                      <Inp val={form.collateral} type="number" onChange={v=>fSet("collateral",v)} placeholder="1850" />
                    </FormField>
                  </div>
                </div>

                {/* Section: Dates */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:9, color:C.text3, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, fontFamily:C.sans, borderBottom:`1px solid ${C.border}`, paddingBottom:4 }}>DATES</div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    <FormField label="Open Date *"><Inp val={form.opn} type="date" onChange={v=>fSet("opn",v)} /></FormField>
                    <FormField label="Expiry Date"><Inp val={form.exp} type="date" onChange={v=>fSet("exp",v)} /></FormField>
                    <FormField label="Close Date *"><Inp val={form.cls} type="date" onChange={v=>fSet("cls",v)} /></FormField>
                    <FormField label="DTE at Open" tip="Days to expiration when you opened the trade">
                      <Inp val={form.dte} type="number" onChange={v=>fSet("dte",v)} placeholder="21" />
                    </FormField>
                  </div>
                </div>

                {/* Section: Greeks */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:9, color:C.text3, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8, fontFamily:C.sans, borderBottom:`1px solid ${C.border}`, paddingBottom:4 }}>GREEKS AT ENTRY (optional)</div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    <FormField label="IV %" tip="Implied volatility at entry — helps identify high/low IV trades"><Inp val={form.iv} type="number" onChange={v=>fSet("iv",v)} placeholder="38" /></FormField>
                    <FormField label="Delta" tip="Delta at entry. Puts negative, calls positive."><Inp val={form.delta} type="number" onChange={v=>fSet("delta",v)} placeholder="-0.20" /></FormField>
                    <FormField label="Theta / day" tip="Theta decay per day at entry"><Inp val={form.theta} type="number" onChange={v=>fSet("theta",v)} placeholder="0.05" /></FormField>
                    <FormField label="Tags" tip="Comma-separated: earnings, high-iv, wheel, challenged…"><Inp val={form.tags} onChange={v=>fSet("tags",v)} placeholder="earnings, high-iv" /></FormField>
                    <FormField label="Trade Notes" tip="Why you took this trade, lessons learned, etc.">
                      <Inp val={form.note} onChange={v=>fSet("note",v)} placeholder="Rationale / notes…" />
                    </FormField>
                  </div>
                </div>

                {/* Live preview */}
                {form.fill && form.collateral && form.cls && form.opn && (() => {
                  const prev = enrich({ ...form, strike:+form.strike||0, qty:+form.qty||1, fill:+form.fill, closePrice:+form.closePrice||0, fee:+form.fee||0, collateral:+form.collateral });
                  return (
                    <div style={{ background:C.bg, border:`1px solid ${C.borderLit}`, borderRadius:7, padding:"12px 16px", marginBottom:14 }}>
                      <div style={{ fontSize:9, color:C.text3, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8, fontFamily:C.sans }}>Live Preview</div>
                      <div style={{ display:"flex", gap:24, flexWrap:"wrap" }}>
                        {[
                          ["P/L",       f$(prev.pl),       prev.pl>=0?C.green:C.red],
                          ["ROC",       fp(prev.roc),      prev.roc>=0?C.amber:C.red],
                          ["Ann. ROC",  fp(prev.annRoc),   prev.annRoc>=0?C.amber:C.red],
                          ["PPD",       f$(prev.ppd),      C.blue],
                          ["Days Held", `${prev.days}d`,   C.text2],
                          ["% of Max",  `${prev.pctOfMax.toFixed(0)}%`, C.purple],
                          ["Max Profit",f$(prev.maxProfit),C.text3],
                        ].map(([l,v,c]) => (
                          <div key={l}>
                            <div style={{ fontSize:9, color:C.text3, letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:C.sans }}>{l}</div>
                            <div style={{ fontSize:17, color:c, fontFamily:C.mono, fontWeight:700 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div style={{ display:"flex", gap:10 }}>
                  <button onClick={submitTrade} className="btn-add"
                    style={{ background:C.amberDim, color:C.amber, border:`1px solid ${C.amber}55`, borderRadius:6, padding:"8px 22px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:C.sans, letterSpacing:"0.08em", transition:"all 0.15s" }}>
                    {editId ? "SAVE CHANGES" : "ADD TRADE"}
                  </button>
                  <button onClick={() => { setPanel(false); setEditId(null); setForm(BLANK); }}
                    style={{ background:"none", color:C.text2, border:`1px solid ${C.border}`, borderRadius:6, padding:"8px 18px", fontSize:12, cursor:"pointer", fontFamily:C.sans }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div style={{ background:`linear-gradient(160deg,${C.surface} 0%,${C.bg2} 100%)`, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
              {filtered.length === 0
                ? <div style={{ padding:"60px 0", textAlign:"center", color:C.text3, fontSize:13, fontFamily:C.mono }}>NO TRADES — CLICK + NEW TRADE TO BEGIN</div>
                : <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11, fontFamily:C.mono }}>
                      <thead>
                        <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                          {[
                            ["",""],["TICKER","ticker"],["EVENT","event"],["STRATEGY","strategy"],
                            ["STRIKE","strike"],["QTY","qty"],["OPEN","opn"],["CLOSE","cls"],
                            ["DAYS","days"],["FILL","fill"],["CLOSE$","closePrice"],
                            ["COLLATERAL","collateral"],["P/L","pl"],["ROC","roc"],
                            ["ANN.ROC","annRoc"],["PPD","ppd"],["% MAX","pctOfMax"],
                            ["IV","iv"],["Δ","delta"],["θ","theta"],["ACTIONS",""]
                          ].map(([h,k]) => (
                            <th key={h} onClick={() => k && sortBy(k)}
                              className={k ? "sortable" : ""}
                              style={{ padding:"10px 12px", textAlign:"left", color:sort.key===k?C.amber:C.text3, fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:400, whiteSpace:"nowrap", transition:"color 0.15s" }}>
                              {h}{sort.key===k?(sort.dir===1?" ↑":" ↓"):""}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((t, i) => (
                          <>
                            <tr key={t.id} className="tr" onClick={() => setExpandRow(expandRow===t.id?null:t.id)}
                              style={{ borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}>
                              <td style={{ padding:"9px 12px" }}>
                                <span style={{ color:C.text3, fontSize:10 }}>{expandRow===t.id?"▾":"▸"}</span>
                              </td>
                              <td style={{ padding:"9px 12px", fontWeight:700, color:C.text }}>{t.ticker}</td>
                              <td style={{ padding:"9px 12px" }}><Badge color={eventColor(t.event)}>{t.event}</Badge></td>
                              <td style={{ padding:"9px 12px" }}><Badge color={C.text3}>{t.strategy}</Badge></td>
                              <td style={{ padding:"9px 12px" }}>${t.strike}</td>
                              <td style={{ padding:"9px 12px", color:C.text2 }}>{t.qty}</td>
                              <td style={{ padding:"9px 12px", color:C.text2 }}>{t.opn?.slice(5)}</td>
                              <td style={{ padding:"9px 12px", color:C.text2 }}>{t.cls?.slice(5)}</td>
                              <td style={{ padding:"9px 12px", color:C.text2 }}>{t.days}d</td>
                              <td style={{ padding:"9px 12px" }}>${f2(t.fill)}</td>
                              <td style={{ padding:"9px 12px", color:C.text2 }}>${f2(t.closePrice)}</td>
                              <td style={{ padding:"9px 12px", color:C.text2 }}>${(t.collateral||0).toLocaleString()}</td>
                              <td style={{ padding:"9px 12px", fontWeight:700, color:t.pl>=0?C.green:C.red }}>{f$(t.pl)}</td>
                              <td style={{ padding:"9px 12px", color:t.roc>=0?C.green:C.red }}>{fp(t.roc)}</td>
                              <td style={{ padding:"9px 12px", color:t.annRoc>=0?C.amber:C.red }}>{fp(t.annRoc)}</td>
                              <td style={{ padding:"9px 12px", color:t.ppd>=0?C.green:C.red }}>{f$(t.ppd)}</td>
                              <td style={{ padding:"9px 12px", color:C.purple }}>{t.pctOfMax?.toFixed(0)}%</td>
                              <td style={{ padding:"9px 12px", color:C.text2 }}>{t.iv?`${t.iv}%`:"—"}</td>
                              <td style={{ padding:"9px 12px", color:C.text2 }}>{t.delta||"—"}</td>
                              <td style={{ padding:"9px 12px", color:C.text2 }}>{t.theta||"—"}</td>
                              <td style={{ padding:"9px 12px" }}>
                                <div style={{ display:"flex", gap:10 }} onClick={e=>e.stopPropagation()}>
                                  <button className="edt" title="Edit"      onClick={()=>editTrade(t)} style={{ background:"none",border:"none",color:C.text3,cursor:"pointer",fontSize:13,transition:"color 0.15s" }}>✎</button>
                                  <button className="dup" title="Duplicate" onClick={()=>dupTrade(t)}  style={{ background:"none",border:"none",color:C.text3,cursor:"pointer",fontSize:12,transition:"color 0.15s" }}>⧉</button>
                                  <button className="del" title="Delete"    onClick={()=>deleteTrade(t.id)} style={{ background:"none",border:"none",color:C.text3,cursor:"pointer",fontSize:13,transition:"color 0.15s" }}>✕</button>
                                </div>
                              </td>
                            </tr>
                            {expandRow === t.id && (
                              <tr key={t.id+"_x"} className="row-expand">
                                <td colSpan={21} style={{ background:C.bg, padding:"12px 20px 14px", borderBottom:`1px solid ${C.border}` }}>
                                  <div style={{ display:"flex", gap:28, flexWrap:"wrap" }}>
                                    <div><div style={{ fontSize:9, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Broker</div><div style={{ color:C.text2, fontSize:11 }}>{t.broker||"—"}</div></div>
                                    <div><div style={{ fontSize:9, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Expiry</div><div style={{ color:C.text2, fontSize:11 }}>{t.exp||"—"}</div></div>
                                    <div><div style={{ fontSize:9, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Status</div><div style={{ color:C.amber, fontSize:11 }}>{t.status||"—"}</div></div>
                                    <div><div style={{ fontSize:9, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>DTE at Open</div><div style={{ color:C.text2, fontSize:11 }}>{t.dte?`${t.dte}d`:"—"}</div></div>
                                    <div><div style={{ fontSize:9, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Max Profit</div><div style={{ color:C.amber, fontSize:11, fontFamily:C.mono }}>{f$(t.maxProfit)}</div></div>
                                    <div><div style={{ fontSize:9, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>% of Max Captured</div><div style={{ color:C.purple, fontSize:11, fontFamily:C.mono }}>{t.pctOfMax?.toFixed(1)}%</div></div>
                                    <div><div style={{ fontSize:9, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Tags</div><div style={{ color:C.blue, fontSize:11 }}>{t.tags||"—"}</div></div>
                                    <div style={{ flex:1, minWidth:200 }}><div style={{ fontSize:9, color:C.text3, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:3 }}>Notes</div><div style={{ color:C.text2, fontSize:11 }}>{t.note||"—"}</div></div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop:`2px solid ${C.borderLit}`, background:C.bg }}>
                          <td colSpan={12} style={{ padding:"11px 12px", color:C.text3, fontSize:9, letterSpacing:"0.12em" }}>TOTALS · {filtered.length} TRADES</td>
                          <td style={{ padding:"11px 12px", fontWeight:700, color:totalPL>=0?C.green:C.red, fontSize:14 }}>{f$(totalPL)}</td>
                          <td style={{ padding:"11px 12px", color:totalROC>=0?C.green:C.red }}>{fp(totalROC)}</td>
                          <td style={{ padding:"11px 12px", color:avgAnnROC>=0?C.amber:C.red }}>{fp(avgAnnROC)}</td>
                          <td style={{ padding:"11px 12px", color:C.green }}>{f$(filtered.length?filtered.reduce((s,t)=>s+t.ppd,0)/filtered.length:0)}</td>
                          <td colSpan={5} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>}
            </div>
          </>
        )}

        {/* ══════════ ANALYTICS ══════════ */}
        {tab === "analytics" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div style={{ background:`linear-gradient(160deg,${C.surface} 0%,${C.bg2} 100%)`, border:`1px solid ${C.border}`, borderRadius:10, padding:"18px 20px" }}>
                <div style={{ fontSize:10, color:C.text2, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontFamily:C.sans }}>Annualized ROC per Trade</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={filtered.map(t => ({ name:`${t.event[0]}${t.ticker} ${(t.opn||"").slice(5)}`, v:+t.annRoc.toFixed(1) }))}>
                    <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill:C.text3, fontSize:8, fontFamily:C.mono }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:C.text3, fontSize:9, fontFamily:C.mono }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} width={38} />
                    <Tooltip content={<CT />} />
                    <ReferenceLine y={0}        stroke={C.border} />
                    <ReferenceLine y={SNP_HIST} stroke={C.blue} strokeDasharray="4 3" label={{ value:"S&P Avg", fill:C.blue, fontSize:8, fontFamily:C.mono }} />
                    <Bar dataKey="v" name="Ann.ROC%" radius={[3,3,0,0]}>
                      {filtered.map((t,i) => <Cell key={i} fill={t.annRoc>=SNP_HIST?C.green:t.annRoc>=0?C.amber:C.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background:`linear-gradient(160deg,${C.surface} 0%,${C.bg2} 100%)`, border:`1px solid ${C.border}`, borderRadius:10, padding:"18px 20px" }}>
                <div style={{ fontSize:10, color:C.text2, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontFamily:C.sans }}>IV at Entry vs P/L</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={filtered.filter(t=>t.iv).map(t => ({ name:`${t.ticker} ${(t.opn||"").slice(5)}`, iv:t.iv, pl:+t.pl.toFixed(2) }))}>
                    <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill:C.text3, fontSize:8, fontFamily:C.mono }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="l" tick={{ fill:C.text3, fontSize:9, fontFamily:C.mono }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} width={35} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fill:C.text3, fontSize:9, fontFamily:C.mono }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} width={35}/>
                    <Tooltip content={<CT />} />
                    <Bar yAxisId="l" dataKey="iv" name="IV%" fill={C.purpleDim} stroke={C.purple} strokeWidth={1} radius={[3,3,0,0]} />
                    <Bar yAxisId="r" dataKey="pl" name="P/L$" radius={[3,3,0,0]}>
                      {filtered.filter(t=>t.iv).map((t,i) => <Cell key={i} fill={t.pl>=0?C.green:C.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
              <div style={{ background:`linear-gradient(160deg,${C.surface} 0%,${C.bg2} 100%)`, border:`1px solid ${C.border}`, borderRadius:10, padding:"18px 20px" }}>
                <div style={{ fontSize:10, color:C.text2, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontFamily:C.sans }}>Days Held vs P/L</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={filtered.map(t => ({ days:t.days, pl:+t.pl.toFixed(2) }))}>
                    <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                    <XAxis dataKey="days" tick={{ fill:C.text3, fontSize:9, fontFamily:C.mono }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}d`} />
                    <YAxis tick={{ fill:C.text3, fontSize:9, fontFamily:C.mono }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} width={32} />
                    <Tooltip content={<CT />} />
                    <ReferenceLine y={0} stroke={C.border} />
                    <Bar dataKey="pl" name="P/L$" radius={[3,3,0,0]}>
                      {filtered.map((t,i) => <Cell key={i} fill={t.pl>=0?C.cyan:C.red} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background:`linear-gradient(160deg,${C.surface} 0%,${C.bg2} 100%)`, border:`1px solid ${C.border}`, borderRadius:10, padding:"18px 20px" }}>
                <div style={{ fontSize:10, color:C.text2, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontFamily:C.sans }}>P/L by Strategy</div>
                {(() => {
                  const m = {};
                  filtered.forEach(t => { if (!m[t.strategy]) m[t.strategy]={pl:0,count:0}; m[t.strategy].pl+=t.pl; m[t.strategy].count++; });
                  const maxAbs = Math.max(...Object.values(m).map(v=>Math.abs(v.pl)), 1);
                  return Object.entries(m).map(([k,v]) => (
                    <div key={k} style={{ marginBottom:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:10, color:C.text2, fontFamily:C.sans }}>{k} <span style={{ color:C.text3 }}>×{v.count}</span></span>
                        <span style={{ fontSize:10, color:v.pl>=0?C.green:C.red, fontFamily:C.mono }}>{f$(v.pl)}</span>
                      </div>
                      <div style={{ background:C.border, borderRadius:3, height:4, overflow:"hidden" }}>
                        <div style={{ width:`${(Math.abs(v.pl)/maxAbs)*100}%`, height:"100%", background:v.pl>=0?C.green:C.red, borderRadius:3 }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div style={{ background:`linear-gradient(160deg,${C.surface} 0%,${C.bg2} 100%)`, border:`1px solid ${C.border}`, borderRadius:10, padding:"18px 20px" }}>
                <div style={{ fontSize:10, color:C.text2, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:12, fontFamily:C.sans }}>Greeks & Fees</div>
                {[
                  ["Avg IV at Entry", `${(filtered.filter(t=>t.iv).reduce((s,t)=>s+(+t.iv),0)/(filtered.filter(t=>t.iv).length||1)).toFixed(1)}%`, C.purple],
                  ["Avg Delta",       f2(filtered.filter(t=>t.delta).reduce((s,t)=>s+(+t.delta),0)/(filtered.filter(t=>t.delta).length||1)), C.blue],
                  ["Avg Theta/day",   f2(filtered.filter(t=>t.theta).reduce((s,t)=>s+(+t.theta),0)/(filtered.filter(t=>t.theta).length||1)), C.cyan],
                  ["Max IV Seen",     `${Math.max(0,...filtered.map(t=>+t.iv||0))}%`, C.amber],
                  ["Avg DTE Open",    `${(filtered.filter(t=>t.dte).reduce((s,t)=>s+(+t.dte),0)/(filtered.filter(t=>t.dte).length||1)).toFixed(1)}d`, C.text2],
                  ["Total Fees Paid", f$(filtered.reduce((s,t)=>s+(+t.fee||0),0)), C.red],
                ].map(([l,v,c]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:11, color:C.text2, fontFamily:C.sans }}>{l}</span>
                    <span style={{ fontSize:12, color:c, fontFamily:C.mono, fontWeight:600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══════════ VS MARKET ══════════ */}
        {tab === "vs market" && (
          <>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
              <KPI label="Your Avg Ann. ROC"  value={fp(avgAnnROC)}           color={C.amber}                           sub="Options strategy avg" />
              <KPI label="S&P 500 YTD"        value={fp(snpNum)}              color={snpNum>=0?C.green:C.red}           sub="Edit in top bar" />
              <KPI label="Alpha vs S&P YTD"   value={fp(avgAnnROC-snpNum)}    color={avgAnnROC>snpNum?C.cyan:C.red}     sub="Your outperformance" />
              <KPI label="S&P Hist. Avg"       value="+10.50%"                 color={C.text2}                           sub="Long-run annual avg" />
              <KPI label="Alpha vs Hist. S&P" value={fp(avgAnnROC-SNP_HIST)}  color={avgAnnROC>SNP_HIST?C.green:C.red}  sub="vs 10.5% historical" />
              <KPI label="T-Bill Rate"         value="+5.30%"                  color={C.blue}                            sub="Risk-free rate" />
            </div>

            <div style={{ background:`linear-gradient(160deg,${C.surface} 0%,${C.bg2} 100%)`, border:`1px solid ${C.border}`, borderRadius:10, padding:"18px 20px", marginBottom:14 }}>
              <div style={{ fontSize:10, color:C.text2, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:4, fontFamily:C.sans }}>Cumulative P/L vs S&P Equivalent ($)</div>
              <div style={{ fontSize:10, color:C.text3, marginBottom:14 }}>S&P line = what same max collateral would return at current YTD rate, prorated over time</div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={cumulData.map((d,i,arr) => ({
                  ...d,
                  snpYTD:  +((maxColl*(snpNum/100))*((i+1)/Math.max(arr.length,1))).toFixed(2),
                  snpHist: +((maxColl*(SNP_HIST/100))*((i+1)/Math.max(arr.length,1))).toFixed(2),
                }))}>
                  <defs>
                    <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.amber} stopOpacity={0.18} />
                      <stop offset="95%" stopColor={C.amber} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={C.border} />
                  <XAxis dataKey="date" tick={{ fill:C.text3, fontSize:9, fontFamily:C.mono }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:C.text3, fontSize:9, fontFamily:C.mono }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`} />
                  <Tooltip content={<CT />} />
                  <ReferenceLine y={0} stroke={C.border} strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="pl"      name="My P/L"    stroke={C.amber} strokeWidth={2.5} fill="url(#mg)" dot={{ fill:C.amber, r:4, strokeWidth:0 }} />
                  <Line type="monotone" dataKey="snpYTD"  name="S&P YTD"   stroke={C.blue}  strokeWidth={1.5} dot={false} strokeDasharray="6 3" />
                  <Line type="monotone" dataKey="snpHist" name="S&P Hist." stroke={C.text3} strokeWidth={1}   dot={false} strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", gap:22, marginTop:10 }}>
                {[[C.amber,"My Options P/L"],[C.blue,"S&P 500 YTD"],[C.text3,"S&P Historical Avg"]].map(([c,label]) => (
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <div style={{ width:18, height:2, background:c, borderRadius:2 }} />
                    <span style={{ fontSize:10, color:C.text2, fontFamily:C.sans }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background:`linear-gradient(160deg,${C.surface} 0%,${C.bg2} 100%)`, border:`1px solid ${C.border}`, borderRadius:10, padding:"18px 20px" }}>
              <div style={{ fontSize:10, color:C.text2, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:14, fontFamily:C.sans }}>Annualized Return vs Benchmarks (%)</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart layout="vertical" data={[
                  { name:"S&P 500 YTD",         v:+snpNum.toFixed(2)       },
                  { name:"Risk-free (T-Bill)",   v:5.3                      },
                  { name:"S&P Historical Avg",   v:SNP_HIST                 },
                  { name:"Your Avg Ann. ROC",    v:+avgAnnROC.toFixed(2)    },
                  ...(filtered.length?[{ name:"Your Best Trade Ann.", v:+Math.max(...filtered.map(t=>t.annRoc)).toFixed(2) }]:[]),
                ]}>
                  <CartesianGrid strokeDasharray="2 4" stroke={C.border} horizontal={false} />
                  <XAxis type="number" tick={{ fill:C.text3, fontSize:9, fontFamily:C.mono }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill:C.text2, fontSize:10, fontFamily:C.sans }} axisLine={false} tickLine={false} width={175} />
                  <Tooltip content={<CT />} />
                  <ReferenceLine x={0} stroke={C.border} />
                  <Bar dataKey="v" name="%" radius={[0,4,4,0]}>
                    {[snpNum, 5.3, SNP_HIST, avgAnnROC, 9999].map((v,i) => (
                      <Cell key={i} fill={v<0?C.red:v===SNP_HIST?C.text3:v===5.3?C.blue:C.amber} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
