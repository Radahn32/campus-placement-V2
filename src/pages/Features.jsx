import { Link } from 'react-router-dom';

export default function Features() {
  const S = {
    page: {
      minHeight: '100vh',
      background: '#ffffff',
      fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      color: '#1d1d1f',
      padding: '120px 44px 80px',
    },
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
    h1: {
      fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: '700',
      letterSpacing: '-0.04em', lineHeight: 1.05,
      marginBottom: '24px', textAlign: 'center',
    },
    content: {
      maxWidth: '800px', margin: '0 auto', fontSize: '19px',
      lineHeight: 1.6, color: '#6e6e73', textAlign: 'center',
    },
    grid: {
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '32px', marginTop: '64px', maxWidth: '1000px', margin: '64px auto 0',
    },
    card: {
      background: '#f5f5f7', borderRadius: '18px', padding: '40px',
      textAlign: 'left',
    },
    cardIcon: { fontSize: '32px', marginBottom: '16px', color: '#0071e3' },
    cardTitle: { fontSize: '24px', fontWeight: '600', marginBottom: '12px', color: '#1d1d1f', letterSpacing: '-0.022em' },
    cardDesc: { fontSize: '15px', color: '#6e6e73', lineHeight: 1.5 },
  };

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <Link to="/" style={S.navLogo}>CareerPath</Link>
        <div style={S.navLinks}>
          <Link to="/features" style={{ ...S.navLink, color: '#1d1d1f' }}>Features</Link>
          <Link to="/about" style={S.navLink}>About</Link>
          <Link to="/nmamit" style={S.navLink}>NMAMIT</Link>
        </div>
      </nav>

      <h1 style={S.h1}>Powerful features for your career.</h1>
      <p style={S.content}>
        Discover how CareerPath equips you with the tools you need to succeed in campus placements.
      </p>

      <div style={S.grid}>
        <div style={S.card}>
          <div style={S.cardIcon}>◎</div>
          <h3 style={S.cardTitle}>Skill Gap Engine</h3>
          <p style={S.cardDesc}>Identify exactly which skills you are missing for your target roles and get actionable recommendations to bridge the gap.</p>
        </div>
        <div style={S.card}>
          <div style={S.cardIcon}>●</div>
          <h3 style={S.cardTitle}>Live Eligibility</h3>
          <p style={S.cardDesc}>Instantly see which job postings you qualify for based on your current GPA, skills, and academic standing.</p>
        </div>
        <div style={S.card}>
          <div style={S.cardIcon}>◈</div>
          <h3 style={S.cardTitle}>TPO Dashboard</h3>
          <p style={S.cardDesc}>A comprehensive suite for placement officers to manage job listings, track student progress, and streamline recruitment.</p>
        </div>
      </div>
    </div>
  );
}
