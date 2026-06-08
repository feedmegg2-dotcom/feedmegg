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

  const serverScript = `const http=require('http'),net=require('net'),PORT=3001,ESC='\\x1B',GS='\\x1D',INIT=ESC+'@',BON=ESC+'E\\x01',BOFF=ESC+'E\\x00',AL=ESC+'a\\x00',AC=ESC+'a\\x01',AR=ESC+'a\\x02',SN=GS+'!\\x00',SDH=GS+'!\\x01',SD=GS+'!\\x11',CUT=GS+'V\\x41\\x03',LF='\\n';function rep(c,n){return c.repeat(Math.max(0,n))}function lr(l,r,w=42){const s=w-l.length-r.length;return s<=0?l+' '+r:l+rep(' ',s)+r}function ticket(o,cols=42){let t=INIT;if(o.scheduled_for){t+=AC+SD+BON+'*** PRE-ORDER ***'+LF+SN+'For: '+new Date(o.scheduled_for).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+LF+BOFF}if(o.contactless_delivery){t+=AC+SD+BON+'CONTACTLESS'+LF+BOFF+SN}t+=AC+rep('-',cols)+LF+SD+BON+'ORDER #'+String(o.order_number||o.id).slice(-6).toUpperCase()+LF+BOFF+SN+AL+SDH+BON+o.customer_name+LF+BOFF+SN+(o.order_type==='collection'?'COLLECTION':'DELIVERY')+LF;if(o.customer_phone)t+=o.customer_phone+LF;if(o.order_type==='delivery'&&o.delivery_address)t+=o.delivery_address+LF;t+=rep('-',cols)+LF+BON+'ITEMS:'+LF+BOFF;for(const i of(o.order_items||[])){t+=SDH+BON+i.quantity+'x '+i.name+LF+BOFF+SN;if(i.special_instructions)t+='  -> '+i.special_instructions+LF}t+=rep('-',cols)+LF;if(o.notes){t+=BON+'** NOTES **'+LF+BOFF+o.notes+LF+rep('-',cols)+LF}if(o.delivery_fee>0){t+=AL+lr('Subtotal:','GBP'+parseFloat(o.subtotal).toFixed(2),cols)+LF+lr('Delivery:','GBP'+parseFloat(o.delivery_fee).toFixed(2),cols)+LF}if(o.tip>0)t+=lr('Tip:','GBP'+parseFloat(o.tip).toFixed(2),cols)+LF;t+=BON+SDH+lr('TOTAL:','GBP'+parseFloat(o.total).toFixed(2),cols)+LF+BOFF+SN+AC+(o.payment_method==='cash'?'CASH':'CARD')+LF+rep('-',cols)+LF+AR+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+LF+LF+LF+CUT;return t}function send(data,ip){return new Promise((res,rej)=>{const c=new net.Socket(),t=setTimeout(()=>{c.destroy();rej(new Error('Timeout'))},5000);c.connect(9100,ip,()=>{c.write(Buffer.from(data,'binary'),()=>{clearTimeout(t);c.destroy();res()})});c.on('error',e=>{clearTimeout(t);rej(e)})})}const srv=http.createServer((req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');if(req.method==='OPTIONS'){res.writeHead(200);res.end();return}if(req.method==='GET'&&req.url==='/status'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({status:'ok'}));return}if(req.method==='POST'&&req.url==='/print'){let b='';req.on('data',c=>b+=c);req.on('end',async()=>{try{const{order,printerIp,printerWidth}=JSON.parse(b);await send(ticket(order,printerWidth===58?32:42),printerIp);res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({success:true}));console.log('Printed:',order.order_number||order.id)}catch(e){console.error(e.message);res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({success:false,error:e.message}))}});return}res.writeHead(404);res.end()});srv.listen(PORT,'0.0.0.0',()=>{console.log('feedme.gg Print Server running on port '+PORT)})`

  const steps = [
    {
      num: 1,
      title: 'Install Termux',
      commands: [],
      apk: { 
        url: 'https://github.com/termux/termux-app/releases/download/v0.118.3/termux-app_v0.118.3+github-debug_arm64-v8a.apk', 
        label: '⬇️ Download & Install Termux', 
        note: 'After downloading tap the file to install. Allow "Install from unknown sources" if prompted.' 
      }
    },
    {
      num: 2,
      title: 'Install Termux:Boot',
      commands: [],
      apk: { 
        url: '/termux-boot.apk', 
        label: '⬇️ Download & Install Termux:Boot', 
        note: 'This makes the print server start automatically when the tablet boots.' 
      }
    },
    {
      num: 3,
      title: 'Update Termux packages',
      commands: [
        { label: 'Step 1 - Fix repositories first (select default mirror):', text: 'termux-change-repo' },
        { label: 'Step 2 - Update packages:', text: 'pkg update -y && pkg upgrade -y' }
      ]
    },
    {
      num: 4,
      title: 'Install Node.js',
      commands: [{ label: 'Run in Termux:', text: 'pkg install nodejs -y' }]
    },
    {
      num: 5,
      title: 'Create print server',
      commands: [
        { label: 'Step 1 - Create folder', text: 'mkdir ~/printserver && cd ~/printserver' },
        { label: 'Step 2 - Create server file', text: `echo '${serverScript}' > ~/printserver/server.js` },
      ]
    },
    {
      num: 6,
      title: 'Auto-start on boot',
      commands: [
        { label: 'Run in Termux:', text: 'mkdir -p ~/.termux/boot && echo "node ~/printserver/server.js &" > ~/.termux/boot/start-printserver.sh && chmod +x ~/.termux/boot/start-printserver.sh' },
      ]
    },
    {
      num: 7,
      title: 'Test print server',
      commands: [
        { label: 'Start the server:', text: 'node ~/printserver/server.js' },
        { label: 'Test it is running (open new tab in Chrome):', text: 'http://localhost:3001/status' },
      ]
    }
  ]

  return (
    <div style={{ background: '#080c14', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'system-ui,sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'Syne,sans-serif', fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
            <span style={{ color: '#22c55e' }}>feed</span><span style={{ color: '#f1f5f9' }}>me.gg</span>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>Tablet Setup</h1>
          <p style={{ fontSize: '13px', color: '#64748b' }}>Set up the print server on this tablet</p>
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
                {s.commands.map((cmd, i) => (
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
