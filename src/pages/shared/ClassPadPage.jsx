import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getClassDoc, saveClassDoc } from '../../api';
import { errorMessage } from '../../utils/errors';
import '../../styles/global.css';

export default function ClassPadPage() {
  const { token } = useParams();
  const [doc, setDoc] = useState(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const timer = useRef(null);

  useEffect(() => {
    let live = true;
    getClassDoc(token)
      .then((d) => {
        if (!live) return;
        setDoc(d);
        setBody(d.body || '');
      })
      .catch((err) => live && setError(errorMessage(err)));
    return () => {
      live = false;
    };
  }, [token]);

  useEffect(() => {
    if (doc?.googleDocUrl) window.location.replace(doc.googleDocUrl);
  }, [doc]);

  useEffect(() => {
    if (!doc || doc.googleDocUrl) return undefined;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveClassDoc(token, body)
        .then(() => setSaved('Saved'))
        .catch((err) => setError(errorMessage(err)));
    }, 700);
    return () => clearTimeout(timer.current);
  }, [body, token, doc]);

  if (error && !doc) {
    return (
      <main style={{ maxWidth: 720, margin: '3rem auto', padding: '0 1rem' }}>
        <p>{error}</p>
      </main>
    );
  }

  if (doc?.googleDocUrl) {
    return <p style={{ padding: '2rem' }}>Opening Google Doc…</p>;
  }

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Scholaris class notes
      </p>
      <h1 style={{ margin: '0.25rem 0 0.75rem', fontSize: 22 }}>{doc?.title || 'Class notes'}</h1>
      <p style={{ color: '#667', marginTop: 0 }}>Both student and tutor can edit. Changes save automatically. {saved}</p>
      {error ? <p style={{ color: '#b42318' }}>{error}</p> : null}
      <textarea
        value={body}
        onChange={(e) => {
          setSaved('Saving…');
          setBody(e.target.value);
        }}
        rows={22}
        style={{
          width: '100%',
          font: '15px/1.5 ui-sans-serif, system-ui, sans-serif',
          padding: '1rem',
          borderRadius: 12,
          border: '1px solid #d8d6d1',
        }}
      />
    </main>
  );
}
