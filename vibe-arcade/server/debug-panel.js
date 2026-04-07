// Debug panel for Vibe Arcade - internal dev tool, not user-facing
// Dynamic code execution is intentional - this is how AI-generated games work

export function buildDebugPanel() {
  return `<!DOCTYPE html>
<html><head>
<title>Vibe Arcade Debug</title>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', sans-serif; background: #0f0f1a; color: #e0e0e0; display: flex; height: 100vh; overflow: hidden; }
  .sidebar { width: 320px; background: #1a1a2e; border-right: 1px solid #2a2a4e; display: flex; flex-direction: column; flex-shrink: 0; }
  .sidebar h1 { color: #4fc3f7; padding: 10px 14px; font-size: 15px; border-bottom: 1px solid #2a2a4e; }
  .sidebar h1 a { color: #666; font-size: 11px; text-decoration: none; float: right; margin-top: 2px; }
  .tab-bar { display: flex; border-bottom: 1px solid #2a2a4e; }
  .tab-bar button { flex: 1; padding: 8px; background: none; border: none; color: #666; cursor: pointer; font-size: 12px; font-weight: 600; border-bottom: 2px solid transparent; }
  .tab-bar button.active { color: #4fc3f7; border-bottom-color: #4fc3f7; }
  .tab-content { flex: 1; overflow-y: auto; }
  .tab-panel { display: none; padding: 10px; }
  .tab-panel.active { display: block; }

  .game-item { padding: 8px 10px; border-bottom: 1px solid #1f1f35; cursor: pointer; border-radius: 4px; margin-bottom: 2px; }
  .game-item:hover { background: #22223a; }
  .game-item.active { background: #2a2a50; border-left: 3px solid #4fc3f7; }
  .game-item .gt { font-weight: 600; font-size: 12px; }
  .game-item .gm { font-size: 10px; color: #888; margin-top: 2px; }
  .badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 700; margin-right: 3px; }
  .badge-machine { background: rgba(79,195,247,0.2); color: #4fc3f7; }
  .badge-log { background: rgba(155,89,182,0.2); color: #9b59b6; }
  .badge-ok { background: rgba(46,204,113,0.15); color: #2ecc71; }
  .badge-err { background: rgba(231,76,60,0.15); color: #e74c3c; }

  .gen-section { margin-bottom: 12px; }
  .gen-section label { display: block; font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .card-grid { display: flex; flex-wrap: wrap; gap: 3px; }
  .card-btn { padding: 3px 6px; border: 2px solid #333; border-radius: 5px; background: #1a1a2e; color: #bbb; font-size: 10px; cursor: pointer; }
  .card-btn:hover { border-color: #555; }
  .card-btn.selected { border-color: #4fc3f7; background: #1a2a4e; color: #4fc3f7; }
  #extra-instructions, #modify-instructions { width: 100%; padding: 6px; border: 1px solid #333; border-radius: 5px; background: #12121f; color: #e0e0e0; font-size: 11px; resize: vertical; min-height: 40px; }
  .action-btn { width: 100%; padding: 8px; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; margin-top: 6px; color: white; }
  .action-btn:disabled { background: #444 !important; cursor: not-allowed; }
  .btn-gen { background: linear-gradient(135deg, #4fc3f7, #2196F3); }
  .btn-mod { background: linear-gradient(135deg, #e67e22, #d35400); }
  .btn-gen:hover:not(:disabled) { box-shadow: 0 3px 12px rgba(33,150,243,0.4); }
  .btn-mod:hover:not(:disabled) { box-shadow: 0 3px 12px rgba(230,126,34,0.4); }
  #gen-status { font-size: 10px; color: #888; margin-top: 6px; }

  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .top-area { display: flex; gap: 12px; padding: 12px; border-bottom: 1px solid #2a2a4e; }
  .canvas-wrap { position: relative; width: 400px; height: 300px; flex-shrink: 0; background: #0a0a1a; border-radius: 6px; overflow: hidden; border: 2px solid #333; }
  .canvas-wrap canvas { width: 100%; height: 100%; display: block; }
  .cv-ctrl { position: absolute; bottom: 6px; left: 6px; display: flex; gap: 4px; }
  .cv-ctrl button { padding: 3px 10px; background: rgba(0,0,0,0.7); color: white; border: 1px solid #555; border-radius: 3px; font-size: 10px; cursor: pointer; }
  .cv-ctrl button:hover { border-color: #4fc3f7; }
  .game-info { flex: 1; overflow-y: auto; font-size: 12px; }
  .game-info h2 { color: #4fc3f7; font-size: 16px; margin-bottom: 6px; }
  .ig { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 8px; }
  .ic { background: #1a1a2e; border-radius: 4px; padding: 6px 8px; }
  .ic .il { font-size: 9px; color: #666; text-transform: uppercase; }
  .ic .iv { font-size: 13px; font-weight: 700; }
  .prompt-box { background: #12121f; border: 1px solid #2a2a4e; border-radius: 4px; padding: 8px; font-size: 10px; max-height: 100px; overflow-y: auto; white-space: pre-wrap; color: #81c784; }

  .code-area { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
  .code-hdr { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: #1a1a2e; border-bottom: 1px solid #2a2a4e; font-size: 11px; color: #888; }
  .code-view { flex: 1; overflow: auto; padding: 10px 12px; font-family: 'Consolas', monospace; font-size: 11px; line-height: 1.5; white-space: pre-wrap; color: #e0e0e0; background: #0a0a12; }
  .empty { color: #555; text-align: center; padding: 30px; font-size: 13px; }
</style>
</head><body>
<div class="sidebar">
  <h1>Debug <a href="/">Arcade</a></h1>
  <div class="tab-bar">
    <button class="active" data-tab="machines">Machines</button>
    <button data-tab="generate">New</button>
    <button data-tab="modify">Modify</button>
    <button data-tab="logs">Logs</button>
  </div>
  <div class="tab-content">
    <div class="tab-panel active" id="tab-machines"><div id="game-list"></div></div>
    <div class="tab-panel" id="tab-generate">
      <div class="gen-section"><label>Genre</label><div class="card-grid" id="genre-grid"></div></div>
      <div class="gen-section"><label>Theme</label><div class="card-grid" id="theme-grid"></div></div>
      <div class="gen-section"><label>Modifier</label><div class="card-grid" id="modifier-grid"></div></div>
      <div class="gen-section"><label>Engine</label><div class="card-grid" id="engine-grid"></div></div>
      <div class="gen-section"><label>Extra Instructions</label><textarea id="extra-instructions" placeholder="e.g. make it really hard"></textarea></div>
      <button class="action-btn btn-gen" id="btn-generate" disabled>GENERATE</button>
      <div id="gen-status"></div>
    </div>
    <div class="tab-panel" id="tab-modify">
      <div id="modify-target" class="empty">Select a game first</div>
      <div class="gen-section" style="margin-top:8px"><label>Modification Instructions</label><textarea id="modify-instructions" placeholder="e.g. make it faster, add more enemies, change colors..."></textarea></div>
      <button class="action-btn btn-mod" id="btn-modify" disabled>MODIFY GAME</button>
      <div id="mod-status"></div>
    </div>
    <div class="tab-panel" id="tab-logs"><div id="log-list"></div></div>
  </div>
</div>
<div class="main">
  <div class="top-area">
    <div class="canvas-wrap">
      <canvas id="game-canvas" width="800" height="600"></canvas>
      <div class="cv-ctrl">
        <button id="btn-play">Play</button>
        <button id="btn-stop">Stop</button>
      </div>
    </div>
    <div class="game-info">
      <h2 id="detail-title">Select a game</h2>
      <div class="ig" id="detail-grid"></div>
      <div id="detail-prompt" class="prompt-box" style="display:none"></div>
    </div>
  </div>
  <div class="code-area">
    <div class="code-hdr"><span id="code-label">Code</span><span id="code-stats"></span></div>
    <div class="code-view" id="code-viewer">Select a game to view code.</div>
  </div>
</div>
<script>
var C = {
  genre: [['platformer','Platformer'],['shooter','Shooter'],['puzzle','Puzzle'],['runner','Runner'],['dodge','Dodge'],['breakout','Breakout'],['snake','Snake'],['tower-defense','Tower Def'],['fighting','Fighting'],['rhythm','Rhythm'],['golf','Golf'],['racing','Racing'],['fishing','Fishing']],
  theme: [['neon','Neon'],['space','Space'],['retro','Retro'],['ocean','Ocean'],['forest','Forest'],['horror','Horror'],['candy','Candy'],['samurai','Samurai'],['steampunk','Steampunk'],['desert','Desert'],['arctic','Arctic'],['lava','Volcano'],['matrix','Matrix']],
  modifier: [['speed-up','Speed'],['gravity-flip','Gravity'],['time-limit','Timer'],['boss','Boss'],['powerups','Powerups'],['combo','Combo'],['survival','Survival'],['tiny','Tiny'],['mirror','Mirror'],['fog-of-war','Fog'],['one-hit','One Hit'],['growing','Growing'],['split','Split']],
  engine: [['phaser','Phaser'],['pixijs','PixiJS'],['p5js','p5.js'],['matterjs','Matter']]
};
var allGames = [];
var selected = null;
var gScript = null;
var sel = {genre:null,theme:null,modifier:null,engine:null};

// Tabs
document.querySelectorAll('.tab-bar button').forEach(function(b){
  b.addEventListener('click',function(){
    document.querySelectorAll('.tab-bar button').forEach(function(x){x.classList.remove('active')});
    document.querySelectorAll('.tab-panel').forEach(function(x){x.classList.remove('active')});
    b.classList.add('active');
    document.getElementById('tab-'+b.dataset.tab).classList.add('active');
  });
});

// Card grids
function mkGrid(id,cat){
  var g=document.getElementById(id);
  C[cat].forEach(function(c){
    var b=document.createElement('button');
    b.className='card-btn';b.textContent=c[1];
    b.addEventListener('click',function(){
      if(sel[cat]===c[0]&&(cat==='modifier'||cat==='engine')){sel[cat]=null;b.classList.remove('selected');}
      else{g.querySelectorAll('.card-btn').forEach(function(x){x.classList.remove('selected')});b.classList.add('selected');sel[cat]=c[0];}
      document.getElementById('btn-generate').disabled=!sel.genre||!sel.theme;
    });
    g.appendChild(b);
  });
}
mkGrid('genre-grid','genre');mkGrid('theme-grid','theme');mkGrid('modifier-grid','modifier');mkGrid('engine-grid','engine');

// Read machines from localStorage
function getMachines(){
  try{var d=JSON.parse(localStorage.getItem('vibe-arcade')||'{}');return d.machines||[];}catch(e){return[];}
}

// Load all games: machines + logs
async function loadAll(){
  allGames=[];
  var machines=getMachines();
  for(var i=0;i<machines.length;i++){
    var m=machines[i];
    if(m&&m.gameCode){
      allGames.push({id:'m'+i, src:'machine', idx:i, title:m.title||'Machine '+i, genre:m.recipe?.genre, theme:m.recipe?.theme,
        modifier:m.recipe?.modifier, code:m.gameCode, codeLength:m.gameCode.length, highScore:m.highScore||0,
        suggestions:m.suggestions||[], brokenCount:m.brokenCount||0, dependencies:m.dependencies||[], recipe:m.recipe});
    }
  }
  try{
    var resp=await fetch('/api/logs');
    var logs=await resp.json();
    logs.filter(function(l){return l.type==='game'&&l.status==='done'&&l.response;}).forEach(function(l){
      // Skip if same code already from machine
      var dup=allGames.find(function(g){return g.codeLength===l.codeLength&&g.title===l.title;});
      if(!dup){
        allGames.push({id:'l'+l.id, src:'log', title:l.title||'Log #'+l.id, genre:l.genre, theme:l.theme,
          modifier:l.modifier, model:l.model, duration:l.duration, code:l.response, codeLength:l.codeLength||l.response?.length,
          prompt:l.prompt, timestamp:l.timestamp});
      } else {
        // Enrich machine entry with log data
        if(l.prompt) dup.prompt=l.prompt;
        if(l.model) dup.model=l.model;
        if(l.duration) dup.duration=l.duration;
      }
    });
  }catch(e){}
  renderList();
}

function renderList(){
  var el=document.getElementById('game-list');
  el.replaceChildren();
  if(!allGames.length){el.textContent='No games yet';return;}
  allGames.forEach(function(g){
    var d=document.createElement('div');
    d.className='game-item'+(selected&&selected.id===g.id?' active':'');
    var t=document.createElement('div');t.className='gt';t.textContent=g.title;
    var m=document.createElement('div');m.className='gm';
    var ok=g.code&&g.code.includes('startGame');
    var srcBadge=document.createElement('span');
    srcBadge.className='badge '+(g.src==='machine'?'badge-machine':'badge-log');
    srcBadge.textContent=g.src==='machine'?'M'+g.idx:'LOG';
    var okBadge=document.createElement('span');
    okBadge.className='badge '+(ok?'badge-ok':'badge-err');
    okBadge.textContent=ok?'OK':'ERR';
    m.appendChild(srcBadge);m.appendChild(okBadge);
    m.appendChild(document.createTextNode(' '+(g.genre||'?')+'+'+(g.theme||'?')+(g.modifier?'+'+g.modifier:'')+' | '+(g.codeLength||'?')+'ch'));
    if(g.highScore) m.appendChild(document.createTextNode(' | HS:'+g.highScore));
    d.appendChild(t);d.appendChild(m);
    d.addEventListener('click',function(){pick(g);});
    el.appendChild(d);
  });
}

function pick(g){
  selected=g;
  renderList();
  document.getElementById('detail-title').textContent=g.title;
  var grid=document.getElementById('detail-grid');
  grid.replaceChildren();
  [['Genre',g.genre],['Theme',g.theme],['Modifier',g.modifier||'-'],['Model',g.model||'?'],
   ['Duration',g.duration?(g.duration/1000).toFixed(1)+'s':'?'],['Code',(g.codeLength||'?')+'ch'],
   ['High Score',g.highScore||'-'],['Broken',g.brokenCount||0],['Source',g.src||'?']].forEach(function(p){
    var c=document.createElement('div');c.className='ic';
    var l=document.createElement('div');l.className='il';l.textContent=p[0];
    var v=document.createElement('div');v.className='iv';v.textContent=p[1];
    c.appendChild(l);c.appendChild(v);grid.appendChild(c);
  });
  var pe=document.getElementById('detail-prompt');
  if(g.prompt){pe.style.display='block';pe.textContent=g.prompt;}else{pe.style.display='none';}
  document.getElementById('code-viewer').textContent=g.code||'No code';
  document.getElementById('code-stats').textContent=g.code?g.code.split('\\n').length+'L | '+g.code.length+'ch':'';
  document.getElementById('code-label').textContent=g.title;
  // Update modify tab
  var mt=document.getElementById('modify-target');
  mt.textContent='Modifying: '+g.title+' ('+(g.genre||'?')+'+'+( g.theme||'?')+')';
  document.getElementById('btn-modify').disabled=false;
  if(g.suggestions&&g.suggestions.length){
    mt.textContent+='\\nSuggestions: '+g.suggestions.join('; ');
  }
}

// Play/Stop
document.getElementById('btn-play').addEventListener('click',function(){
  if(!selected||!selected.code)return;
  stopG();
  var code=selected.code;
  // Intentional dynamic execution of AI-generated game code (core mechanic)
  var w=code+'\\n;(function(){try{startGame(document.getElementById("game-canvas"),function(p){},function(f){var c=document.getElementById("game-canvas").getContext("2d");c.fillStyle="#0a0a1a";c.fillRect(0,0,800,600);c.fillStyle="#4fc3f7";c.font="bold 22px Segoe UI";c.textAlign="center";c.fillText("GAME OVER  Score: "+f,400,290);});}catch(e){console.error(e);var c=document.getElementById("game-canvas").getContext("2d");c.fillStyle="#0a0a1a";c.fillRect(0,0,800,600);c.fillStyle="#ff4444";c.font="14px Courier New";c.textAlign="center";c.fillText("ERROR: "+e.message,400,280);}})();';
  var blob=new Blob([w],{type:'application/javascript'});
  var url=URL.createObjectURL(blob);
  gScript=document.createElement('script');gScript.src=url;document.body.appendChild(gScript);
  URL.revokeObjectURL(url);
});
document.getElementById('btn-stop').addEventListener('click',stopG);
function stopG(){
  if(gScript&&gScript.parentNode)gScript.parentNode.removeChild(gScript);gScript=null;
  var c=document.getElementById('game-canvas').getContext('2d');
  c.fillStyle='#0a0a1a';c.fillRect(0,0,800,600);
  c.fillStyle='#555';c.font='14px Segoe UI';c.textAlign='center';c.fillText('Click Play',400,300);
}
stopG();

// Get API key
function getKey(){return localStorage.getItem('vibe-arcade-gemini-key')||localStorage.getItem('vibe-arcade-api-key')||'';}

// SSE stream helper
async function streamGenerate(body,statusEl,onDone){
  var key=getKey();
  if(!key){statusEl.textContent='No API key!';return;}
  body.apiKey=key;
  statusEl.textContent='Generating...';
  try{
    var resp=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    var reader=resp.body.getReader();var dec=new TextDecoder();var buf='';var chunks=0;
    while(true){
      var r=await reader.read();if(r.done)break;
      buf+=dec.decode(r.value,{stream:true});
      var lines=buf.split('\\n');buf=lines.pop();
      for(var i=0;i<lines.length;i++){
        if(!lines[i].startsWith('data: '))continue;
        var data=JSON.parse(lines[i].slice(6));
        if(data.type==='chunk'){chunks++;statusEl.textContent='Generating... '+chunks+' chunks';}
        else if(data.type==='done'){statusEl.textContent='Done! '+data.title;if(onDone)onDone(data);}
        else if(data.type==='error'){statusEl.textContent='Error: '+data.message;}
      }
    }
  }catch(e){statusEl.textContent='Error: '+e.message;}
}

// Generate new
document.getElementById('btn-generate').addEventListener('click',function(){
  if(!sel.genre||!sel.theme)return;
  var btn=document.getElementById('btn-generate');btn.disabled=true;
  streamGenerate({
    genre:sel.genre, theme:sel.theme, modifier:sel.modifier||null,
    cardLevels:{genre:1,theme:1,modifier:1},
    extraInstructions:document.getElementById('extra-instructions').value
  },document.getElementById('gen-status'),function(data){
    var g={id:'new'+Date.now(),src:'new',title:data.title,genre:sel.genre,theme:sel.theme,modifier:sel.modifier,
      model:getKey().startsWith('AIza')?'gemini':'anthropic',codeLength:data.gameCode.length,code:data.gameCode};
    allGames.unshift(g);renderList();pick(g);
    document.querySelector('[data-tab="machines"]').click();
    btn.disabled=!sel.genre||!sel.theme;
  });
});

// Modify existing
document.getElementById('btn-modify').addEventListener('click',function(){
  if(!selected||!selected.code)return;
  var btn=document.getElementById('btn-modify');btn.disabled=true;
  var instructions=document.getElementById('modify-instructions').value.trim();
  var extraContext='The existing game code is:\\n'+selected.code+'\\n\\n'+(instructions?'Modification request: '+instructions:'Improve the game based on these suggestions: '+(selected.suggestions||[]).join(', '))+'\\n\\nRewrite the entire game with changes applied. Keep startGame(canvas, onScore, onGameOver) API.';
  streamGenerate({
    genre:selected.genre||'platformer', theme:selected.theme||'neon', modifier:selected.modifier||null,
    cardLevels:{genre:1,theme:1,modifier:1},
    extraInstructions:extraContext
  },document.getElementById('mod-status'),function(data){
    // Update selected game
    selected.code=data.gameCode;selected.codeLength=data.gameCode.length;selected.title=data.title;
    // If it's a machine game, update localStorage too
    if(selected.src==='machine'&&selected.idx!=null){
      try{
        var state=JSON.parse(localStorage.getItem('vibe-arcade')||'{}');
        if(state.machines&&state.machines[selected.idx]){
          state.machines[selected.idx].gameCode=data.gameCode;
          state.machines[selected.idx].title=data.title;
          localStorage.setItem('vibe-arcade',JSON.stringify(state));
        }
      }catch(e){}
    }
    renderList();pick(selected);
    btn.disabled=false;
  });
});

// Logs tab
async function loadLogs(){
  try{
    var resp=await fetch('/api/logs');var logs=await resp.json();
    var el=document.getElementById('log-list');el.replaceChildren();
    logs.forEach(function(l){
      var d=document.createElement('div');d.className='game-item';d.style.fontSize='11px';
      var t=document.createElement('div');t.style.fontWeight='600';
      t.textContent='['+l.type+'] '+(l.title||l.message||'?');
      var m=document.createElement('div');m.style.color='#666';m.style.fontSize='10px';
      m.textContent=(l.status||'')+' | '+(l.model||'')+(l.duration?' | '+(l.duration/1000).toFixed(1)+'s':'');
      d.appendChild(t);d.appendChild(m);
      d.addEventListener('click',function(){
        if(l.response&&l.type==='game'){
          var g={id:'l'+l.id,src:'log',title:l.title||'Log',genre:l.genre,theme:l.theme,modifier:l.modifier,
            model:l.model,duration:l.duration,codeLength:l.codeLength,prompt:l.prompt,code:l.response};
          pick(g);document.querySelector('[data-tab="machines"]').click();
        }
      });
      el.appendChild(d);
    });
  }catch(e){}
}

loadAll();loadLogs();
setInterval(function(){loadLogs();},5000);
</script>
</body></html>`;
}
