import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import {
  Ghost, Home, Swords, Trophy, Wallet, History, UserRound, LogIn,
  LogOut, ShieldCheck, Menu, X, Plus, RefreshCw, Users, CalendarDays,
  CircleDollarSign, CheckCircle2, AlertTriangle, Settings, LockKeyhole
} from 'lucide-react';
import './styles.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = url && anonKey && !url.includes('YOUR_PROJECT')
  ? createClient(url, anonKey)
  : null;

const DEMO_MATCHES = [
  { id: 'demo-ff-solo', title: 'FF Solo Showdown', game: 'Free Fire', mode: 'Solo', starts_at: new Date(Date.now()+86400000).toISOString(), entry_fee: 20, prize_pool: 500, slots_total: 48, slots_taken: 17, status: 'open' },
  { id: 'demo-ff-squad', title: 'Squad Survival Cup', game: 'Free Fire', mode: 'Squad', starts_at: new Date(Date.now()+172800000).toISOString(), entry_fee: 80, prize_pool: 2000, slots_total: 48, slots_taken: 29, status: 'open' },
  { id: 'demo-ff-duo', title: 'Booyah Duo Clash', game: 'Free Fire', mode: 'Duo', starts_at: new Date(Date.now()+259200000).toISOString(), entry_fee: 40, prize_pool: 1000, slots_total: 48, slots_taken: 12, status: 'open' }
];
const money = n => `৳${Number(n || 0).toLocaleString('en-BD')}`;
const dateText = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('home');
  const [matches, setMatches] = useState(DEMO_MATCHES);
  const [registrations, setRegistrations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [history, setHistory] = useState([]);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [gameUid, setGameUid] = useState('');
  const [adminRows, setAdminRows] = useState([]);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [matchForm, setMatchForm] = useState({ title: '', mode: 'Solo', starts_at: '', entry_fee: '0', prize_pool: '0', slots_total: '48' });

  const isConfigured = Boolean(supabase);
  const user = session?.user;
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) loadData();
    else { setProfile(null); setRegistrations([]); setTransactions([]); setHistory([]); }
  }, [user?.id]);

  async function loadData() {
    if (!supabase || !user) return;
    setLoading(true);
    try {
      const [p, m, r, t, h] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('matches').select('*').eq('game', 'Free Fire').order('starts_at'),
        supabase.from('registrations').select('*, matches(title, game, starts_at, entry_fee)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('payments').select('id, provider, amount, currency, status, created_at, reference').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('match_history').select('*, matches(title, game)').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);
      if (p.error) throw p.error;
      if (p.data) { setProfile(p.data); setPlayerName(p.data.player_name || ''); setGameUid(p.data.game_uid || ''); }
      if (!m.error && m.data?.length) setMatches(m.data);
      if (!r.error) setRegistrations(r.data || []);
      if (!t.error) setTransactions(t.data || []);
      if (!h.error) setHistory(h.data || []);
    } catch (e) { setNotice({ type: 'error', text: e.message || 'Could not load your data.' }); }
    finally { setLoading(false); }
  }

  async function authSubmit(e) {
    e.preventDefault(); if (!supabase) return setNotice({ type: 'error', text: 'Add Supabase URL and anon key to .env.local, then restart the app.' });
    setLoading(true); setNotice({ type: '', text: '' });
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { player_name: authName } } });
        if (error) throw error;
        if (data.session) setNotice({ type: 'success', text: 'Account created. Welcome to GHOST ESPORT!' });
        else setNotice({ type: 'success', text: 'Account created. Check your email to confirm, then sign in.' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        setNotice({ type: 'success', text: 'Signed in successfully.' });
      }
    } catch (e) { setNotice({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  }

  async function signOut() { if (supabase) await supabase.auth.signOut(); setSession(null); setView('home'); }

  async function saveProfile(e) {
    e.preventDefault();
    if (!supabase || !user) return setNotice({ type: 'error', text: 'Sign in with a configured Supabase account to save your profile.' });
    const { data, error } = await supabase.from('profiles').upsert({ id: user.id, player_name: playerName.trim(), game_uid: gameUid.trim(), favorite_game: 'Free Fire', updated_at: new Date().toISOString() }).select().single();
    if (error) setNotice({ type: 'error', text: error.message });
    else { setProfile(data); setNotice({ type: 'success', text: 'Profile saved.' }); }
  }

  async function registerMatch(match) {
    if (!user) { setView('auth'); setNotice({ type: 'error', text: 'Sign in before registering for a match.' }); return; }
    if (!supabase || String(match.id).startsWith('demo-')) {
      setNotice({ type: 'error', text: 'Demo match only. Configure Supabase and create real matches before registration.' }); return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.rpc('register_for_match', { p_match_id: match.id });
      if (error) throw error;
      setNotice({ type: 'success', text: 'Registration saved. Pay entry fees only through the approved payment flow shown in your account.' });
      await loadData();
    } catch (e) { setNotice({ type: 'error', text: e.message }); }
    finally { setLoading(false); }
  }

  async function createMatch(e) {
    e.preventDefault();
    if (!supabase || !isAdmin) return setNotice({ type: 'error', text: 'Admin access is required. Set role=admin securely in the database.' });
    const { error } = await supabase.from('matches').insert({
      title: matchForm.title.trim(), game: 'Free Fire', mode: matchForm.mode,
      starts_at: new Date(matchForm.starts_at).toISOString(), entry_fee: Number(matchForm.entry_fee),
      prize_pool: Number(matchForm.prize_pool), slots_total: Number(matchForm.slots_total), status: 'open', created_by: user.id
    });
    if (error) setNotice({ type: 'error', text: error.message });
    else { setNotice({ type: 'success', text: 'Match created.' }); setShowCreateMatch(false); setMatchForm({ title: '', mode: 'Solo', starts_at: '', entry_fee: '0', prize_pool: '0', slots_total: '48' }); await loadData(); }
  }

  async function updateMatchStatus(matchId, status) {
    if (!supabase || !isAdmin) return;
    const { error } = await supabase.from('matches').update({ status }).eq('id', matchId);
    setNotice(error ? { type: 'error', text: error.message } : { type: 'success', text: `Match set to ${status}.` });
    if (!error) await loadData();
  }

  async function refreshAdmin() {
    if (!supabase || !isAdmin) return;
    const { data, error } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
    if (error) setNotice({ type: 'error', text: error.message }); else setAdminRows(data || []);
  }

  const nav = [
    ['home', 'Home', Home], ['matches', 'Matches', Swords], ['wallet', 'Payments', Wallet],
    ['history', 'History', History], ['profile', 'Profile', UserRound]
  ];
  const title = useMemo(() => ({home:'Command Center', matches:'Free Fire Matches', wallet:'Payments & Wallet', history:'Match History', profile:'Player Profile', auth:'Player Access', admin:'Admin Control'})[view] || 'Command Center', [view]);

  useEffect(() => { if (view === 'admin') refreshAdmin(); }, [view, isAdmin]);

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Ghost size={28}/></div><div><b>GHOST ESPORT</b><small>FREE FIRE ARENA</small></div><button className="icon-btn close-nav" onClick={() => setMobileNav(false)} aria-label="Close menu"><X/></button></div>
      <div className="side-label">PLAYER HUB</div>
      {nav.map(([id, label, Icon]) => <button key={id} className={`nav-item ${view===id?'selected':''}`} onClick={() => {setView(id);setMobileNav(false)}}><Icon size={18}/><span>{label}</span></button>)}
      {isAdmin && <><div className="side-label">MANAGEMENT</div><button className={`nav-item ${view==='admin'?'selected':''}`} onClick={() => {setView('admin');setMobileNav(false)}}><ShieldCheck size={18}/><span>Admin Panel</span></button></>}
      <div className="sidebar-bottom"><div className="status-dot"/><span>{isConfigured ? 'Supabase configured' : 'Setup required'}</span><div className="sidebar-spacer"/>{user && <button className="icon-btn" title="Sign out" onClick={signOut}><LogOut size={17}/></button>}</div>
    </aside>
    {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation"/>}
    <main className="main">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu/></button><div><div className="eyebrow">GHOST ESPORT / PLAYER PORTAL</div><h1>{title}</h1></div><div className="top-actions"><span className={`connection ${isConfigured?'connected':''}`}><span/> {isConfigured?'CONNECTED':'SETUP MODE'}</span>{user ? <button className="profile-chip" onClick={() => setView('profile')}><span className="avatar">{(profile?.player_name || user.email || 'P')[0].toUpperCase()}</span><span>{profile?.player_name || user.email}</span></button> : <button className="btn btn-small" onClick={() => setView('auth')}><LogIn size={15}/> Sign in</button>}</div></header>
      {notice.text && <div className={`notice ${notice.type}`} role="status"><span>{notice.type==='error'?<AlertTriangle size={18}/>:<CheckCircle2 size={18}/>}</span><span>{notice.text}</span><button onClick={() => setNotice({type:'',text:''})} aria-label="Dismiss"><X size={16}/></button></div>}
      {!isConfigured && <div className="setup-banner"><AlertTriangle size={19}/><div><b>Backend setup required</b><p>This UI works in preview mode. Configure Supabase using the included SQL and <code>.env.local</code> to enable real accounts, database-backed matches and history. Payment actions remain disabled until a verified gateway is integrated.</p></div></div>}
      {view==='home' && <HomeView matches={matches} user={user} registrations={registrations} setView={setView} registerMatch={registerMatch}/>}
      {view==='matches' && <MatchesView matches={matches} registrations={registrations} user={user} registerMatch={registerMatch} loading={loading}/>}
      {view==='wallet' && <WalletView transactions={transactions} user={user}/>}
      {view==='history' && <HistoryView history={history} registrations={registrations} user={user}/>}
      {view==='profile' && <ProfileView user={user} profile={profile} playerName={playerName} setPlayerName={setPlayerName} gameUid={gameUid} setGameUid={setGameUid} saveProfile={saveProfile} setView={setView}/>}
      {view==='auth' && <AuthView authMode={authMode} setAuthMode={setAuthMode} authEmail={authEmail} setAuthEmail={setAuthEmail} authPassword={authPassword} setAuthPassword={setAuthPassword} authName={authName} setAuthName={setAuthName} authSubmit={authSubmit} loading={loading} supabase={supabase}/>}
      {view==='admin' && <AdminView isAdmin={isAdmin} user={user} rows={adminRows} refresh={refreshAdmin} createOpen={showCreateMatch} setCreateOpen={setShowCreateMatch} form={matchForm} setForm={setMatchForm} createMatch={createMatch} updateStatus={updateMatchStatus}/>}
      <footer className="footer"><span>© {new Date().getFullYear()} GHOST ESPORT</span><span><LockKeyhole size={12}/> Secure by design · Payments disabled until verified</span></footer>
    </main>
  </div>;
}

function HomeView({matches,user,registrations,setView,registerMatch}) {
  return <><section className="hero"><div className="hero-content"><div className="hero-kicker"><span className="pulse"/> THE BATTLEFIELD IS CALLING</div><h2>Play sharp.<br/><em>Rise as a Ghost.</em></h2><p>Join Free Fire tournaments, track your matches, and build your esports legacy.</p><div className="hero-actions"><button className="btn" onClick={() => setView('matches')}>Explore matches <Swords size={17}/></button><button className="btn btn-ghost" onClick={() => setView(user?'profile':'auth')}>{user?'Player profile':'Create account'} <UserRound size={16}/></button></div><div className="hero-note"><ShieldCheck size={15}/> Fair play. Verified results. Secure accounts.</div></div><div className="hero-emblem"><div className="emblem-ring"><Ghost size={94} strokeWidth={1.2}/></div><span className="emblem-label">GHOST<br/>DIVISION</span></div><div className="hero-index">FF / 001</div></section>
  <div className="section-heading"><div><div className="eyebrow">AT A GLANCE</div><h2>Your arena overview</h2></div><span className="subtle">{user?'Player account':'Guest preview'}</span></div>
  <div className="stats-grid"><Stat icon={Swords} label="Open matches" value={matches.filter(m=>m.status==='open').length} note="Free Fire arena"/><Stat icon={Trophy} label="Registrations" value={registrations.length} note="Your match entries"/><Stat icon={Wallet} label="Payment records" value="—" note="No wallet balance shown"/><Stat icon={Users} label="Player status" value={user?'ACTIVE':'GUEST'} note={user?'Signed in':'Sign in to compete'} compact/></div>
  <div className="section-heading"><div><div className="eyebrow">READY TO DROP?</div><h2>Featured matches</h2></div><button className="text-btn" onClick={() => setView('matches')}>All matches <span>↗</span></button></div>
  <div className="match-grid">{matches.slice(0,3).map(m=><MatchCard key={m.id} match={m} joined={registrations.some(r=>r.match_id===m.id || r.id===m.id)} registerMatch={registerMatch}/>)}</div></>;
}
function Stat({icon:Icon,label,value,note,compact}) { return <div className="stat-card"><div className="stat-top"><span>{label}</span><Icon size={17}/></div><strong className={compact?'stat-word':''}>{value}</strong><small>{note}</small></div>; }
function MatchCard({match,joined,registerMatch}) {
  const closed=match.status!=='open' || (match.slots_total && match.slots_taken>=match.slots_total);
  return <article className="match-card"><div className="match-cover"><div className="cover-lines"/><div className="cover-game"><Ghost size={42}/></div><span className={`match-status ${closed?'closed':''}`}>{closed?match.status:'REGISTRATION OPEN'}</span><span className="cover-code">G-E / FF</span></div><div className="match-body"><div className="match-tags"><span>FREE FIRE</span><span>{match.mode}</span></div><h3>{match.title}</h3><div className="match-meta"><CalendarDays size={14}/>{dateText(match.starts_at)}</div><div className="match-prizes"><div><small>ENTRY FEE</small><b>{money(match.entry_fee)}</b></div><div><small>PRIZE POOL</small><b className="green-text">{money(match.prize_pool)}</b></div><div><small>SLOTS</small><b>{match.slots_taken||0}/{match.slots_total||48}</b></div></div><button className="btn match-btn" disabled={closed||joined} onClick={() => registerMatch(match)}>{joined?'Registered':closed?'Closed':'Register for match'} <Swords size={15}/></button></div></article>;
}
function MatchesView({matches,registrations,user,registerMatch,loading}) { return <><div className="section-heading"><div><div className="eyebrow">FREE FIRE / TOURNAMENTS</div><h2>Choose your battlefield</h2></div><span className="subtle">{matches.length} match(es)</span></div><div className="info-strip"><Swords size={18}/><span>Read match rules before registering. Entry payments are not collected in this version.</span></div><div className="match-grid">{matches.map(m=><MatchCard key={m.id} match={m} joined={registrations.some(r=>r.match_id===m.id || r.id===m.id)} registerMatch={registerMatch}/>)}</div>{!matches.length&&<Empty icon={Swords} title="No matches published" text="Check again later for new Free Fire tournaments."/>}</>; }
function WalletView({transactions,user}) { return <><div className="section-heading"><div><div className="eyebrow">ACCOUNT / TRANSACTIONS</div><h2>Payments & records</h2></div></div><div className="payment-warning"><ShieldCheck size={23}/><div><b>Real payments are not enabled</b><p>bKash and Nagad deposits/entry fees will only be enabled after a verified merchant gateway, signed server-side requests, and webhook verification are configured. Never share a PIN or OTP.</p></div></div><div className="panel"><div className="panel-heading"><div><h3>Transaction history</h3><p>Verified payment records linked to your account</p></div><CircleDollarSign size={22}/></div>{!user?<Empty icon={Wallet} title="Sign in to view records" text="Your private transaction records appear after authentication."/>:transactions.length?transactions.map(t=><div className="transaction-row" key={t.id}><div className="transaction-icon"><Wallet size={17}/></div><div className="transaction-info"><b>{t.provider} payment</b><small>{dateText(t.created_at)} · Ref {t.reference||'Pending'}</small></div><b>{money(t.amount)}</b><span className={`status-label ${t.status}`}>{t.status}</span></div>):<Empty icon={Wallet} title="No transactions yet" text="When verified payment records exist, they will appear here."/>}</div></>; }
function HistoryView({history,registrations,user}) { const rows=[...registrations.map(r=>({id:'r'+r.id,title:r.matches?.title||'Match registration',detail:'Registration',date:r.created_at,status:r.status||'registered'})),...history.map(h=>({id:'h'+h.id,title:h.matches?.title||'Match activity',detail:h.event_type||'Match update',date:h.created_at,status:h.result||'recorded'}))].sort((a,b)=>new Date(b.date)-new Date(a.date));return <><div className="section-heading"><div><div className="eyebrow">PLAYER LOG / RECORDS</div><h2>Match history</h2></div></div><div className="panel">{!user?<Empty icon={History} title="Sign in to view history" text="Your match records are private to your account."/>:rows.length?rows.map(r=><div className="transaction-row" key={r.id}><div className="transaction-icon"><Trophy size={17}/></div><div className="transaction-info"><b>{r.title}</b><small>{r.detail} · {r.date?dateText(r.date):'Date unavailable'}</small></div><span className="status-label">{r.status}</span></div>):<Empty icon={History} title="No match history" text="Register for a tournament to start building your record."/>}</div></>; }
function ProfileView({user,profile,playerName,setPlayerName,gameUid,setGameUid,saveProfile,setView}) { return <><div className="section-heading"><div><div className="eyebrow">PLAYER IDENTITY</div><h2>Player profile</h2></div></div>{!user?<Empty icon={UserRound} title="Your player card starts here" text="Sign in to create and securely save your profile." action={() => setView('auth')} actionText="Sign in"/>:<div className="profile-layout"><div className="profile-banner"><div className="avatar-large"><Ghost size={48}/></div><div><span className="eyebrow">GHOST DIVISION</span><h3>{profile?.player_name||playerName||'New Player'}</h3><p>{user.email}</p></div><span className="profile-level">PLAYER</span></div><form className="panel profile-form" onSubmit={saveProfile}><div className="field"><label htmlFor="playerName">Gamer name</label><input id="playerName" value={playerName} onChange={e=>setPlayerName(e.target.value)} placeholder="e.g. GST MONNAFx9" maxLength={30} required/></div><div className="field"><label htmlFor="gameUid">Free Fire UID</label><input id="gameUid" value={gameUid} onChange={e=>setGameUid(e.target.value)} placeholder="Enter your in-game UID" maxLength={40}/></div><div className="field"><label>Registered email</label><input value={user.email||''} disabled/></div><button className="btn" type="submit">Save profile <CheckCircle2 size={16}/></button></form></div>}</>; }
function AuthView(p) { return <div className="auth-wrap"><div className="auth-art"><div className="auth-ghost"><Ghost size={75}/></div><div className="eyebrow">WELCOME TO THE DIVISION</div><h2>Every legend<br/><em>starts somewhere.</em></h2><p>Create your player account and get ready for the next Free Fire drop.</p><div className="auth-points"><span><ShieldCheck size={15}/> Account-protected profile</span><span><Trophy size={15}/> Match registration history</span></div></div><form className="panel auth-form" onSubmit={p.authSubmit}><div className="eyebrow">PLAYER ACCESS</div><h2>{p.authMode==='login'?'Welcome back':'Create your account'}</h2><p className="subtle">Use your email to access your player hub.</p>{!p.supabase&&<div className="inline-warning">Authentication is unavailable until Supabase is configured.</div>}{p.authMode==='signup'&&<div className="field"><label htmlFor="authName">Player name</label><input id="authName" value={p.authName} onChange={e=>p.setAuthName(e.target.value)} maxLength={30} required placeholder="Your gamer name"/></div>}<div className="field"><label htmlFor="authEmail">Email address</label><input id="authEmail" type="email" value={p.authEmail} onChange={e=>p.setAuthEmail(e.target.value)} required placeholder="player@example.com" autoComplete="email"/></div><div className="field"><label htmlFor="authPassword">Password</label><input id="authPassword" type="password" minLength={8} value={p.authPassword} onChange={e=>p.setAuthPassword(e.target.value)} required placeholder="At least 8 characters" autoComplete={p.authMode==='login'?'current-password':'new-password'}/></div><button className="btn auth-submit" disabled={p.loading||!p.supabase} type="submit">{p.loading?'Please wait…':p.authMode==='login'?'Sign in':'Create account'} <LogIn size={16}/></button><p className="auth-switch">{p.authMode==='login'?"New to GHOST ESPORT?":"Already registered?"} <button type="button" onClick={()=>p.setAuthMode(p.authMode==='login'?'signup':'login')}>{p.authMode==='login'?'Create account':'Sign in'}</button></p><p className="fineprint">Use a unique password. Email confirmation may be required depending on your Supabase settings.</p></form></div>; }
function AdminView({isAdmin,user,rows,refresh,createOpen,setCreateOpen,form,setForm,createMatch,updateStatus}) { if(!user)return <Empty icon={LockKeyhole} title="Admin access required" text="Sign in with an authorized administrator account."/>;if(!isAdmin)return <Empty icon={ShieldCheck} title="Restricted area" text="This account does not have administrator privileges. Admin role must be granted securely in the database."/>;return <><div className="section-heading"><div><div className="eyebrow">ADMINISTRATION / MATCH OPS</div><h2>Admin control panel</h2></div><button className="btn btn-ghost" onClick={refresh}><RefreshCw size={15}/> Refresh</button></div><div className="admin-toolbar"><div><b>Match operations</b><p>Create and manage Free Fire tournaments.</p></div><button className="btn" onClick={()=>setCreateOpen(!createOpen)}><Plus size={16}/> New match</button></div>{createOpen&&<form className="panel admin-form" onSubmit={createMatch}><div className="form-grid"><div className="field"><label>Match title</label><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required maxLength={90}/></div><div className="field"><label>Mode</label><select value={form.mode} onChange={e=>setForm({...form,mode:e.target.value})}><option>Solo</option><option>Duo</option><option>Squad</option></select></div><div className="field"><label>Start date & time</label><input type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})} required/></div><div className="field"><label>Entry fee (BDT)</label><input type="number" min="0" max="100000" value={form.entry_fee} onChange={e=>setForm({...form,entry_fee:e.target.value})} required/></div><div className="field"><label>Prize pool (BDT)</label><input type="number" min="0" max="10000000" value={form.prize_pool} onChange={e=>setForm({...form,prize_pool:e.target.value})} required/></div><div className="field"><label>Total slots</label><input type="number" min="2" max="1000" value={form.slots_total} onChange={e=>setForm({...form,slots_total:e.target.value})} required/></div></div><button className="btn" type="submit">Publish match</button></form>}<div className="panel">{rows.length?rows.map(m=><div className="admin-match" key={m.id}><div><b>{m.title}</b><small>{m.mode} · {dateText(m.starts_at)} · {money(m.entry_fee)} entry</small></div><span className="status-label">{m.status}</span><select aria-label={`Status for ${m.title}`} value={m.status} onChange={e=>updateStatus(m.id,e.target.value)}><option value="open">Open</option><option value="full">Full</option><option value="live">Live</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>):<Empty icon={Settings} title="No admin data loaded" text="Refresh after backend setup to load matches."/ >}</div><div className="inline-warning"><LockKeyhole size={16}/> Admin actions are protected by database row-level security. Never grant admin privileges through a public signup form.</div></>; }
function Empty({icon:Icon,title,text,action,actionText}) { return <div className="empty"><div className="empty-icon"><Icon size={25}/></div><b>{title}</b><p>{text}</p>{action&&<button className="btn" onClick={action}>{actionText||'Continue'}</button>}</div>; }

createRoot(document.getElementById('root')).render(<App/>);