import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const SKILL_COLORS = [
  { bg: '#e8f0fe', color: '#1a56db' },
  { bg: '#fce8e6', color: '#c5221f' },
  { bg: '#e6f4ea', color: '#137333' },
  { bg: '#fef7e0', color: '#b45309' },
  { bg: '#f3e8fd', color: '#7e22ce' },
  { bg: '#e8fdf5', color: '#047857' },
  { bg: '#fff0f0', color: '#be123c' },
];

function getSkillColor(skill) {
  const index = skill ? skill.charCodeAt(0) % SKILL_COLORS.length : 0;
  return SKILL_COLORS[index];
}

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/'); return; }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, gpa, bio, branch, year, github_url, linkedin_url, phone')
      .eq('id', id)
      .single();

    if (error || !data) { navigate(-1); return; }
    setProfile(data);

    const { data: skillData } = await supabase
      .from('student_skills')
      .select('skills(skill_name)')
      .eq('student_id', id);

    setSkills(skillData?.map(s => s.skills.skill_name) || []);
    setLoading(false);
  };

  const S = {
    page: {
      minHeight: '100vh',
      background: '#f5f5f7',
      fontFamily: "-apple-system, 'SF Pro Display', BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      color: '#1d1d1f',
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
    navLogo: { fontSize: '17px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.022em' },
    backBtn: {
      fontSize: '13px', color: '#0071e3', cursor: 'pointer', fontWeight: '500',
      background: 'none', border: 'none', fontFamily: 'inherit', letterSpacing: '-0.01em',
    },
    main: { maxWidth: '720px', margin: '0 auto', padding: '80px 24px 80px' },
    heroCard: {
      background: '#fff', borderRadius: '20px', padding: '36px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '20px',
      display: 'flex', gap: '24px', alignItems: 'flex-start',
    },
    avatar: {
      width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #0071e3 0%, #42a5f5 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '28px', color: '#fff', fontWeight: '700',
    },
    heroInfo: { flex: 1 },
    name: { fontSize: '26px', fontWeight: '700', letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '4px' },
    email: { fontSize: '13px', color: '#6e6e73', marginBottom: '14px' },
    chips: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
    gpaChip: {
      padding: '5px 14px', borderRadius: '980px',
      background: '#e6f4ea', color: '#137333', fontSize: '13px', fontWeight: '700',
    },
    metaChip: {
      padding: '5px 12px', borderRadius: '980px',
      background: '#f5f5f7', color: '#3d3d3f', fontSize: '13px', fontWeight: '500',
    },
    card: {
      background: '#fff', borderRadius: '16px', padding: '24px 28px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '16px',
    },
    cardLabel: {
      fontSize: '11px', fontWeight: '600', color: '#6e6e73',
      letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '12px',
    },
    bio: { fontSize: '15px', color: '#3d3d3f', lineHeight: 1.7, letterSpacing: '-0.01em' },
    skillsRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
    skillTag: (skill) => ({
      padding: '5px 13px', borderRadius: '980px', fontSize: '13px', fontWeight: '500',
      background: getSkillColor(skill).bg, color: getSkillColor(skill).color,
    }),
    linksRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
    linkBtn: {
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '8px 16px', borderRadius: '10px',
      background: '#f0f6ff', color: '#0071e3',
      fontSize: '13px', fontWeight: '500', textDecoration: 'none',
    },
    empty: { fontSize: '13px', color: '#6e6e73', fontStyle: 'italic' },
  };

  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '15px', color: '#6e6e73' }}>Loading profile…</p>
      </div>
    );
  }

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <span style={S.navLogo}>CareerPath</span>
        <button style={S.backBtn} onClick={() => window.history.length > 1 ? navigate(-1) : window.close()}>← Back</button>
      </nav>

      <main style={S.main}>
        {/* Hero */}
        <div style={S.heroCard}>
          <div style={S.avatar}>{initials}</div>
          <div style={S.heroInfo}>
            <div style={S.name}>{profile.full_name || 'Unnamed Student'}</div>
            <div style={S.email}>{profile.email}</div>
            <div style={S.chips}>
              <span style={S.gpaChip}>CGPA {profile.gpa ?? '—'}</span>
              {profile.branch && <span style={S.metaChip}>📚 {profile.branch}</span>}
              {profile.year && <span style={S.metaChip}>🎓 Year {profile.year}</span>}
              {profile.phone && <span style={S.metaChip}>📞 {profile.phone}</span>}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div style={S.card}>
            <p style={S.cardLabel}>About</p>
            <p style={S.bio}>{profile.bio}</p>
          </div>
        )}

        {/* Skills */}
        <div style={S.card}>
          <p style={S.cardLabel}>Skills</p>
          {skills.length === 0
            ? <p style={S.empty}>No skills listed yet.</p>
            : <div style={S.skillsRow}>{skills.map(s => <span key={s} style={S.skillTag(s)}>{s}</span>)}</div>
          }
        </div>

        {/* Links */}
        {(profile.github_url || profile.linkedin_url) && (
          <div style={S.card}>
            <p style={S.cardLabel}>Links</p>
            <div style={S.linksRow}>
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noreferrer" style={S.linkBtn}>
                  ⌨️ GitHub
                </a>
              )}
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noreferrer" style={S.linkBtn}>
                  💼 LinkedIn
                </a>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
