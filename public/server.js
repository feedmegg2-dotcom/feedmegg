const http=require('http'),net=require('net'),PORT=3001,ESC='\x1B',GS='\x1D';
const INIT=ESC+'@',BON=ESC+'E\x01',BOFF=ESC+'E\x00';
const AL=ESC+'a\x00',AC=ESC+'a\x01',AR=ESC+'a\x02';
const SN=GS+'!\x00',SDH=GS+'!\x01',SD=GS+'!\x11';
const CUT=GS+'V\x41\x03',LF='\n';
function rep(c,n){return c.repeat(Math.max(0,n))}
function lr(l,r,w){w=w||42;var s=w-l.length-r.length;return s<=0?l+' '+r:l+rep(' ',s)+r}
function ticket(o,cols){
  cols=cols||42;
  var t=INIT;
  if(o.scheduled_for){t+=AC+SD+BON+'PRE-ORDER'+LF+SN+BOFF}
  if(o.contactless_delivery){t+=AC+SD+BON+'CONTACTLESS'+LF+BOFF+SN}
  t+=AC+rep('-',cols)+LF+SD+BON+'ORDER '+String(o.order_number||o.id).slice(-6).toUpperCase()+LF+BOFF+SN;
  t+=AL+SDH+BON+(o.customer_name||'')+LF+BOFF+SN;
  t+=(o.order_type==='collection'?'COLLECTION':'DELIVERY')+LF;
  if(o.customer_phone)t+=o.customer_phone+LF;
  if(o.order_type==='delivery'&&o.delivery_address)t+=o.delivery_address+LF;
  t+=rep('-',cols)+LF+BON+'ITEMS:'+LF+BOFF;
  (o.order_items||[]).forEach(function(i){
    t+=SDH+BON+i.quantity+'x '+i.name+LF+BOFF+SN;
    if(i.special_instructions)t+='  > '+i.special_instructions+LF;
  });
  t+=rep('-',cols)+LF;
  if(o.notes){t+=BON+'NOTES: '+BOFF+o.notes+LF+rep('-',cols)+LF}
  if(o.delivery_fee>0){t+=lr('Subtotal:','GBP'+parseFloat(o.subtotal).toFixed(2),cols)+LF}
  if(o.delivery_fee>0){t+=lr('Delivery:','GBP'+parseFloat(o.delivery_fee).toFixed(2),cols)+LF}
  t+=BON+SDH+lr('TOTAL:','GBP'+parseFloat(o.total).toFixed(2),cols)+LF+BOFF+SN;
  t+=AC+(o.payment_method==='cash'?'CASH':'CARD')+LF;
  t+=rep('-',cols)+LF+AR+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+LF;
  t+=LF+LF+LF+CUT;
  return t;
}
function send(data,ip){
  return new Promise(function(res,rej){
    var c=new net.Socket();
    var t=setTimeout(function(){c.destroy();rej(new Error('Timeout'))},5000);
    c.connect(9100,ip,function(){
      c.write(Buffer.from(data,'binary'),function(){clearTimeout(t);c.destroy();res()});
    });
    c.on('error',function(e){clearTimeout(t);rej(e)});
  });
}
var srv=http.createServer(function(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){res.writeHead(200);res.end();return}
  if(req.method==='GET'&&req.url==='/status'){
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify({status:'ok'}));
    return;
  }
  if(req.method==='POST'&&req.url==='/print'){
    var b='';
    req.on('data',function(c){b+=c});
    req.on('end',function(){
      try{
        var d=JSON.parse(b);
        var cols=d.printerWidth===58?32:42;
        send(ticket(d.order,cols),d.printerIp).then(function(){
          res.writeHead(200,{'Content-Type':'application/json'});
          res.end(JSON.stringify({success:true}));
          console.log('Printed order');
        }).catch(function(e){
          res.writeHead(500,{'Content-Type':'application/json'});
          res.end(JSON.stringify({success:false,error:e.message}));
        });
      }catch(e){
        res.writeHead(500,{'Content-Type':'application/json'});
        res.end(JSON.stringify({success:false,error:e.message}));
      }
    });
    return;
  }
  res.writeHead(404);res.end();
});
srv.listen(PORT,'0.0.0.0',function(){
  console.log('feedme.gg Print Server running on port '+PORT);
});
