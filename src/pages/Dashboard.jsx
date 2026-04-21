import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [name, setName] = useState('Student');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [gpa, setGpa] = useState('0.0');
  const [editingGpa, setEditingGpa] = useState(false);
  const [gpaInput, setGpaInput] = useState('');
  const [skills, setSkills] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [addingSkill, setAddingSkill] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [gapModal, setGapModal] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    
    // 1. Get Logged in User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/');
      return;
    }
    setUser(user);

    // 2. Fetch Profile (GPA, Name)
    const { data: profile } = await supabase
      .from('profiles')
      .select('gpa, full_name')
      .eq('id', user.id)
      .single();
    if (profile) {
      setGpa(profile.gpa.toString());
      setGpaInput(profile.gpa.toString());
      if (profile.full_name) {
        setName(profile.full_name);
        setNameInput(profile.full_name);
      }
    }

    // 3. Fetch Student Skills
    const { data: studentSkills } = await supabase
      .from('student_skills')
      .select('skills(skill_name)')
      .eq('student_id', user.id);
    setSkills(studentSkills?.map(s => s.skills.skill_name) || []);

    // 4. Fetch Jobs and their requirements
    const { data: jobsData } = await supabase
      .from('jobs')
      .select(`
        *,
        job_requirements(skills(skill_name))
      `);
    
    // Format job data for the UI
    const formattedJobs = jobsData?.map(job => ({
      ...job,
      skills: job.job_requirements.map(req => req.skills.skill_name)
    })) || [];
    
    setJobs(formattedJobs);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleGpaSave = async () => {
    const val = parseFloat(gpaInput);
    if (!isNaN(val) && val >= 0 && val <= 10) {
      const { error } = await supabase
        .from('profiles')
        .update({ gpa: val })
        .eq('id', user.id);
      
      if (!error) setGpa(gpaInput);
      else alert("Error updating GPA");
    }
    setEditingGpa(false);
  };

  const handleNameSave = async () => {
    const val = nameInput.trim() || 'Student';
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: val })
      .eq('id', user.id);
      
    if (!error) {
      setName(val);
    } else {
      console.error(error);
      alert('Failed to update name');
    }
    setEditingName(false);
  };

  const handleAddSkill = async () => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;

    // 1. Check if skill already exists in master 'skills' table
    let { data: skillRow } = await supabase
      .from('skills')
      .select('skill_id')
      .eq('skill_name', trimmed)
      .single();

    // 2. If skill doesn't exist, try to create it
    if (!skillRow) {
      const { data: newSkillRow, error: insertErr } = await supabase
        .from('skills')
        .insert({ skill_name: trimmed })
        .select()
        .single();
      
      if (insertErr) {
        // Try case-insensitive match before giving up
        const { data: fuzzy } = await supabase
          .from('skills')
          .select('skill_id, skill_name')
          .ilike('skill_name', trimmed)
          .single();
        
        if (fuzzy) {
          skillRow = fuzzy;
        } else {
          alert(`Could not add "${trimmed}". The skill may need to be added by an admin first.`);
          setNewSkill('');
          setAddingSkill(false);
          return;
        }
      } else {
        skillRow = newSkillRow;
      }
    }

    // 3. Link skill to student
    const { error } = await supabase
      .from('student_skills')
      .insert({ student_id: user.id, skill_id: skillRow.skill_id });

    if (error) {
      if (error.code === '23505') {
        alert('You already have this skill!');
      } else {
        alert('Error adding skill: ' + error.message);
      }
    } else {
      setSkills([...skills, trimmed]);
    }
    
    setNewSkill('');
    setAddingSkill(false);
  };

  const handleRemoveSkill = async (skillName) => {
    const { data: skillRow } = await supabase
      .from('skills')
      .select('skill_id')
      .eq('skill_name', skillName)
      .single();

    if (skillRow) {
      await supabase
        .from('student_skills')
        .delete()
        .eq('student_id', user.id)
        .eq('skill_id', skillRow.skill_id);
      
      setSkills(skills.filter(s => s !== skillName));
    }
  };

  // Compute missing skills and GPA for skill gap modal
  const missingSkills = gapModal
    ? gapModal.skills.filter(s => !skills.map(x => x.toLowerCase()).includes(s.toLowerCase()))
    : [];
  const presentSkills = gapModal
    ? gapModal.skills.filter(s => skills.map(x => x.toLowerCase()).includes(s.toLowerCase()))
    : [];
  const hasGpa = gapModal ? parseFloat(gpa) >= parseFloat(gapModal.min_gpa) : false;

  const S = {
    page: {
      minHeight: '100vh',
      background: '#f5f5f7',
      fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
      color: '#1d1d1f',
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
      letterSpacing: '-0.022em',
    },
    navRight: {
      display: 'flex', alignItems: 'center', gap: '20px',
    },
    navEmail: {
      fontSize: '13px', color: '#6e6e73', letterSpacing: '-0.01em',
    },
    navSignOut: {
      fontSize: '13px', color: '#0071e3', cursor: 'pointer',
      fontWeight: '500', background: 'none', border: 'none',
      fontFamily: 'inherit', letterSpacing: '-0.01em',
    },

    // LAYOUT
    main: {
      paddingTop: '92px',
      paddingBottom: '80px',
      maxWidth: '1080px',
      margin: '0 auto',
      padding: '92px 44px 80px',
    },

    // PAGE HEADER
    pageHeader: {
      marginBottom: '40px',
    },
    greeting: {
      fontSize: '13px', color: '#6e6e73',
      letterSpacing: '0.05em', textTransform: 'uppercase',
      fontWeight: '500', marginBottom: '6px',
    },
    pageTitle: {
      fontSize: '34px', fontWeight: '700',
      letterSpacing: '-0.03em', color: '#1d1d1f',
      marginBottom: '20px',
    },

    // PROFILE STRIP
    profileStrip: {
      display: 'flex', alignItems: 'center', gap: '20px',
      background: '#fff',
      borderRadius: '16px',
      padding: '24px 32px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      marginBottom: '32px',
    },
    avatar: {
      width: '52px', height: '52px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #0071e3 0%, #42a5f5 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '20px', color: '#fff', fontWeight: '600',
      flexShrink: 0,
    },
    profileInfo: {
      flex: 1,
    },
    profileEmail: {
      fontSize: '13px', color: '#6e6e73', letterSpacing: '-0.01em',
    },
    profileName: {
      fontSize: '20px', fontWeight: '700',
      color: '#1d1d1f', letterSpacing: '-0.02em',
      marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px'
    },
    nameInputField: {
      fontSize: '18px', fontWeight: '600',
      color: '#1d1d1f', letterSpacing: '-0.02em',
      border: '1.5px solid #0071e3',
      borderRadius: '6px', padding: '2px 8px',
      fontFamily: 'inherit', outline: 'none',
      boxShadow: '0 0 0 3px rgba(0,113,227,0.15)',
    },
    profileDept: {
      fontSize: '13px', color: '#6e6e73',
    },
    gpaBlock: {
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px',
    },
    gpaLabel: {
      fontSize: '11px', color: '#6e6e73', fontWeight: '500',
      letterSpacing: '0.05em', textTransform: 'uppercase',
    },
    gpaValue: {
      fontSize: '28px', fontWeight: '700',
      color: '#1d1d1f', letterSpacing: '-0.03em', lineHeight: 1,
    },
    gpaEdit: {
      fontSize: '12px', color: '#0071e3', cursor: 'pointer',
      background: 'none', border: 'none', fontFamily: 'inherit',
      fontWeight: '500', padding: 0,
    },

    // SECTION
    sectionLabel: {
      fontSize: '11px', fontWeight: '600',
      color: '#6e6e73', letterSpacing: '0.07em',
      textTransform: 'uppercase', marginBottom: '14px',
    },
    card: {
      background: '#fff',
      borderRadius: '16px',
      padding: '28px 32px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      marginBottom: '28px',
    },

    // SKILLS
    skillsRow: {
      display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
    },
    skillTag: (skill) => ({
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '6px 14px',
      borderRadius: '980px',
      fontSize: '13px', fontWeight: '500',
      letterSpacing: '-0.01em',
      background: getSkillColor(skill).bg,
      color: getSkillColor(skill).color,
      cursor: 'default',
    }),
    skillRemove: {
      background: 'none', border: 'none', cursor: 'pointer',
      padding: '0 0 0 2px', fontSize: '14px', lineHeight: 1,
      color: 'inherit', opacity: 0.6, fontFamily: 'inherit',
    },
    addSkillBtn: {
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '6px 14px', borderRadius: '980px',
      fontSize: '13px', fontWeight: '500',
      background: 'transparent',
      border: '1.5px dashed #c7c7cc',
      color: '#6e6e73', cursor: 'pointer',
      fontFamily: 'inherit', letterSpacing: '-0.01em',
      transition: 'border-color 0.2s, color 0.2s',
    },
    skillInput: {
      padding: '6px 12px', borderRadius: '10px',
      border: '1.5px solid #0071e3',
      fontSize: '13px', fontFamily: 'inherit',
      outline: 'none', width: '120px',
      boxShadow: '0 0 0 3px rgba(0,113,227,0.15)',
    },
    skillInputSave: {
      padding: '6px 14px', borderRadius: '980px',
      background: '#0071e3', color: '#fff',
      border: 'none', fontSize: '13px',
      fontFamily: 'inherit', fontWeight: '500',
      cursor: 'pointer', letterSpacing: '-0.01em',
    },

    // JOB FEED
    jobGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px',
    },
    jobCard: {
      background: '#fff',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: 'column', gap: '16px',
      transition: 'box-shadow 0.2s, transform 0.2s',
    },
    jobCardTop: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    },
    companyBadge: {
      width: '44px', height: '44px',
      borderRadius: '12px',
      background: '#f5f5f7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '18px', fontWeight: '700',
      color: '#1d1d1f', letterSpacing: '-0.02em',
    },
    packageTag: {
      fontSize: '12px', fontWeight: '600',
      color: '#137333', background: '#e6f4ea',
      padding: '4px 10px', borderRadius: '980px',
      letterSpacing: '-0.01em',
    },
    jobCompany: {
      fontSize: '13px', color: '#6e6e73',
      marginBottom: '2px', letterSpacing: '-0.01em',
    },
    jobRole: {
      fontSize: '17px', fontWeight: '600',
      color: '#1d1d1f', letterSpacing: '-0.022em',
    },
    jobMeta: {
      display: 'flex', gap: '16px',
    },
    jobMetaItem: {
      fontSize: '12px', color: '#6e6e73',
    },
    jobMetaValue: {
      fontWeight: '600', color: '#1d1d1f',
    },
    jobSkillsRow: {
      display: 'flex', flexWrap: 'wrap', gap: '6px',
    },
    jobSkillPill: {
      fontSize: '11px', fontWeight: '500',
      padding: '3px 10px', borderRadius: '980px',
      background: '#f5f5f7', color: '#6e6e73',
      letterSpacing: '-0.01em',
    },
    checkGapBtn: {
      width: '100%', padding: '11px',
      background: '#0071e3', color: '#fff',
      border: 'none', borderRadius: '10px',
      fontSize: '14px', fontWeight: '500',
      fontFamily: 'inherit', cursor: 'pointer',
      letterSpacing: '-0.01em',
      transition: 'background 0.2s',
    },

    // GPA EDIT INLINE
    gpaInputField: {
      fontSize: '22px', fontWeight: '700',
      color: '#1d1d1f', letterSpacing: '-0.03em',
      border: '1.5px solid #0071e3',
      borderRadius: '8px', padding: '2px 8px',
      width: '70px', fontFamily: 'inherit',
      outline: 'none', textAlign: 'center',
      boxShadow: '0 0 0 3px rgba(0,113,227,0.15)',
    },

    // MODAL OVERLAY
    overlay: {
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.35)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    modal: {
      background: '#fff',
      borderRadius: '20px',
      width: '100%', maxWidth: '460px',
      padding: '36px',
      boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
      position: 'relative',
    },
    modalClose: {
      position: 'absolute', top: '16px', right: '18px',
      background: '#f5f5f7', border: 'none', borderRadius: '50%',
      width: '30px', height: '30px', fontSize: '16px',
      cursor: 'pointer', color: '#6e6e73',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'inherit',
    },
    modalEyebrow: {
      fontSize: '11px', fontWeight: '600',
      color: '#6e6e73', letterSpacing: '0.07em',
      textTransform: 'uppercase', marginBottom: '6px',
    },
    modalTitle: {
      fontSize: '22px', fontWeight: '700',
      letterSpacing: '-0.03em', color: '#1d1d1f',
      marginBottom: '24px',
    },
    gapRow: {
      marginBottom: '20px',
    },
    gapSectionLabel: {
      fontSize: '12px', fontWeight: '600',
      color: '#6e6e73', letterSpacing: '0.04em',
      textTransform: 'uppercase', marginBottom: '10px',
    },
    gapPillHave: {
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '5px 12px', borderRadius: '980px',
      fontSize: '13px', fontWeight: '500',
      background: '#e6f4ea', color: '#137333',
      margin: '0 6px 6px 0',
    },
    gapPillMissing: {
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '5px 12px', borderRadius: '980px',
      fontSize: '13px', fontWeight: '500',
      background: '#fce8e6', color: '#c5221f',
      margin: '0 6px 6px 0',
    },
    gapSummary: {
      marginTop: '20px',
      padding: '14px 18px',
      borderRadius: '12px',
      background: (missingSkills?.length === 0 && hasGpa) ? '#e6f4ea' : '#fce8e6',
      fontSize: '13px', fontWeight: '500',
      color: (missingSkills?.length === 0 && hasGpa) ? '#137333' : '#c5221f',
      letterSpacing: '-0.01em', lineHeight: 1.5,
    },

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

  if (loading) return <div style={{...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Loading...</div>

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <span style={S.navLogo}>CareerPath</span>
        <div style={S.navRight}>
          <span style={S.navEmail}>{user?.email}</span>
          <button style={S.navSignOut} onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>

      <main style={S.main}>
        <div style={S.pageHeader}>
          <p style={S.greeting}>Student Dashboard</p>
          <h1 style={S.pageTitle}>Your Placement Hub</h1>
        </div>

        <div style={S.profileStrip}>
          <div style={S.avatar}>
            {name[0].toUpperCase()}
          </div>
          <div style={S.profileInfo}>
            {editingName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <input
                  style={S.nameInputField}
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                  autoFocus
                  placeholder="Your Name"
                />
                <button style={S.gpaEdit} onClick={handleNameSave}>Save</button>
              </div>
            ) : (
              <div style={S.profileName}>
                {name}
                <button style={S.gpaEdit} onClick={() => { setNameInput(name); setEditingName(true); }}>Edit</button>
              </div>
            )}
            <div style={S.profileEmail}>{user?.email}</div>
          </div>
          <div style={S.gpaBlock}>
            <span style={S.gpaLabel}>CGPA</span>
            {editingGpa ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  style={S.gpaInputField}
                  value={gpaInput}
                  onChange={e => setGpaInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGpaSave()}
                  autoFocus
                  maxLength={4}
                />
                <button style={S.gpaEdit} onClick={handleGpaSave}>Save</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={S.gpaValue}>{gpa}</span>
                <button style={S.gpaEdit} onClick={() => { setGpaInput(gpa); setEditingGpa(true); }}>Edit</button>
              </div>
            )}
          </div>
        </div>

        <div style={S.card}>
          <p style={S.sectionLabel}>My Skills</p>
          <div style={S.skillsRow}>
            {skills.map(skill => (
              <span key={skill} style={S.skillTag(skill)}>
                {skill}
                <button
                  style={S.skillRemove}
                  onClick={() => handleRemoveSkill(skill)}
                  title="Remove"
                >×</button>
              </span>
            ))}

            {addingSkill ? (
              <>
                <input
                  style={S.skillInput}
                  placeholder="e.g. Docker"
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddSkill(); if (e.key === 'Escape') setAddingSkill(false); }}
                  autoFocus
                />
                <button style={S.skillInputSave} onClick={handleAddSkill}>Add</button>
                <button
                  style={{ ...S.gpaEdit, color: '#6e6e73' }}
                  onClick={() => setAddingSkill(false)}
                >Cancel</button>
              </>
            ) : (
              <button
                style={S.addSkillBtn}
                onClick={() => setAddingSkill(true)}
              >
                Add Skill
              </button>
            )}
          </div>
        </div>

        <p style={{ ...S.sectionLabel, marginBottom: '18px' }}>Job Feed · {jobs.length} openings</p>
        <div style={S.jobGrid}>
          {jobs.map(job => (
            <div key={job.id} style={S.jobCard}>
              <div style={S.jobCardTop}>
                <div style={S.companyBadge}>{job.company[0]}</div>
                <span style={S.packageTag}>{job.package_val}</span>
              </div>
              <div>
                <div style={S.jobCompany}>{job.company}</div>
                <div style={S.jobRole}>{job.role}</div>
              </div>
              <div style={S.jobMeta}>
                <div style={S.jobMetaItem}>
                  Min CGPA: <span style={S.jobMetaValue}>{job.min_gpa}</span>
                </div>
              </div>
              <div style={S.jobSkillsRow}>
                {job.skills.map(s => (
                  <span key={s} style={S.jobSkillPill}>{s}</span>
                ))}
              </div>
              <button style={S.checkGapBtn} onClick={() => setGapModal(job)}>
                Check Skill Gap →
              </button>
            </div>
          ))}
        </div>
      </main>

      <footer style={S.footer}>
        <span style={S.footerText}>Copyright © 2024 CareerPath. NMAMIT, Nitte.</span>
      </footer>

      {gapModal && (
        <div style={S.overlay} onClick={() => setGapModal(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <button style={S.modalClose} onClick={() => setGapModal(null)}>×</button>
            <p style={S.modalEyebrow}>{gapModal.company} · {gapModal.role}</p>
            <h2 style={S.modalTitle}>Gap Report</h2>
            
            <div style={{...S.gapRow, paddingBottom: '16px', borderBottom: '1px solid #f0f0f0', marginBottom: '16px'}}>
              <p style={S.gapSectionLabel}>CGPA Requirement: {gapModal.min_gpa}</p>
              <div>
                {hasGpa 
                  ? <span style={S.gapPillHave}>✓ You have {gpa}</span>
                  : <span style={S.gapPillMissing}>✗ You have {gpa}</span>
                }
              </div>
            </div>

            {presentSkills.length > 0 && (
              <div style={S.gapRow}>
                <p style={S.gapSectionLabel}>✓ Skills You Have</p>
                <div>{presentSkills.map(s => <span key={s} style={S.gapPillHave}>✓ {s}</span>)}</div>
              </div>
            )}
            {missingSkills.length > 0 && (
              <div style={S.gapRow}>
                <p style={S.gapSectionLabel}>✗ Skills You're Missing</p>
                <div>{missingSkills.map(s => <span key={s} style={S.gapPillMissing}>✗ {s}</span>)}</div>
              </div>
            )}
            <div style={S.gapSummary}>
              {missingSkills.length === 0 && hasGpa
                ? '🎉 You meet all requirements!'
                : `You are missing ${[
                    !hasGpa ? 'the CGPA requirement' : null,
                    missingSkills.length > 0 ? `${missingSkills.length} skill(s)` : null
                  ].filter(Boolean).join(' and ')}.`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}