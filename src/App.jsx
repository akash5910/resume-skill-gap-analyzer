import React from 'react';
import { useEffect, useState } from 'react';

const API = 'http://localhost:5000/api';
const MEMBER2_API = 'http://localhost:5001/api';
const MEMBER1_API = 'http://localhost:3000';

async function readJsonResponse(response, serviceName) {
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch {
    if (!response.ok) {
      throw new Error(`${serviceName} returned an error page (HTTP ${response.status}). Restart the backend from the project folder and try again.`);
    }
    throw new Error(`${serviceName} returned an invalid response. Check that the correct backend is running.`);
  }
  if (!response.ok) throw new Error(data.message || `${serviceName} returned HTTP ${response.status}.`);
  return data;
}

function App() {
  const [userId, setUserId] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [profileName, setProfileName] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [page, setPage] = useState('Dashboard');
  const [stats, setStats] = useState({ skillsTracked: 0, completed: 0, averageProgress: 0, savedRoles: 0, roles: 0, resources: 0, progress: [] });
  const [personalSkills, setPersonalSkills] = useState([]);
  const [roles, setRoles] = useState([]);
  const [resources, setResources] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [roleSearch, setRoleSearch] = useState('');
  const [roleDomain, setRoleDomain] = useState('');
  const [analysisSkills, setAnalysisSkills] = useState('');
  const [customSkillsInput, setCustomSkillsInput] = useState('');
  const [analysisResults, setAnalysisResults] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [expandedTopic, setExpandedTopic] = useState('');
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceSkill, setResourceSkill] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [roleForm, setRoleForm] = useState({ name: '', domain: '', description: '', requiredSkills: '' });
  const [resourceForm, setResourceForm] = useState({ skill: '', title: '', url: '', youtubeUrl: '', difficulty: 'Beginner' });
  const [editing, setEditing] = useState({ type: '', id: '' });

  async function request(url, options = {}) {
    const baseUrl = url.startsWith('/jobroles') || url.startsWith('/analyze') ? MEMBER2_API : API;
    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    return readJsonResponse(response, baseUrl.includes(':5001') ? 'Member 2 server' : 'Main server');
  }

  async function member1Request(url, options = {}) {
    const isForm = options.body instanceof FormData;
    const response = await fetch(`${MEMBER1_API}${url}`, {
      ...options,
      credentials: 'include',
      headers: { Accept: 'application/json', ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) }
    });
    return readJsonResponse(response, 'Account server');
  }

  async function checkAuth() {
    try {
      const data = await member1Request('/api/auth/me');
      setAuthUser(data.user); setUserId(data.user._id); setProfileName(data.user.name);
      setAnalysisSkills((data.user.skills || []).join(', '));
    } catch {
      setAuthUser(null);
    } finally { setAuthLoading(false); }
  }

  async function submitAuth(event) {
    event.preventDefault();
    try {
      const body = { email: authEmail, password: authPassword };
      if (authMode === 'register') body.name = authName;
      const data = await member1Request(`/api/auth/${authMode}`, { method: 'POST', body: JSON.stringify(body) });
      setAuthUser(data.user); setUserId(data.user._id); setProfileName(data.user.name);
      setAnalysisSkills((data.user.skills || []).join(', '));
      setAuthPassword(''); setError('');
    } catch (err) { setError(err.message); }
  }

  async function logout() {
    try { await member1Request('/api/auth/logout', { method: 'POST' }); }
    catch (err) { setError(err.message); return; }
    setAuthUser(null); setUserId(''); setAdminToken(''); setAdminLoginOpen(false); setPersonalSkills([]); setResumes([]); setAnalysisResults([]); setSelectedAnalysis(null); setError('');
    setStats({ skillsTracked: 0, completed: 0, averageProgress: 0, savedRoles: 0, roles: 0, resources: 0, progress: [] });
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      const data = await member1Request('/api/profile', { method: 'PUT', body: JSON.stringify({ name: profileName }) });
      setAuthUser(data.user); setMessage('Profile saved.'); setError('');
    } catch (err) { setError(err.message); }
  }

  async function uploadResume(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!resumeFile) { setError('Choose a PDF resume first.'); return; }
    const formData = new FormData();
    formData.append('resume', resumeFile);
    setResumeBusy(true);
    try {
      await member1Request('/resumes/upload', { method: 'POST', body: formData });
      setResumeFile(null); form.reset(); setMessage('Resume uploaded.'); await loadPage();
    } catch (err) { setError(err.message); }
    finally { setResumeBusy(false); }
  }

  async function deleteResume(id) {
    try {
      await member1Request(`/resumes/${encodeURIComponent(id)}/delete`, { method: 'POST' });
      setMessage('Resume deleted.'); await loadPage();
    } catch (err) { setError(err.message); }
  }

  async function loadPage() {
    try {
      const [statsData, rolesData, resourcesData, bookmarkData, profileData, resumesData] = await Promise.all([
        request(`/dashboard/${encodeURIComponent(userId)}`), request('/jobroles'),
        request('/resources'), request(`/bookmarks/${encodeURIComponent(userId)}`),
        member1Request('/api/profile'), member1Request('/resumes/list')
      ]);
      // Count only skills that are in progress or completed. This also handles
      // dashboard data returned by an older running server.
      const activeProgress = (statsData.progress || []).filter((item) => item.status !== 'Not Started');
      const completedProgress = activeProgress.filter((item) => item.status === 'Completed').length;
      const progressBySkill = new Map((statsData.progress || []).map((item) => [
        item.skill.toLowerCase(), item.status === 'Completed' ? 100 : item.status === 'In Progress' ? (item.percent || 50) : 0
      ]));
      const savedRoles = bookmarkData
        .map((bookmark) => rolesData.find((role) => role._id === bookmark.roleId))
        .filter((role) => role?.requiredSkills?.length);
      const roleAverages = savedRoles.map((role) => role.requiredSkills.reduce(
        (total, skill) => total + (progressBySkill.get(skill.name.toLowerCase()) || 0), 0
      ) / role.requiredSkills.length);
      const averageProgress = roleAverages.length
        ? Math.round(roleAverages.reduce((total, value) => total + value, 0) / roleAverages.length)
        : 0;
      setStats({ ...statsData, skillsTracked: activeProgress.length, completed: completedProgress, averageProgress });
      setAuthUser(profileData.user); setProfileName(profileData.user.name);
      setAnalysisSkills((current) => current || (profileData.user.skills || []).join(', '));
      setPersonalSkills(profileData.user.skills || []); setResumes(resumesData);
      setRoles(rolesData); setResources(resourcesData); setBookmarks(bookmarkData);
      if (!selectedRoleId && rolesData.length) setSelectedRoleId(rolesData[0]._id);
      setError('');
    } catch (err) { setError(err.message); }
  }

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { if (authUser && userId) loadPage(); }, [userId, authUser?._id]);
  useEffect(() => {
    if (!message && !error) return undefined;
    const timeout = setTimeout(() => { setMessage(''); setError(''); }, 5000);
    return () => clearTimeout(timeout);
  }, [message, error]);

  async function saveProgress(skill, status) {
    try {
      if (status === 'Not Started') {
        const existing = progressFor(skill);
        if (existing) {
          await request(`/progress/${encodeURIComponent(userId)}/${encodeURIComponent(skill)}`, { method: 'DELETE' });
        }
        await loadPage(); setMessage('Progress updated.');
        return;
      }
      await request('/progress', { method: 'POST', body: JSON.stringify({ userId, skill, status }) });
      await loadPage(); setMessage('Progress saved.');
    } catch (err) { setError(err.message); }
  }

  async function saveUserSkillNames(names) {
    const uniqueNames = [...new Map(names.map((name) => [name.toLowerCase(), name])).values()];
    let savedSkills = authUser?.skills || [];
    for (const skill of uniqueNames) {
      const data = await member1Request('/api/profile/skills', { method: 'POST', body: JSON.stringify({ skill }) });
      savedSkills = data.skills;
    }
    setPersonalSkills(savedSkills);
    setAuthUser((current) => current ? { ...current, skills: savedSkills } : current);
  }

  async function addCustomSkills(event) {
    event.preventDefault();
    const names = customSkillsInput.split(',').map((name) => name.trim()).filter(Boolean);
    if (!names.length) { setError('Enter at least one skill name.'); return; }
    try {
      await saveUserSkillNames(names);
      setCustomSkillsInput(''); setError(''); setMessage('Your skills were saved.'); await loadPage();
    } catch (err) { setError(err.message); }
  }

  async function deletePersonalSkill(name) {
    try {
      const data = await member1Request(`/api/profile/skills/${encodeURIComponent(name)}`, { method: 'DELETE' });
      setPersonalSkills(data.skills); setAuthUser((current) => current ? { ...current, skills: data.skills } : current);
      setMessage('Skill deleted.'); await loadPage();
    } catch (err) { setError(err.message); }
  }

  async function removeProgress(skill) {
    try {
      await request(`/progress/${encodeURIComponent(userId)}/${encodeURIComponent(skill)}`, { method: 'DELETE' });
      await loadPage(); setMessage('Progress removed.');
    } catch (err) { setError(err.message); }
  }

  async function toggleBookmark(role) {
    try {
      await request('/bookmarks', { method: 'POST', body: JSON.stringify({ userId, roleId: role._id, roleName: role.name }) });
      await loadPage();
    } catch (err) { setError(err.message); }
  }

  async function compareAllRoles() {
    const userSkills = analysisSkills.split(',').map((skill) => skill.trim()).filter(Boolean);
    if (!userSkills.length) {
      setError('Enter your skills, separated by commas.');
      return;
    }
    try {
      const results = await request('/analyze/all', { method: 'POST', body: JSON.stringify({ userSkills }) });
      setAnalysisResults(results);
      setError('');
    } catch (err) { setError(err.message); }
  }

  async function analyzeSelectedRole() {
    const userSkills = analysisSkills.split(',').map((skill) => skill.trim()).filter(Boolean);
    const roleId = selectedRoleId || roles[0]?._id;
    if (!roleId) {
      setError('There are no job roles to compare yet.');
      return;
    }
    if (!userSkills.length) {
      setError('Enter the skills you already have, separated by commas.');
      return;
    }
    try {
      const result = await request('/analyze', { method: 'POST', body: JSON.stringify({ roleId, userSkills }) });
      setSelectedAnalysis(result);
      setError('');
    } catch (err) { setError(err.message); }
  }

  async function adminRequest(url, method, body) {
    return request(url, { method, headers: { Authorization: `Bearer ${adminToken}` }, body: body ? JSON.stringify(body) : undefined });
  }

  async function loginAdmin(event) {
    event.preventDefault();
    try {
      const result = await request('/admin/login', { method: 'POST', body: JSON.stringify({ username: adminUsername, password: adminPassword }) });
      setAdminToken(result.token);
      setAdminPassword('');
      setAdminLoginOpen(false);
      setPage('Admin');
      setError('');
      setMessage('Admin login successful.');
    } catch (err) { setError(err.message); }
  }

  function logoutAdmin() {
    setAdminToken('');
    setPage('Dashboard');
    setEditing({ type: '', id: '' });
    setMessage('Admin logged out.');
  }

  async function saveAdminItem(type, event) {
    event.preventDefault();
    const forms = { roles: roleForm, resources: resourceForm };
    let body = forms[type];
    if (type === 'roles') {
      const previousRole = editing.type === 'roles' ? roles.find((role) => role._id === editing.id) : null;
      body = {
        name: roleForm.name.trim(), domain: roleForm.domain, description: roleForm.description,
        requiredSkills: roleForm.requiredSkills.split(',').map((name) => name.trim()).filter(Boolean).map((name) => {
          const oldSkill = previousRole?.requiredSkills.find((skill) => skill.name.toLowerCase() === name.toLowerCase());
          return oldSkill || { name, importance: 'Medium', learningTimeWeeks: 2, prerequisites: [] };
        })
      };
    }
    const route = type === 'roles' ? 'roles' : 'resources';
    try {
      await adminRequest(`/admin/${route}${editing.type === type ? `/${editing.id}` : ''}`, editing.type === type ? 'PUT' : 'POST', body);
      setRoleForm({ name: '', domain: '', description: '', requiredSkills: '' });
      setResourceForm({ skill: '', title: '', url: '', youtubeUrl: '', difficulty: 'Beginner' });
      setEditing({ type: '', id: '' }); setMessage('Saved.'); await loadPage();
    } catch (err) { setError(err.message); }
  }

  function editItem(type, item) {
    setEditing({ type, id: item._id });
    if (type === 'roles') setRoleForm({ name: item.name, domain: item.domain || '', description: item.description || '', requiredSkills: (item.requiredSkills || []).map((skill) => skill.name).join(', ') });
    if (type === 'resources') setResourceForm({ skill: item.skill, title: item.title, url: item.url, youtubeUrl: item.youtubeUrl || '', difficulty: item.difficulty || 'Beginner' });
  }

  async function deleteItem(type, id) {
    const route = type === 'roles' ? 'roles' : 'resources';
    try { await adminRequest(`/admin/${route}/${id}`, 'DELETE'); setMessage('Deleted.'); await loadPage(); }
    catch (err) { setError(err.message); }
  }

  const shownRoles = roles.filter((role) => role.name.toLowerCase().includes(roleSearch.toLowerCase()) && (!roleDomain || role.domain === roleDomain));
  const shownResources = resources.filter((item) => item.title.toLowerCase().includes(resourceSearch.toLowerCase()) && (!resourceSkill || item.skill.toLowerCase() === resourceSkill.toLowerCase()));
  const domains = [...new Set(roles.map((role) => role.domain).filter(Boolean))];
  const progressFor = (skill) => stats.progress.find((item) => item.skill.toLowerCase() === skill.toLowerCase());
  const resourceForSkill = (skill) => resources.find((item) => item.skill.toLowerCase() === skill.toLowerCase());
  const youtubeForSkill = (skill) => resourceForSkill(skill)?.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${skill} beginner tutorial`)}`;
  const guideForSkill = (skill) => resourceForSkill(skill)?.url || `https://www.google.com/search?q=${encodeURIComponent(`${skill} free beginner tutorial`)}`;
  const learningRole = roles.find((role) => role._id === selectedRoleId) || roles[0];
  const learningTopics = learningRole?.requiredSkills || [];
  const completedTopics = learningTopics.filter((topic) => progressFor(topic.name)?.status === 'Completed').length;
  const roleProgress = learningTopics.length ? Math.round((completedTopics / learningTopics.length) * 100) : 0;
  let learningWeek = 0;
  const learningPlan = learningTopics.map((topic) => {
    const weeks = topic.learningTimeWeeks || 2;
    const startWeek = learningWeek + 1;
    learningWeek += weeks;
    return { ...topic, weekRange: `Week ${startWeek}${weeks > 1 ? `-${learningWeek}` : ''}` };
  });

  if (authLoading) return <main className="page"><section className="panel"><h1>Loading your account...</h1></section></main>;
  if (!authUser && !adminToken) return <main className="page auth-page"><section className="panel auth-panel">
    <p className="small-title">RESUME SKILL GAP ANALYZER</p><h1>{authMode === 'login' ? 'Log in' : 'Create an account'}</h1>
    <p>Your profile and resumes are saved to your account.</p>
    {error && <p className="notice error">{error}</p>}
    <form onSubmit={submitAuth}>
      {authMode === 'register' && <label>Your name<input required minLength="2" maxLength="80" value={authName} onChange={(event) => setAuthName(event.target.value)} /></label>}
      <label>Email<input required type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} /></label>
      <label>Password<input required type="password" minLength={authMode === 'register' ? 8 : undefined} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} /></label>
      <button>{authMode === 'login' ? 'Log in' : 'Register'}</button>
    </form>
    <button className="link-button" type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }}>{authMode === 'login' ? 'Create a new account' : 'I already have an account'}</button>
    <button className="link-button" type="button" onClick={() => { setAdminUsername(''); setAdminPassword(''); setAdminLoginOpen(!adminLoginOpen); setError(''); }}>Admin login</button>
    {adminLoginOpen && <form autoComplete="off" onSubmit={loginAdmin}>
      <label>Admin username<input required autoComplete="off" value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} /></label>
      <label>Admin password<input required type="password" autoComplete="new-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} /></label>
      <button>Log in as admin</button>
    </form>}
  </section></main>;

  return (
    <main className="page">
      <header className="top">
        <div><p className="small-title">RESUME SKILL GAP ANALYZER</p><h1>{authUser ? 'Dashboard' : 'Admin panel'}</h1><p>{authUser ? 'See your learning progress and find resources for your next role.' : 'Manage job roles and learning resources.'}</p></div>
        <div className="account-actions">{authUser ? <><span>{authUser.email}</span>{adminToken && <button onClick={logoutAdmin}>Admin sign out</button>}<button onClick={logout}>Log out</button></> : <button onClick={logoutAdmin}>Admin sign out</button>}</div>
      </header>
      {authUser && <div className="account-actions"><button type="button" onClick={() => { setAdminUsername(''); setAdminPassword(''); setAdminLoginOpen(!adminLoginOpen); setError(''); }}>{adminToken ? 'Admin logged in' : 'Admin login'}</button></div>}
      {authUser && adminLoginOpen && !adminToken && <section className="panel auth-panel"><h2>Admin login</h2><form onSubmit={loginAdmin}>
        <label>Username<input required autoComplete="off" value={adminUsername} onChange={(event) => setAdminUsername(event.target.value)} /></label>
        <label>Password<input required type="password" autoComplete="new-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} /></label>
        <button>Log in as admin</button>
      </form></section>}
      <nav>{[...(authUser ? ['Dashboard', 'Job roles', 'Resources'] : []), ...(adminToken ? ['Admin'] : [])].map((tab) => <button className={page === tab ? 'active' : ''} key={tab} onClick={() => { setPage(tab); setMessage(''); }}>{tab}</button>)}</nav>
      {error && <p className="notice error">{error}</p>}{message && <p className="notice success">{message}</p>}

      {page === 'Dashboard' && <>
        <section className="panel profile-panel"><h2>Your profile</h2><form className="profile-edit" onSubmit={saveProfile}><label>Name<input value={profileName} onChange={(event) => setProfileName(event.target.value)} minLength="2" maxLength="80" required /></label><span>{authUser.email}</span><button>Save profile</button></form></section>
        <section className="panel match-panel">
          <h2>Check your skill match</h2>
          <p>Choose a job role and enter the skills you already know. Use commas between skills.</p>
          {roles.length === 0 ? <p>No job roles are in the database yet. Add roles in Admin or run the sample role seed.</p> : <>
            <div className="match-form">
              <label>Job role<select value={selectedRoleId || roles[0]._id} onChange={(event) => { setSelectedRoleId(event.target.value); setSelectedAnalysis(null); }}>
                {roles.map((role) => <option value={role._id} key={role._id}>{role.name}</option>)}
              </select></label>
              <label>Your skills<input placeholder="JavaScript, SQL, Git" value={analysisSkills} onChange={(event) => setAnalysisSkills(event.target.value)} /></label>
              <button onClick={analyzeSelectedRole}>Analyze my skills</button>
            </div>
            {selectedAnalysis && <div className="match-result">
              <div className="analysis-heading match-heading"><div><h3>{selectedAnalysis.role}</h3><strong>{selectedAnalysis.matchPercentage}% match</strong></div><div className="match-circle" style={{ '--match-angle': `${selectedAnalysis.matchPercentage * 3.6}deg` }} role="img" aria-label={`${selectedAnalysis.matchPercentage}% match`}><span>{selectedAnalysis.matchPercentage}%</span></div></div>
              <div className="bar match-bar"><span style={{ width: `${selectedAnalysis.matchPercentage}%` }} /></div>
              <p>Importance-based match: {selectedAnalysis.weightedMatchPercentage}%</p>
              <p><strong>Skills you have:</strong> {selectedAnalysis.matchedSkills.join(', ') || 'None matched yet'}</p>
              <p><strong>Skills to learn:</strong> {selectedAnalysis.missingSkills.map((skill) => `${skill.name} (${skill.importance})`).join(', ') || 'You have all the listed skills'}</p>
              <p><strong>Estimated learning time:</strong> {selectedAnalysis.estimatedTotalWeeks} weeks</p>
              {selectedAnalysis.roadmap.length > 0 && <div><strong>Suggested learning order</strong><ol className="roadmap-list">{selectedAnalysis.roadmap.map((step) => {
                const resource = resourceForSkill(step.skill);
                return <li key={step.step}><strong>{step.skill}</strong> — {step.weekRange}{step.prerequisites.length ? ` (first learn ${step.prerequisites.join(', ')})` : ''}<div className="roadmap-links"><a href={youtubeForSkill(step.skill)} target="_blank" rel="noreferrer">YouTube videos</a>{resource && <a href={resource.url} target="_blank" rel="noreferrer">Free guide: {resource.title}</a>}</div></li>;
              })}</ol></div>}
            </div>}
          </>}
        </section>
        <section className="stats">
          <article><span>Skills tracked</span><strong>{stats.skillsTracked}</strong></article><article><span>Completed</span><strong>{stats.completed}</strong></article>
          <article><span>Average progress</span><strong>{stats.averageProgress}%</strong><small>{stats.savedRoles ? 'Across bookmarked job roles' : 'Bookmark a role to calculate this'}</small></article><article><span>Saved roles</span><strong>{stats.savedRoles}</strong></article>
        </section>
        <section className="panel"><h2>Learning progress</h2>
          {!learningRole ? <p>Add a job role with required skills to see its learning topics here.</p> : <>
            <label className="learning-role">Job role<select value={learningRole._id} onChange={(event) => { setSelectedRoleId(event.target.value); setExpandedTopic(''); }}>
              {roles.map((role) => <option value={role._id} key={role._id}>{role.name}</option>)}
            </select></label>
            <div className="role-progress-heading"><strong>{learningRole.name}: {completedTopics} of {learningTopics.length} topics completed ({roleProgress}%)</strong><span>{roleProgress}%</span></div>
            <div className="bar role-progress-bar"><span style={{ width: `${roleProgress}%` }} /></div>
            {learningPlan.map((topic) => {
              const item = progressFor(topic.name);
              const status = item?.status === 'Completed' ? 'Completed' : 'Not Completed';
              const isOpen = expandedTopic === topic.name;
              const resource = resourceForSkill(topic.name);
              return <article className="learning-topic" key={`${learningRole._id}-${topic.name}`}>
                <div className="learning-topic-row">
                  <button className="topic-toggle" type="button" aria-expanded={isOpen} onClick={() => setExpandedTopic(isOpen ? '' : topic.name)}>
                  <span><strong>{topic.name}</strong><small>{topic.weekRange} · {topic.importance || 'Medium'} priority</small></span>
                    <span>{isOpen ? 'Hide topic ▲' : 'View topic ▼'}</span>
                  </button>
                  <select className={status === 'Completed' ? 'completed-select' : ''} aria-label={`Completion status for ${topic.name}`} value={status} onChange={(event) => saveProgress(topic.name, event.target.value === 'Completed' ? 'Completed' : 'Not Started')}>
                    <option>Not Completed</option><option>Completed</option>
                  </select>
                </div>
                {isOpen && <div className="topic-details">
                  {topic.prerequisites?.length > 0 && <p><strong>Learn first:</strong> {topic.prerequisites.join(', ')}</p>}
                  {resource && <p>{resource.title}</p>}
                  <div className="roadmap-links"><a href={youtubeForSkill(topic.name)} target="_blank" rel="noreferrer">Watch YouTube videos</a><a href={guideForSkill(topic.name)} target="_blank" rel="noreferrer">{resource ? `Open ${resource.title}` : `Find free ${topic.name} materials`}</a></div>
                </div>}
              </article>;
            })}
          </>}
        </section>
        <section className="panel"><h2>My skills</h2><p>Add skills you want to keep track of. Skills entered in the analyzer are also saved here.</p>
          <form className="personal-skill-form" onSubmit={addCustomSkills}><input placeholder="Add skill names, separated by commas" value={customSkillsInput} onChange={(event) => setCustomSkillsInput(event.target.value)} /><button>Add skills</button></form>
          {!personalSkills.length ? <p>You have not added any skills yet.</p> : personalSkills.map((item) => {
            const progressItem = progressFor(item);
            const status = progressItem?.status === 'Completed' ? 'Completed' : 'Not Completed';
            const resource = resourceForSkill(item);
            return <article className="personal-skill-row" key={item}>
              <div className="personal-skill-info"><strong>{item}</strong><span>{progressItem?.status === 'Completed' ? 'Completed · 100%' : 'Not Completed · 0%'}</span></div>
              <div className="personal-skill-links"><a href={youtubeForSkill(item)} target="_blank" rel="noreferrer">YouTube videos</a><a href={guideForSkill(item)} target="_blank" rel="noreferrer">{resource ? resource.title : 'Find free learning materials'}</a></div>
              <select className={status === 'Completed' ? 'completed-select' : ''} aria-label={`Progress for custom skill ${item}`} value={status} onChange={(event) => saveProgress(item, event.target.value === 'Completed' ? 'Completed' : 'Not Started')}><option>Not Completed</option><option>Completed</option></select>
              <button className="delete-button" type="button" onClick={() => deletePersonalSkill(item)}>Delete</button>
            </article>;
          })}
        </section>
        <section className="panel"><h2>My resumes</h2><p>Upload and view PDF resumes saved to your account.</p>
          <form className="resume-upload" onSubmit={uploadResume}><input type="file" accept="application/pdf,.pdf" onChange={(event) => setResumeFile(event.target.files?.[0] || null)} /><button disabled={resumeBusy}>{resumeBusy ? 'Uploading...' : 'Upload PDF'}</button></form>
          {!resumes.length ? <p>You have not uploaded a resume yet.</p> : resumes.map((resume) => <article className="content-row resume-row" key={resume._id}><div><strong>{resume.originalName}</strong><span>{Math.max(1, Math.round(resume.size / 1024))} KB · {new Date(resume.createdAt).toLocaleDateString()}</span></div><div className="resume-actions"><a href={`${MEMBER1_API}/resumes/${encodeURIComponent(resume._id)}/view`} target="_blank" rel="noreferrer">View PDF</a><button className="delete-button" onClick={() => deleteResume(resume._id)}>Delete</button></div></article>)}
        </section>
        
        <section className="panel"><h2>Saved job roles</h2>{bookmarks.length ? bookmarks.map((item) => <div className="list-row" key={item._id}><strong>{item.roleName}</strong><button className="delete-button" onClick={() => toggleBookmark({ _id: item.roleId, name: item.roleName })}>Remove</button></div>) : <p>You have not saved any roles yet.</p>}</section>
      </>}

      {page === 'Job roles' && <section className="panel"><h2>Job roles</h2><div className="filters"><input placeholder="Search roles" value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} /><select value={roleDomain} onChange={(event) => setRoleDomain(event.target.value)}><option value="">All domains</option>{domains.map((domain) => <option key={domain}>{domain}</option>)}</select></div>
        <div className="analysis-box"><h3>Compare your skills with job roles</h3><p>Enter your skills separated by commas.</p><div className="filters"><input placeholder="JavaScript, SQL, Git" value={analysisSkills} onChange={(event) => setAnalysisSkills(event.target.value)} /><button onClick={compareAllRoles}>Compare all roles</button></div>
          {analysisResults.map((result) => {
            const missingNames = result.missingSkills.map((skill) => skill.name.toLowerCase());
            const recommendations = resources.filter((resource) => missingNames.includes(resource.skill.toLowerCase()));
            return <article className="analysis-result" key={result.role}><div className="analysis-heading match-heading"><div><h3>{result.role}</h3><strong>{result.matchPercentage}% match</strong></div><div className="match-circle" style={{ '--match-angle': `${result.matchPercentage * 3.6}deg` }} role="img" aria-label={`${result.matchPercentage}% match`}><span>{result.matchPercentage}%</span></div></div><div className="bar"><span style={{ width: `${result.matchPercentage}%` }} /></div><p>Weighted match: {result.weightedMatchPercentage}% · Estimated learning time: {result.estimatedTotalWeeks} weeks</p><p><strong>Skills you have:</strong> {result.matchedSkills.join(', ') || 'None matched'}</p><p><strong>Missing skills:</strong> {result.missingSkills.map((skill) => `${skill.name} (${skill.importance})`).join(', ') || 'None'}</p>{result.roadmap.length > 0 && <><strong>Suggested learning order</strong><ol className="roadmap-list">{result.roadmap.map((step) => { const resource = resourceForSkill(step.skill); return <li key={step.step}><strong>{step.skill}</strong> — {step.weekRange}<div className="roadmap-links"><a href={youtubeForSkill(step.skill)} target="_blank" rel="noreferrer">YouTube videos</a>{resource && <a href={resource.url} target="_blank" rel="noreferrer">Free guide: {resource.title}</a>}</div></li>; })}</ol></>}</article>;
          })}
        </div>
        {shownRoles.map((role) => { const isSaved = bookmarks.some((item) => item.roleId === role._id); return <article className="content-row" key={role._id}><div><h3>{role.name}</h3><span>{role.domain}</span><p>{role.description}</p><small>Skills: {(role.requiredSkills || []).map((skill) => skill.name).join(', ') || 'Not listed'}</small></div><button className={isSaved ? 'bookmarked-button' : ''} onClick={() => toggleBookmark(role)}>{isSaved ? 'Bookmarked' : 'Bookmark'}</button></article>; })}
        {!shownRoles.length && <p>No roles match this search.</p>}</section>}

      {page === 'Resources' && <section className="panel"><h2>Learning resources</h2><div className="filters"><input placeholder="Search resources" value={resourceSearch} onChange={(event) => setResourceSearch(event.target.value)} /><select value={resourceSkill} onChange={(event) => setResourceSkill(event.target.value)}><option value="">All skills</option>{[...new Set(resources.map((item) => item.skill))].map((skill) => <option key={skill}>{skill}</option>)}</select></div>
        {shownResources.map((item) => <article className="content-row" key={item._id}><div><span>{item.skill} · {item.difficulty}</span><h3>{item.title}</h3></div><div className="roadmap-links"><a href={item.url} target="_blank" rel="noreferrer">Open free guide</a>{item.youtubeUrl && <a href={item.youtubeUrl} target="_blank" rel="noreferrer">YouTube videos</a>}</div></article>)}{!shownResources.length && <p>No resources match this search.</p>}</section>}

      {page === 'Admin' && adminToken && <section className="panel admin"><div className="section-heading"><div><h2>Admin panel</h2><p>Manage job roles and learning resources.</p></div></div>
        <div className="admin-grid">
          <form onSubmit={(event) => saveAdminItem('roles', event)}><h3>{editing.type === 'roles' ? 'Edit job role' : 'Add job role'}</h3><input required placeholder="Role name" value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} /><input placeholder="Domain" value={roleForm.domain} onChange={(event) => setRoleForm({ ...roleForm, domain: event.target.value })} /><input placeholder="Description" value={roleForm.description} onChange={(event) => setRoleForm({ ...roleForm, description: event.target.value })} /><input required placeholder="Required skills, separated by commas" value={roleForm.requiredSkills} onChange={(event) => setRoleForm({ ...roleForm, requiredSkills: event.target.value })} /><button>Save role</button>{roles.map((item) => <div className="manage-row" key={item._id}><span>{item.name}</span><button type="button" onClick={() => editItem('roles', item)}>Edit</button><button className="delete-button" type="button" onClick={() => deleteItem('roles', item._id)}>Delete</button></div>)}</form>
          <form onSubmit={(event) => saveAdminItem('resources', event)}><h3>{editing.type === 'resources' ? 'Edit resource' : 'Add resource'}</h3><input required placeholder="Skill" value={resourceForm.skill} onChange={(event) => setResourceForm({ ...resourceForm, skill: event.target.value })} /><input required placeholder="Resource title" value={resourceForm.title} onChange={(event) => setResourceForm({ ...resourceForm, title: event.target.value })} /><input required type="url" placeholder="Free guide URL" value={resourceForm.url} onChange={(event) => setResourceForm({ ...resourceForm, url: event.target.value })} /><input type="url" placeholder="YouTube videos URL (optional)" value={resourceForm.youtubeUrl || ''} onChange={(event) => setResourceForm({ ...resourceForm, youtubeUrl: event.target.value })} /><select value={resourceForm.difficulty} onChange={(event) => setResourceForm({ ...resourceForm, difficulty: event.target.value })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select><button>Save resource</button>{resources.map((item) => <div className="manage-row" key={item._id}><span>{item.skill}: {item.title}</span><button type="button" onClick={() => editItem('resources', item)}>Edit</button><button className="delete-button" type="button" onClick={() => deleteItem('resources', item._id)}>Delete</button></div>)}</form>
        </div>
      </section>}
    </main>
  );
}

export default App;
