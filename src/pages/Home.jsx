import { supabase } from '../supabase';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Home() {
  const [activeTab, setActiveTab] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Authenticate the email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert("Login failed: " + error.message);
      setLoading(false);
      return;
    }

    // 2. Fetch their true role from the database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    setLoading(false);

    if (profileError) {
      alert("Security Error: Could not verify your role.");
      console.error(profileError);
      await supabase.auth.signOut(); // Kick them out
      return;
    }

    console.log("Database says this user is a:", profile.role);

    // 3. EXPLICIT SECURITY BLOCKS
    if (activeTab === 'admin' && profile.role !== 'tpo') {
      alert("Access Denied: This portal is strictly for TPO Administrators.");
      await supabase.auth.signOut(); // Destroy the login session
      return;
    }

    if (activeTab === 'student' && profile.role !== 'student') {
      alert("Access Denied: TPO Administrators must use the Admin tab.");
      await supabase.auth.signOut(); // Destroy the login session
      return;
    }

    // 4. If they pass the security checks, let them in
    if (profile.role === 'tpo') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const S = {
    page: {
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      color: '#1d1d1f',
      overflowX: 'hidden',
    },

    // NAV
    nav: {
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: '52px',
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderBottom: '1px solid rgba(0,0,0,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 44px',
    },
    navLogo: {
      fontSize: '17px', fontWeight: '600', color: '#1d1d1f',
      letterSpacing: '-0.022em', textDecoration: 'none',
    },
    navLinks: {
      display: 'flex', gap: '32px', alignItems: 'center',
    },
    navLink: {
      fontSize: '12px', color: '#6e6e73', fontWeight: '400',
      letterSpacing: '0.01em', cursor: 'pointer', textDecoration: 'none',
      transition: 'color 0.2s',
    },

    // HERO
    hero: {
      paddingTop: '140px',
      paddingBottom: '80px',
      textAlign: 'center',
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : 'translateY(20px)',
      transition: 'opacity 0.9s ease, transform 0.9s ease',
    },
    eyebrow: {
      fontSize: '17px', fontWeight: '400',
      color: '#0071e3', letterSpacing: '-0.01em',
      marginBottom: '12px',
    },
    h1: {
      fontSize: 'clamp(48px, 7vw, 80px)',
      fontWeight: '700',
      letterSpacing: '-0.04em',
      lineHeight: 1.05,
      color: '#1d1d1f',
      margin: '0 auto 20px',
      maxWidth: '800px',
    },
    h1sub: {
      color: '#6e6e73',
    },
    heroSub: {
      fontSize: '19px', fontWeight: '400',
      color: '#6e6e73', lineHeight: 1.6,
      maxWidth: '520px', margin: '0 auto 44px',
      letterSpacing: '-0.01em',
    },
    heroBtns: {
      display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center',
    },
    btnPrimary: {
      padding: '14px 28px', borderRadius: '980px',
      background: '#0071e3', color: '#fff',
      fontSize: '15px', fontWeight: '500',
      border: 'none', cursor: 'pointer',
      letterSpacing: '-0.01em',
      transition: 'background 0.2s, transform 0.15s',
    },
    btnGhost: {
      padding: '14px 28px', borderRadius: '980px',
      background: 'transparent', color: '#0071e3',
      fontSize: '15px', fontWeight: '500',
      border: 'none', cursor: 'pointer',
      letterSpacing: '-0.01em',
      transition: 'color 0.2s',
      textDecoration: 'none',
      display: 'inline-flex', alignItems: 'center', gap: '4px',
    },

    // DIVIDER
    divider: {
      height: '1px', background: '#d2d2d7',
      margin: '0 44px',
    },

    // FEATURES STRIP
    strip: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      padding: '60px 80px',
      gap: '1px',
      background: '#d2d2d7',
      borderTop: '1px solid #d2d2d7',
      borderBottom: '1px solid #d2d2d7',
    },
    stripCell: {
      background: '#fff',
      padding: '48px 40px',
      textAlign: 'center',
    },
    stripIcon: {
      fontSize: '28px', marginBottom: '16px', display: 'block',
    },
    stripTitle: {
      fontSize: '19px', fontWeight: '600',
      color: '#1d1d1f', letterSpacing: '-0.022em',
      marginBottom: '8px',
    },
    stripDesc: {
      fontSize: '14px', color: '#6e6e73',
      lineHeight: 1.6, letterSpacing: '-0.01em',
    },

    // LOGIN SECTION
    loginSection: {
      padding: '100px 44px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    loginEyebrow: {
      fontSize: '13px', fontWeight: '500',
      color: '#6e6e73', letterSpacing: '0.05em',
      textTransform: 'uppercase', marginBottom: '12px',
    },
    loginHeading: {
      fontSize: '40px', fontWeight: '700',
      letterSpacing: '-0.03em', color: '#1d1d1f',
      marginBottom: '48px', textAlign: 'center',
    },
    loginCard: {
      width: '100%', maxWidth: '440px',
      background: '#f5f5f7',
      borderRadius: '18px',
      overflow: 'hidden',
    },

    // TABS
    tabs: {
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      borderBottom: '1px solid #d2d2d7',
    },
    tab: (active) => ({
      padding: '16px', border: 'none', cursor: 'pointer',
      fontFamily: 'inherit', fontSize: '14px', fontWeight: active ? '600' : '400',
      background: active ? '#fff' : 'transparent',
      color: active ? '#1d1d1f' : '#6e6e73',
      borderBottom: active ? '2px solid #0071e3' : '2px solid transparent',
      transition: 'all 0.2s', letterSpacing: '-0.01em',
    }),

    // FORM
    form: { padding: '36px 36px 32px' },
    formGroup: { marginBottom: '18px' },
    label: {
      display: 'block', fontSize: '12px', fontWeight: '500',
      color: '#6e6e73', marginBottom: '7px', letterSpacing: '0.01em',
    },
    input: {
      width: '100%', padding: '12px 14px',
      background: '#fff', border: '1px solid #d2d2d7',
      borderRadius: '10px', fontSize: '15px',
      fontFamily: 'inherit', color: '#1d1d1f',
      outline: 'none', boxSizing: 'border-box',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      letterSpacing: '-0.01em',
    },
    submitBtn: (loading) => ({
      width: '100%', padding: '14px',
      background: loading ? '#6e9fd8' : '#0071e3',
      color: '#fff', border: 'none',
      borderRadius: '10px', fontSize: '15px',
      fontWeight: '500', fontFamily: 'inherit',
      cursor: loading ? 'default' : 'pointer',
      marginTop: '8px', letterSpacing: '-0.01em',
      transition: 'background 0.2s',
    }),

    // FOOTER
    footer: {
      borderTop: '1px solid #d2d2d7',
      padding: '24px 44px',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
    },
    footerText: {
      fontSize: '12px', color: '#6e6e73',
    },
  };

  return (
    <div style={S.page}>
      {/* Google Font — SF Pro fallback */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={S.nav}>
        <span style={S.navLogo}>CareerPath</span>
        <div style={S.navLinks}>
          <Link to="/features" style={S.navLink}>Features</Link>
          <Link to="/about" style={S.navLink}>About</Link>
          <Link to="/nmamit" style={S.navLink}>NMAMIT</Link>
        </div>
        <button
          onClick={() => document.getElementById('login-section').scrollIntoView({ behavior: 'smooth' })}
          style={{ ...S.btnPrimary, padding: '8px 18px', fontSize: '13px' }}
        >
          Sign In
        </button>
      </nav>

      {/* HERO */}
      <section style={S.hero}>
        <p style={S.eyebrow}>Campus Placement, Reimagined.</p>
        <h1 style={S.h1}>
          Know exactly<br />
          <span style={S.h1sub}>what's holding you back.</span>
        </h1>
        <p style={S.heroSub}>
          CareerPath doesn't just show you job listings.
          It tells you precisely which skills you need to land them.
        </p>
        <div style={S.heroBtns}>
          <button
            style={S.btnPrimary}
            onClick={() => document.getElementById('login-section').scrollIntoView({ behavior: 'smooth' })}
            onMouseEnter={e => e.currentTarget.style.background = '#0077ed'}
            onMouseLeave={e => e.currentTarget.style.background = '#0071e3'}
          >
            Get started
          </button>
          <Link to="/features" style={S.btnGhost}>
            Learn more
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0071e3" strokeWidth="2.5"><polyline points="9,18 15,12 9,6" /></svg>
          </Link>
        </div>
      </section>

      {/* DIVIDER */}
      <div style={S.divider} />

      {/* FEATURES STRIP */}
      <div style={S.strip}>
        {[
          {
            icon: '◎',
            title: 'Skill Gap Engine',
            desc: 'Powered by PostgreSQL set operations. See the exact skills between you and your dream job.',
          },
          {
            icon: '●',
            title: 'Live Eligibility',
            desc: 'Green means apply now. Red means here\'s what to learn. No more silent rejections.',
          },
          {
            icon: '◈',
            title: 'TPO Dashboard',
            desc: 'Filter every student by GPA and skill in seconds. Invite the right candidates instantly.',
          },
        ].map((f, i) => (
          <div key={i} style={S.stripCell}>
            <span style={{ ...S.stripIcon, color: '#0071e3' }}>{f.icon}</span>
            <div style={S.stripTitle}>{f.title}</div>
            <div style={S.stripDesc}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* LOGIN SECTION */}
      <section id="login-section" style={S.loginSection}>
        <p style={S.loginEyebrow}>NMAMIT · Placement Portal</p>
        <h2 style={S.loginHeading}>Sign in to CareerPath</h2>

        <div style={S.loginCard}>
          {/* Tabs */}
          <div style={S.tabs}>
            {[
              { key: 'student', label: 'Student' },
              { key: 'admin', label: 'TPO Admin' },
            ].map(t => (
              <button
                key={t.key}
                style={S.tab(activeTab === t.key)}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form style={S.form} onSubmit={handleLogin}>
            <p style={{ fontSize: '13px', color: '#6e6e73', marginBottom: '24px', letterSpacing: '-0.01em', lineHeight: 1.5 }}>
              {activeTab === 'student'
                ? 'View your job feed, check eligibility and discover your skill gaps.'
                : 'Manage job postings, filter candidates and send interview invites.'}
            </p>

            <div style={S.formGroup}>
              <label style={S.label}>Email Address</label>
              <input
                type="email" required
                style={S.input}
                placeholder={activeTab === 'student' ? 'nnm2XX@nmamit.in' : 'tpoXX@nmamit.in'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={e => {
                  e.target.style.borderColor = '#0071e3';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#d2d2d7';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={S.formGroup}>
              <label style={S.label}>Password</label>
              <input
                type="password" required
                style={S.input}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={e => {
                  e.target.style.borderColor = '#0071e3';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#d2d2d7';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              style={S.submitBtn(loading)}
              onMouseEnter={e => { if (!loading) e.target.style.background = '#0077ed'; }}
              onMouseLeave={e => { if (!loading) e.target.style.background = '#0071e3'; }}
            >
              {loading ? 'Signing in…' : `Sign in as ${activeTab === 'student' ? 'Student' : 'TPO Admin'}`}
            </button>
          </form>
        </div>

        <p style={{ marginTop: '24px', fontSize: '12px', color: '#6e6e73', textAlign: 'center' }}>
          NMAMIT Nitte
        </p>
      </section>

      {/* FOOTER */}
      <footer style={S.footer}>
        <span style={S.footerText}>Copyright © 2026 CareerPath. NMAMIT, Nitte.</span>
      </footer>
    </div>
  );
}
