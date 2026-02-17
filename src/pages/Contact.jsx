
import React, { useEffect, useState } from 'react';
import { apiFetch, getApiBaseUrl } from '../lib/api';

export default function Contact() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch('/contact');
        setContacts(data);
      } catch (e) {
        console.error("Failed to load contacts", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="app-skeleton h-10 w-52 mx-auto" />
          <span className="app-skeleton h-5 w-72 max-w-full mx-auto mt-4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={`contact-skeleton-${idx}`} className="card bg-base-100 shadow-xl border border-base-200">
              <span className="app-skeleton h-64 w-full rounded-t-2xl rounded-b-none" />
              <div className="card-body items-center text-center">
                <span className="app-skeleton h-8 w-40" />
                <span className="app-skeleton h-4 w-56 max-w-full" />
                <span className="app-skeleton h-4 w-44" />
                <span className="app-skeleton h-10 w-32 rounded-lg mt-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
        <p className="text-lg opacity-70">Meet our team. Feel free to reach out to us on LinkedIn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {contacts.map(c => (
          <div key={c.id} className="card bg-base-100 shadow-xl border border-base-200 hover:shadow-2xl transition-all duration-300">
            <figure className="h-64 bg-base-200">
              {c.pictureUrl ? (
                <img src={`${getApiBaseUrl().replace(/\/api$/, '')}${c.pictureUrl}`} alt={c.name} className="h-full w-full object-cover" />
              ) : (
                <div className="text-6xl opacity-20">👤</div>
              )}
            </figure>
            <div className="card-body items-center text-center">
              <h2 className="card-title text-2xl">{c.name}</h2>
              <p className="opacity-70 mb-4">{c.description}</p>
              <div className="card-actions">
                {c.linkedinUrl && (
                  <a
                    href={c.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-outline gap-2 hover:text-primary-content"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z" />
                    </svg>
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {contacts.length === 0 && (
        <div className="text-center opacity-50 py-12 bg-base-200 rounded-xl">
          <p>Contact information is being updated.</p>
        </div>
      )}
    </div>
  );
}
