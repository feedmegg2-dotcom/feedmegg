'use client'
import { useState } from 'react'

function CopyButton({ text, label }: { text: string, label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' }}>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <code style={{ flex: 1, fontSize: '12px', color: '#22c55e', wordBreak: 'break-all', lineHeight: 1.5 }}>{text}</code>
        <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
          style={{ background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)', border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, color: copied ? '#22c55e' : '#94a3b8', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

export default function SetupPage() {
  const [step, setStep] = useState(1)

  const steps = [
    {
      num: 1,
      title: 'Install feedme Terminal App',
      commands: [],
      apk: {
        url: '/feedme-terminal.apk',
        label: '⬇️ Download & Install feedme Terminal',
        note: 'After downloading tap the file to install. Allow "Install from unknown sources" if prompted. This app includes the print server built in.'
      }
    },
    {
      num: 2,
      title: 'Open the app & log in',
      commands: [],
      note: 'Open the feedme Terminal app. Log in with your merchant account. The app will load the terminal and start the print server automatically.'
    },
    {
      num: 3,
      title: 'Set up printer IP address',
      commands: [],
      note: 'Turn on your Xprinter. Hold the feed button while powering on to print the network config - note the IP address. Open the cog menu ⚙️ in the terminal, enter the IP address and tap Save Printer IP.'
    },
    {
      num: 4,
      title: 'Test printing',
      commands: [],
      note: 'Tap the 🖨️ Test button in the terminal header. Three tickets should print: kitchen, customer receipt and delivery label. If they print correctly you are all set!'
    },
  ]

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'system-ui,sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'Syne,sans-serif', fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
            <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f1f5f9' }}>me.gg</span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>Tablet Setup</h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>Get your terminal up and running in minutes</p>
        </div>

        {/* PROGRESS */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
          {steps.map(s => (
            <div key={s.num} onClick={() => setStep(s.num)}
              style={{ flex: 1, height: '4px', borderRadius: '2px', background: s.num <= step ? '#22c55e' : 'rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'background 0.2s' }} />
          ))}
        </div>

        {/* STEPS */}
        {steps.map(s => (
          <div key={s.num} style={{ background: '#0d1321', border: `1px solid ${step === s.num ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', padding: '20px', marginBottom: '12px', opacity: s.num > step + 1 ? 0.4 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: step === s.num ? '16px' : '0', cursor: 'pointer' }} onClick={() => setStep(s.num)}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: s.num < step ? '#22c55e' : s.num === step ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', border: `2px solid ${s.num <= step ? '#22c55e' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: s.num <= step ? '#22c55e' : '#64748b', flexShrink: 0 }}>
                {s.num < step ? '✓' : s.num}
              </div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>Step {s.num}: {s.title}</div>
            </div>

            {step === s.num && (
              <>
                {s.apk && (
                  <div style={{ marginBottom: '12px' }}>
                    <a href={s.apk.url} download
                      style={{ display: 'block', padding: '14px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', color: '#22c55e', textDecoration: 'none', fontWeight: 700, fontSize: '15px', textAlign: 'center', marginBottom: '8px' }}>
                      {s.apk.label}
                    </a>
                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>{s.apk.note}</div>
                  </div>
                )}
                {(s as any).note && !s.apk && (
                  <div style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.7, background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
                    {(s as any).note}
                  </div>
                )}
                {s.commands.map((cmd: any, i: number) => (
                  <CopyButton key={i} text={cmd.text} label={cmd.label} />
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  {s.num < steps.length && (
                    <button onClick={() => setStep(s.num + 1)}
                      style={{ padding: '10px 24px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                      Next →
                    </button>
                  )}
                  {s.num === steps.length && (
                    <button onClick={() => window.location.href = '/merchant/terminal'}
                      style={{ padding: '10px 24px', background: '#22c55e', color: '#080c14', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                      Go to Terminal 🚀
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

      </div>
    </div>
  )
}
