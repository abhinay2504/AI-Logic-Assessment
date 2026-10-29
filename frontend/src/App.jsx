import { useEffect, useState } from 'react';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
const CATEGORIES = ['Scholarship', 'Concert', 'Admission', 'General Query'];
const USER_TYPES = ['Parent', 'Student', 'School'];
const STATUSES = ['New', 'In Progress', 'Resolved'];

async function request(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.token ? { Authorization: 'Bearer ' + options.token } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export default function App() {
  const [page, setPage] = useState('public');
  const [form, setForm] = useState({ userType: '', category: '', name: '', email: '', phone: '', message: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [admin, setAdmin] = useState(null);
  const [rows, setRows] = useState([]);
  const [category, setCategory] = useState('');
  const [userType, setUserType] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (token) loadRows(); }, [token, category, userType, search, status]);

  async function submitInquiry(e) {
    e.preventDefault(); setError(''); setNotice('');
    try { await request('/inquiries', { method: 'POST', body: JSON.stringify(form) }); setNotice('Thank you. Your inquiry has been submitted.'); setForm({ userType: '', category: '', name: '', email: '', phone: '', message: '' }); }
    catch (err) { setError(err.message); }
  }
  async function login(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try { const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); setToken(data.token); setAdmin(data.admin); setPage('dashboard'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  async function loadRows() {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (userType) params.set('userType', userType);
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const data = await request('/inquiries?' + params.toString(), { token });
      setRows(data.inquiries);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  async function changeStatus(id, nextStatus) {
    try { await request('/inquiries/' + id + '/status', { method: 'PATCH', token, body: JSON.stringify({ status: nextStatus }) }); await loadRows(); }
    catch (err) { setError(err.message); }
  }
  function logout() { setToken(''); setAdmin(null); setRows([]); setPage('public'); setPassword(''); setError(''); }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#" onClick={(e) => { e.preventDefault(); setPage('public'); }}><span className="brand-mark">E</span><span>edwise<span className="brand-light"> / CRM</span></span></a><nav><button className={page === 'public' ? 'nav-active' : ''} onClick={() => { setPage('public'); setError(''); }}>Submit inquiry</button><button className={page !== 'public' ? 'nav-active' : ''} onClick={() => { setPage(token ? 'dashboard' : 'login'); setError(''); }}>{token ? 'Dashboard' : 'Admin login'}</button></nav></header>
    {page === 'public' && <main className="hero-grid"><section className="hero-copy"><div className="eyebrow"><span className="eyebrow-dot"/> YOUR NEXT CHAPTER STARTS HERE</div><h1>Let's make your<br/><em>future happen.</em></h1><p className="lead">Questions about admissions, scholarships, events, or anything else? Our team is here to help you find the right path.</p><div className="trust-row"><span>✓ Personal guidance</span><span>✓ Timely response</span></div><div className="hero-note"><span className="note-icon">✳</span><span><b>Every great journey starts with a question.</b><small>Tell us what you need. We'll take it from here.</small></span></div></section><section className="form-card"><div className="form-heading"><span className="step-label">INQUIRY FORM · 01</span><h2>How can we help?</h2><p>Fill in the details and our team will get back to you.</p></div>{notice && <div className="success">{notice}</div>}{error && <div className="error">{error}</div>}<form onSubmit={submitInquiry}><div className="two-col"><label>I am a *<select required value={form.userType} onChange={e=>setForm({...form,userType:e.target.value})}><option value="">Select user type</option>{USER_TYPES.map(v=><option key={v}>{v}</option>)}</select></label><label>Inquiry category *<select required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="">Select category</option>{CATEGORIES.map(v=><option key={v}>{v}</option>)}</select></label></div><label>Full name *<input required minLength="2" maxLength="120" placeholder="Your full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><div className="two-col"><label>Email address *<input required type="email" maxLength="254" placeholder="you@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Phone number *<input required minLength="7" maxLength="25" placeholder="+91 98765 43210" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label></div><label>Your message *<textarea required minLength="5" maxLength="3000" rows="4" placeholder="Tell us a little about what you need..." value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></label><button className="primary-button" type="submit">Send inquiry <span>↗</span></button><p className="privacy-note">Your information is only used to respond to your inquiry.</p></form></section></main>}
    {page === 'login' && <main className="center-panel"><div className="form-card login-card"><span className="step-label">SECURE WORKSPACE</span><h2>Admin sign in</h2><p>Sign in to review and manage inquiries.</p>{error && <div className="error">{error}</div>}<form onSubmit={login}><label>Email address<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com"/></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label><button className="primary-button" disabled={loading}>{loading?'Signing in…':'Sign in securely'} <span>↗</span></button></form></div></main>}
    {page === 'dashboard' && token && <main className="dashboard"><div className="dash-heading"><div><span className="step-label">ADMIN WORKSPACE</span><h1>Inquiry overview</h1><p>Welcome back, {admin?.email}. Here is what your inbox looks like.</p></div><button className="outline-button" onClick={logout}>Sign out ↗</button></div>{error && <div className="error">{error}</div>}<div className="stats"><div><small>FILTERED RESULTS</small><strong>{rows.length}</strong></div><div><small>NEW</small><strong>{rows.filter(r=>r.status==='New').length}</strong></div><div><small>IN PROGRESS</small><strong>{rows.filter(r=>r.status==='In Progress').length}</strong></div><div><small>RESOLVED</small><strong>{rows.filter(r=>r.status==='Resolved').length}</strong></div></div><div className="table-card"><div className="filter-bar"><input aria-label="Search name or phone" placeholder="Search name or phone…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter category" value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{CATEGORIES.map(v=><option key={v}>{v}</option>)}</select><select aria-label="Filter user type" value={userType} onChange={e=>setUserType(e.target.value)}><option value="">All user types</option>{USER_TYPES.map(v=><option key={v}>{v}</option>)}</select><select aria-label="Filter status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map(v=><option key={v}>{v}</option>)}</select><button className="outline-button" onClick={loadRows}>Refresh</button></div><div className="table-scroll"><table><thead><tr><th>CONTACT</th><th>USER TYPE</th><th>CATEGORY</th><th>DATE</th><th>STATUS</th><th>MESSAGE</th></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="empty-cell">Loading inquiries…</td></tr> : rows.length===0 ? <tr><td colSpan="6" className="empty-cell">No inquiries found. Submit a public inquiry to get started.</td></tr> : rows.map(r=><tr key={r.id}><td><b>{r.name}</b><small>{r.email}</small><small>{r.phone}</small></td><td>{r.userType}</td><td>{r.category}</td><td>{new Date(r.createdAt).toLocaleDateString('en-IN')}</td><td><select className="status-control" value={r.status} onChange={e=>changeStatus(r.id,e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></td><td><button className="message-button" onClick={()=>window.alert(r.message)}>View message</button></td></tr>)}</tbody></table></div></div></main>}
    <footer><span>© {new Date().getFullYear()} Edwise CRM</span><span>Thoughtful guidance. Better futures.</span></footer>
  </div>;
}
