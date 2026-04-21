import React, { useState, useEffect } from 'react';
import { telegramService } from '../api/api';
import './TelegramApp.css'; // Optional CSS for styling

const TelegramApp = () => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [sessionString, setSessionString] = useState('');
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Channel Select
  
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [videos, setVideos] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Custom video player state
  const [playingVideoId, setPlayingVideoId] = useState(null);

  useEffect(() => {
    // Try to load videos initially (if already connected)
    fetchVideos();
    fetchChannelsSilently();
  }, []);

  const fetchVideos = async () => {
    try {
      const data = await telegramService.getVideos();
      setVideos(data);
    } catch (err) {
      console.log('Error fetching videos', err);
    }
  };

  const fetchChannelsSilently = async () => {
    try {
      const data = await telegramService.getChannels();
      if (data && Array.isArray(data)) {
        setChannels(data);
        setStep(3); // Already connected
      }
    } catch (err) {
      // Ignored: Not connected yet
    }
  };

  const handleSendCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await telegramService.connect(phone);
      setPhoneCodeHash(res.phone_code_hash);
      setSessionString(res.session_string);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    try {
      await telegramService.verify({
        phone,
        phone_code_hash: phoneCodeHash,
        code,
        session_string: sessionString
      });
      setStep(3);
      fetchChannelsSilently(); // Load channels after verification
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
    setLoading(false);
  };

  const handleSyncChannel = async () => {
    if (!selectedChannel) return;
    setLoading(true);
    setSuccessMsg('');
    setError('');
    try {
      const res = await telegramService.syncChannel(selectedChannel);
      setSuccessMsg(res.message || 'Sync started successfully.');
      // Refresh videos after a delay to get new ones
      setTimeout(() => fetchVideos(), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
    setLoading(false);
  };

  const openVideo = (id) => {
    setPlayingVideoId(id);
  };

  const closeVideo = () => {
    setPlayingVideoId(null);
  };

  return (
    <div className="telegram-app-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'white' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem', background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Telegram Video Sync
      </h1>
      
      {error && <div style={{ background: '#ef4444', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>{error}</div>}
      {successMsg && <div style={{ background: '#10b981', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>{successMsg}</div>}

      {/* Connection Wizard */}
      {step === 1 && (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Connect your Telegram Account</h2>
          <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>Enter your phone number (with country code, e.g. +1234567890)</p>
          <input 
            type="text" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1234567890"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', marginBottom: '1rem' }}
          />
          <button 
            onClick={handleSendCode} 
            disabled={loading || !phone}
            style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Enter Verification Code</h2>
          <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>Check your Telegram app for the code.</p>
          <input 
            type="text" 
            value={code} 
            onChange={(e) => setCode(e.target.value)}
            placeholder="12345"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', marginBottom: '1rem' }}
          />
          <button 
            onClick={handleVerifyCode} 
            disabled={loading || !code}
            style={{ padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </div>
      )}

      {step === 3 && (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Sync Channels</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select 
              value={selectedChannel} 
              onChange={(e) => setSelectedChannel(e.target.value)}
              style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.2)', background: '#1f2937', color: 'white' }}
            >
              <option value="">-- Select a channel/group --</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>{ch.title}</option>
              ))}
            </select>
            <button 
              onClick={handleSyncChannel}
              disabled={loading || !selectedChannel}
              style={{ padding: '0.75rem 1.5rem', background: '#8b5cf6', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Starting...' : 'Sync Videos'}
            </button>
          </div>
        </div>
      )}

      {/* Video Gallery */}
      {step === 3 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem' }}>Synced Videos</h2>
            <button onClick={fetchVideos} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '0.5rem', cursor: 'pointer' }}>
              Refresh
            </button>
          </div>
          
          {videos.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No videos synced yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {videos.map(video => (
                <div key={video._id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', overflow: 'hidden', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }} onClick={() => openVideo(video._id)}>
                  <div style={{ padding: '1rem', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
                    <span style={{ fontSize: '2rem' }}>▶️</span>
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <p style={{ fontSize: '0.875rem', color: '#e5e7eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {video.caption || 'Telegram Video'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                      {new Date(video.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video Player Modal */}
      {playingVideoId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', p_adding: '2rem' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '900px' }}>
            <button 
              onClick={closeVideo}
              style={{ position: 'absolute', top: '-3rem', right: '0', background: 'transparent', color: 'white', border: 'none', fontSize: '2rem', cursor: 'pointer' }}
            >
              &times;
            </button>
            <video 
              controls 
              autoPlay
              style={{ width: '100%', borderRadius: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
            >
              <source src={telegramService.getStreamUrl(playingVideoId)} type="video/mp4" />
              Your browser does not support HTML5 video.
            </video>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelegramApp;
