import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import emailjs from '@emailjs/browser';

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ company: '', role: '', minGpa: '', package: '', skills: '' });
  const [formSuccess, setFormSuccess] = useState(false);
  const [posting, setPosting] = useState(false);
  const [studentsModal, setStudentsModal] = useState(null);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  
  // Email states
  const [composeModal, setComposeModal] = useState(null);
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/'); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'tpo') {
      await supabase.auth.signOut();
      navigate('/');
      return;
    }

    setUser(user);
    await fetchJobs();
    setLoading(false);
  };

  const fetchJobs = async () => {
    const { data } = await supabase
      .from('jobs')
      .select('*, job_requirements(skills(skill_name))');

    const formatted = data?.map(job => ({
      ...job,
      skills: job.job_requirements?.map(req => req.skills.skill_name) || []
    })) || [];

    setJobs(formatted);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFormSuccess(false);
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    setPosting(true);

    const skillNames = form.skills.split(',').map(s => s.trim()).filter(Boolean);

    // 1. Insert the job
    const { data: newJob, error } = await supabase
      .from('jobs')
      .insert({
        company: form.company,
        role: form.role,
        min_gpa: parseFloat(form.minGpa) || 0,
        package_val: form.package || 'TBD',
      })
      .select()
      .single();

    if (error) {
      alert('Error posting job: ' + error.message);
      setPosting(false);
      return;
    }

    // 2. For each skill, ensure it exists then link to job
    for (const name of skillNames) {
      let { data: skill } = await supabase
        .from('skills')
        .select('skill_id')
        .eq('skill_name', name)
        .single();

      if (!skill) {
        const { data: created } = await supabase
          .from('skills')
          .insert({ skill_name: name })
          .select()
          .single();
        skill = created;
      }

      if (skill) {
        await supabase
          .from('job_requirements')
          .insert({ job_id: newJob.job_id, skill_id: skill.skill_id });
      }
    }

    setForm({ company: '', role: '', minGpa: '', package: '', skills: '' });
    setFormSuccess(true);
    setPosting(false);
    setTimeout(() => setFormSuccess(false), 3000);
    await fetchJobs();
  };

  const handleDeleteJob = async (job) => {
    if (!confirm(`Delete "${job.company} — ${job.role}"? This cannot be undone.`)) return;

    // 1. Delete linked job_requirements first (FK constraint)
    await supabase
      .from('job_requirements')
      .delete()
      .eq('job_id', job.job_id);

    // 2. Delete the job
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('job_id', job.job_id);

    if (error) {
      alert('Error deleting job: ' + error.message);
    } else {
      await fetchJobs();
    }
  };

  const handleViewEligible = async (job) => {
    setStudentsModal(job);
    setLoadingStudents(true);
    setEligibleStudents([]);

    // Fetch all students (removed .gte('gpa') so we can safely filter numerically on the frontend)
    const { data: students } = await supabase
      .from('profiles')
      .select('id, email, gpa, student_skills(skills(skill_name))')
      .eq('role', 'student');

    if (!students || students.length === 0) {
      setEligibleStudents([]);
      setLoadingStudents(false);
      return;
    }

    // Filter: student must have ALL required skills and meet min GPA
    const requiredSkills = job.skills || [];
    const minGpaNum = parseFloat(job.min_gpa) || 0;
    
    const eligible = students
      .map(s => ({
        id: s.id,
        email: s.email,
        gpa: parseFloat(s.gpa) || 0,
        skills: s.student_skills?.map(ss => ss.skills.skill_name) || [],
      }))
      .filter(s => {
        // Enforce exact numeric check
        if (s.gpa < minGpaNum) return false;

        // If job requires skills, student must have ALL of them
        if (requiredSkills.length > 0) {
          return requiredSkills.every(req =>
            s.skills.some(sk => sk.toLowerCase() === req.toLowerCase())
          );
        }
        return true;
      });

    // Try to get emails from auth (we'll use the user ID as fallback)
    // Since we can't query auth.users from client, we'll show IDs
    // In a real app, you'd store email in profiles
    setEligibleStudents(eligible);
    setLoadingStudents(false);
  };

  const handleOpenCompose = (student, job) => {
    setComposeModal({
      studentEmail: student.email,
      jobRole: job.role,
      jobCompany: job.company
    });
    setEmailMessage(`Hi,\n\nWe are pleased to invite you to an interview for the ${job.role} position at ${job.company}.\n\nPlease let us know your availability for the next round.\n\nRegards,\nPlacement Cell`);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!composeModal) return;

    // We only need EmailJS to be initialized here or at the top of the file
    // emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY); // Or pass directly to send()
    
    setSendingEmail(true);

    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_xxx', // Fallback for no errors if env missing
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_xxx',
        {
          to_email: composeModal.studentEmail,
          subject: `Interview Invitation for ${composeModal.jobRole} at ${composeModal.jobCompany}`,
          message: emailMessage,
          name: 'Placement Cell',
          email: user?.email || 'admin@nmamit.in'
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'public_xxx'
      );
      alert('Email sent successfully!');
      setComposeModal(null);
    } catch (err) {
      console.error('FAILED...', err);
      alert('Failed to send email. Check console for details. Have you set up your EmailJS keys in .env?');
    } finally {
      setSendingEmail(false);
    }
  };

  const activeJobs = jobs.filter(j => j.status === 'Active' || !j.status).length;

  const S = {
    page: {
      minHeight: '100vh',
      background: '#f5f5f7',
      fontFamily: "-apple-system, 'SF Pro Display', 'SF Pro Text', BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
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
    navLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
    navLogo: { fontSize: '17px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.022em' },
    navBadge: {
      fontSize: '11px', fontWeight: '600', color: '#fff', background: '#0071e3',
      padding: '2px 8px', borderRadius: '980px', letterSpacing: '0.03em',
    },
    navRight: { display: 'flex', alignItems: 'center', gap: '20px' },
    navEmail: { fontSize: '13px', color: '#6e6e73', letterSpacing: '-0.01em' },
    navSignOut: {
      fontSize: '13px', color: '#0071e3', cursor: 'pointer', fontWeight: '500',
      background: 'none', border: 'none', fontFamily: 'inherit', letterSpacing: '-0.01em',
    },
    main: { maxWidth: '1100px', margin: '0 auto', padding: '92px 44px 80px' },
    pageTitle: { fontSize: '34px', fontWeight: '700', letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '4px' },
    pageSub: { fontSize: '15px', color: '#6e6e73', marginBottom: '40px', letterSpacing: '-0.01em' },
    statsStrip: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '36px' },
    statCard: { background: '#fff', borderRadius: '14px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
    statLabel: { fontSize: '12px', fontWeight: '500', color: '#6e6e73', letterSpacing: '0.02em', marginBottom: '6px' },
    statValue: { fontSize: '28px', fontWeight: '700', color: '#1d1d1f', letterSpacing: '-0.03em' },
    twoCol: { display: 'grid', gridTemplateColumns: '380px 1fr', gap: '28px', alignItems: 'start' },
    card: { background: '#fff', borderRadius: '16px', padding: '28px 32px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
    sectionLabel: {
      fontSize: '11px', fontWeight: '600', color: '#6e6e73',
      letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '4px',
    },
    sectionTitle: { fontSize: '20px', fontWeight: '700', color: '#1d1d1f', letterSpacing: '-0.025em', marginBottom: '24px' },
    formGroup: { marginBottom: '16px' },
    label: { display: 'block', fontSize: '12px', fontWeight: '500', color: '#6e6e73', marginBottom: '7px', letterSpacing: '0.01em' },
    input: {
      width: '100%', padding: '11px 14px', background: '#f5f5f7', border: '1px solid #e5e5ea',
      borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', color: '#1d1d1f',
      outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
      letterSpacing: '-0.01em',
    },
    formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    submitBtn: {
      width: '100%', padding: '13px', background: posting ? '#6e9fd8' : '#0071e3', color: '#fff',
      border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500',
      fontFamily: 'inherit', cursor: posting ? 'default' : 'pointer',
      letterSpacing: '-0.01em', marginTop: '8px', transition: 'background 0.2s',
    },
    successBanner: {
      marginTop: '12px', padding: '11px 14px', background: '#e6f4ea', borderRadius: '10px',
      fontSize: '13px', color: '#137333', fontWeight: '500', letterSpacing: '-0.01em', textAlign: 'center',
    },
    tableCard: { background: '#fff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' },
    tableHeader: {
      padding: '24px 28px 18px', borderBottom: '1px solid #f0f0f0',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: {
      padding: '10px 16px', fontSize: '11px', fontWeight: '600', color: '#6e6e73',
      letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'left',
      background: '#fafafa', borderBottom: '1px solid #f0f0f0',
    },
    td: (hovered) => ({
      padding: '14px 16px', fontSize: '13px', color: '#1d1d1f', letterSpacing: '-0.01em',
      borderBottom: '1px solid #f5f5f7', background: hovered ? '#f9f9fb' : '#fff', transition: 'background 0.15s',
    }),
    skillPill: {
      display: 'inline-block', padding: '2px 8px', borderRadius: '980px',
      fontSize: '11px', background: '#f5f5f7', color: '#6e6e73', margin: '1px',
    },
    viewBtn: {
      padding: '6px 14px', borderRadius: '980px', background: '#f0f6ff', color: '#0071e3',
      border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
      fontFamily: 'inherit', letterSpacing: '-0.01em', transition: 'background 0.2s', whiteSpace: 'nowrap',
    },
    deleteBtn: {
      padding: '6px 10px', borderRadius: '980px', background: '#fce8e6', color: '#c5221f',
      border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600',
      fontFamily: 'inherit', transition: 'background 0.2s', lineHeight: 1,
    },
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    modal: {
      background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '540px',
      padding: '36px', boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
      position: 'relative', maxHeight: '80vh', overflowY: 'auto',
    },
    modalClose: {
      position: 'absolute', top: '16px', right: '18px', background: '#f5f5f7', border: 'none',
      borderRadius: '50%', width: '30px', height: '30px', fontSize: '16px',
      cursor: 'pointer', color: '#6e6e73', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'inherit',
    },
    modalEyebrow: {
      fontSize: '11px', fontWeight: '600', color: '#6e6e73',
      letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '6px',
    },
    modalTitle: { fontSize: '22px', fontWeight: '700', letterSpacing: '-0.03em', color: '#1d1d1f', marginBottom: '24px' },
    studentRow: {
      padding: '16px 0', borderBottom: '1px solid #f5f5f7',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    },
    studentName: { fontSize: '15px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '2px' },
    studentEmail: { fontSize: '12px', color: '#6e6e73' },
    studentMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' },
    studentGpa: { fontSize: '15px', fontWeight: '700', color: '#1d1d1f', letterSpacing: '-0.02em' },
    emptyState: { textAlign: 'center', padding: '32px 0', fontSize: '14px', color: '#6e6e73' },
    footer: {
      borderTop: '1px solid #d2d2d7', padding: '24px 44px',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
    },
    footerText: { fontSize: '12px', color: '#6e6e73' },
  };

  const focusInput = (e) => {
    e.target.style.borderColor = '#0071e3';
    e.target.style.background = '#fff';
    e.target.style.boxShadow = '0 0 0 3px rgba(0,113,227,0.15)';
  };
  const blurInput = (e) => {
    e.target.style.borderColor = '#e5e5ea';
    e.target.style.background = '#f5f5f7';
    e.target.style.boxShadow = 'none';
  };

  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '15px', color: '#6e6e73' }}>Loading TPO Dashboard…</p>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* NAV */}
      <nav style={S.nav}>
        <div style={S.navLeft}>
          <span style={S.navLogo}>CareerPath</span>
          <span style={S.navBadge}>TPO</span>
        </div>
        <div style={S.navRight}>
          <span style={S.navEmail}>{user?.email}</span>
          <button style={S.navSignOut} onClick={handleSignOut}>Sign Out</button>
        </div>
      </nav>

      {/* MAIN */}
      <main style={S.main}>
        <h1 style={S.pageTitle}>TPO Dashboard</h1>
        <p style={S.pageSub}>Manage job postings and find eligible candidates.</p>

        {/* Stats */}
        <div style={S.statsStrip}>
          {[
            { label: 'Total Postings', value: jobs.length },
            { label: 'Active Postings', value: activeJobs },
            { label: 'Unique Companies', value: [...new Set(jobs.map(j => j.company))].length },
          ].map((s, i) => (
            <div key={i} style={S.statCard}>
              <div style={S.statLabel}>{s.label}</div>
              <div style={S.statValue}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={S.twoCol}>

          {/* LEFT — Post Job Form */}
          <div style={S.card}>
            <p style={S.sectionLabel}>New Posting</p>
            <h2 style={S.sectionTitle}>Post a Job</h2>

            <form onSubmit={handlePostJob}>
              <div style={S.formGroup}>
                <label style={S.label}>Company Name</label>
                <input
                  required style={S.input} placeholder="e.g. Amazon"
                  value={form.company}
                  onChange={e => handleFormChange('company', e.target.value)}
                  onFocus={focusInput} onBlur={blurInput}
                />
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Role / Position</label>
                <input
                  required style={S.input} placeholder="e.g. Software Engineer"
                  value={form.role}
                  onChange={e => handleFormChange('role', e.target.value)}
                  onFocus={focusInput} onBlur={blurInput}
                />
              </div>

              <div style={{ ...S.formGroup, ...S.formGrid }}>
                <div>
                  <label style={S.label}>Min. CGPA</label>
                  <input
                    required type="number" step="0.1" min="0" max="10"
                    style={S.input} placeholder="e.g. 7.5"
                    value={form.minGpa}
                    onChange={e => handleFormChange('minGpa', e.target.value)}
                    onFocus={focusInput} onBlur={blurInput}
                  />
                </div>
                <div>
                  <label style={S.label}>Package (CTC)</label>
                  <input
                    style={S.input} placeholder="e.g. ₹12 LPA"
                    value={form.package}
                    onChange={e => handleFormChange('package', e.target.value)}
                    onFocus={focusInput} onBlur={blurInput}
                  />
                </div>
              </div>

              <div style={S.formGroup}>
                <label style={S.label}>Required Skills <span style={{ color: '#6e6e73', fontWeight: 400 }}>(comma-separated)</span></label>
                <input
                  required style={S.input} placeholder="React, Node.js, SQL"
                  value={form.skills}
                  onChange={e => handleFormChange('skills', e.target.value)}
                  onFocus={focusInput} onBlur={blurInput}
                />
              </div>

              <button
                type="submit" style={S.submitBtn}
                disabled={posting}
                onMouseEnter={e => { if (!posting) e.currentTarget.style.background = '#0077ed'; }}
                onMouseLeave={e => { if (!posting) e.currentTarget.style.background = '#0071e3'; }}
              >
                {posting ? 'Posting…' : 'Post Job Listing'}
              </button>
            </form>

            {formSuccess && (
              <div style={S.successBanner}>✓ Job posted successfully and saved to database!</div>
            )}
          </div>

          {/* RIGHT — Job Listings Table */}
          <div style={S.tableCard}>
            <div style={S.tableHeader}>
              <div>
                <p style={S.sectionLabel}>All Postings</p>
                <h2 style={{ ...S.sectionTitle, marginBottom: 0 }}>Job Listings</h2>
              </div>
              <span style={{ fontSize: '13px', color: '#6e6e73' }}>{jobs.length} total</span>
            </div>

            {jobs.length === 0 ? (
              <div style={S.emptyState}>No jobs posted yet. Use the form to create your first posting.</div>
            ) : (
              <table style={S.table}>
                <thead>
                  <tr>
                    {['Company', 'Role', 'Min GPA', 'Required Skills', 'Package', ''].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr
                      key={job.id}
                      onMouseEnter={() => setHoveredRow(job.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={S.td(hoveredRow === job.id)}>
                        <span style={{ fontWeight: '600' }}>{job.company}</span>
                      </td>
                      <td style={S.td(hoveredRow === job.id)}>{job.role}</td>
                      <td style={S.td(hoveredRow === job.id)}>{job.min_gpa}</td>
                      <td style={S.td(hoveredRow === job.id)}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', maxWidth: '200px' }}>
                          {job.skills.map(s => (
                            <span key={s} style={S.skillPill}>{s}</span>
                          ))}
                        </div>
                      </td>
                      <td style={S.td(hoveredRow === job.id)}>
                        <span style={{ fontWeight: '600', color: '#137333' }}>{job.package_val}</span>
                      </td>
                      <td style={S.td(hoveredRow === job.id)}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            style={S.viewBtn}
                            onClick={() => handleViewEligible(job)}
                            onMouseEnter={e => e.currentTarget.style.background = '#d6eaff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f0f6ff'}
                          >
                            View Eligible →
                          </button>
                          <button
                            style={S.deleteBtn}
                            onClick={() => handleDeleteJob(job)}
                            onMouseEnter={e => e.currentTarget.style.background = '#fcd4d4'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fce8e6'}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer style={S.footer}>
        <span style={S.footerText}>Copyright © 2024 CareerPath. NMAMIT, Nitte.</span>
      </footer>

      {/* ELIGIBLE STUDENTS MODAL */}
      {studentsModal !== null && (
        <div style={S.overlay} onClick={() => setStudentsModal(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <button style={S.modalClose} onClick={() => setStudentsModal(null)}>×</button>
            <p style={S.modalEyebrow}>
              {studentsModal.company} · {studentsModal.role}
            </p>
            <h2 style={S.modalTitle}>Eligible Students</h2>
            <p style={{ fontSize: '12px', color: '#6e6e73', marginBottom: '16px' }}>
              CGPA ≥ {studentsModal.min_gpa} + all required skills: {studentsModal.skills.join(', ')}
            </p>

            {loadingStudents ? (
              <div style={S.emptyState}>Searching for eligible students…</div>
            ) : eligibleStudents.length === 0 ? (
              <div style={S.emptyState}>No students match all criteria for this posting.</div>
            ) : (
              eligibleStudents.map((student, i) => (
                <div key={i} style={S.studentRow}>
                  <div>
                    <div style={S.studentName}>Student</div>
                    <div style={S.studentEmail}>{student.email || student.id.substring(0, 8) + '…'}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '8px' }}>
                      {student.skills.map(s => (
                        <span key={s} style={S.skillPill}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div style={S.studentMeta}>
                    <div style={S.studentGpa}>CGPA {student.gpa}</div>
                    {student.email && (
                      <button 
                        onClick={() => handleOpenCompose(student, studentsModal)}
                        style={{ ...S.viewBtn, marginTop: '8px', display: 'inline-block' }}
                      >
                        ✉️ Invite
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {/* COMPOSE EMAIL MODAL */}
      {composeModal !== null && (
        <div style={{...S.overlay, zIndex: 300}} onClick={() => !sendingEmail && setComposeModal(null)}>
          <div style={{...S.modal, maxWidth: '600px'}} onClick={e => e.stopPropagation()}>
            <button style={S.modalClose} onClick={() => !sendingEmail && setComposeModal(null)}>×</button>
            <p style={S.modalEyebrow}>Compose Message</p>
            <h2 style={S.modalTitle}>Email {composeModal.studentEmail}</h2>
            
            <form onSubmit={handleSendEmail} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={S.label}>Subject</label>
                <input 
                  type="text" 
                  readOnly
                  value={`Interview Invitation for ${composeModal.jobRole} at ${composeModal.jobCompany}`}
                  style={{...S.input, background: '#f5f5f7', color: '#6e6e73'}}
                />
              </div>
              <div>
                <label style={S.label}>Message Body</label>
                <textarea 
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  style={{...S.input, minHeight: '200px', resize: 'vertical'}}
                  onFocus={focusInput} onBlur={blurInput}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setComposeModal(null)}
                  disabled={sendingEmail}
                  style={{...S.viewBtn, padding: '10px 20px', background: '#f5f5f7', color: '#1d1d1f'}}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={sendingEmail}
                  style={{...S.submitBtn, width: 'auto', padding: '10px 24px'}}
                  onMouseEnter={e => { if (!sendingEmail) e.currentTarget.style.background = '#0077ed'; }}
                  onMouseLeave={e => { if (!sendingEmail) e.currentTarget.style.background = '#0071e3'; }}
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
