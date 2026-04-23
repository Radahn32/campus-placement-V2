import { Link } from 'react-router-dom';

export default function About() {
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
    section: {
      maxWidth: '800px', margin: '64px auto 0',
    },
    h2: {
      fontSize: '32px', fontWeight: '600', marginBottom: '24px', letterSpacing: '-0.022em', color: '#1d1d1f'
    },
    p: {
      fontSize: '17px', color: '#1d1d1f', lineHeight: 1.6, marginBottom: '24px',
    }
  };

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <Link to="/" style={S.navLogo}>CareerPath</Link>
        <div style={S.navLinks}>
          <Link to="/features" style={S.navLink}>Features</Link>
          <Link to="/about" style={{ ...S.navLink, color: '#1d1d1f' }}>About</Link>
          <Link to="/nmamit" style={S.navLink}>NMAMIT</Link>
        </div>
      </nav>

      <h1 style={S.h1}>About CareerPath.</h1>
      <p style={S.content}>
        Bridging the gap between student potential and industry requirements.
      </p>

      <div style={S.section}>
        <h2 style={S.h2}>Our Mission</h2>
        <p style={S.p}>
          CareerPath was built with a singular goal: to demystify the campus placement process. We believe that every student deserves clear, actionable insights into what it takes to land their dream job.
        </p>
        <p style={S.p}>
          By leveraging data and intelligent skill matching, we provide a platform that not only connects students with opportunities but also guides them on their learning journey to become eligible for those opportunities.
        </p>
      </div>
    </div>
  );
}
