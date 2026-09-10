/* ---------- Board layout (tiles + card decks) ---------- */
const sets=['assets/location-sheets/one.jpg','assets/location-sheets/two.jpg','assets/location-sheets/three.jpg','assets/location-sheets/four.jpg'];
const fountainArt='assets/location-tiles/07-fountain-no-merchant.png';
const locations=['Wainwright','Fabric Warehouse','Spice Warehouse','Fruit Warehouse','Post Office','Caravansary','Fountain','Black Market','Tea House','Large Market','Small Market','Police Station','Sultan’s Palace','Small Mosque','Great Mosque','Gemstone Dealer'];
const board=document.querySelector('#board'),surface=document.querySelector('#play-surface'),deckRoot=document.querySelector('#decks'),lockButton=document.querySelector('#lock-layout'),moveGemButton=document.querySelector('#move-gem-layers');
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
const distance=(a,b)=>Math.abs(Math.floor(a/4)-Math.floor(b/4))+Math.abs(a%4-b%4);
let currentLayout=[];
// Seeded RNG so a game code reproduces the exact same 16-tile arrangement.
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function seededShuffle(arr,rng){const b=[...arr];for(let i=b.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b}
let gameSeed=(()=>{const raw=localStorage.getItem('istanbul-game-seed');const v=raw==null?NaN:Number(raw);return Number.isFinite(v)&&v>=0?v>>>0:(Math.random()*4294967296)>>>0})();
function createRandomLayout(seed){
  const rng=(seed==null)?Math.random:mulberry32(seed>>>0);
  let layout,guard=0;
  do{
    layout=seededShuffle(locations,rng);
    const f=layout.indexOf('Fountain'),t=layout.indexOf('Tea House'),b=layout.indexOf('Black Market');
    if([5,6,9,10].includes(f)&&distance(t,b)>=3&&Math.floor(t/4)!==Math.floor(b/4)&&t%4!==b%4) return layout;
  }while(++guard<8000);
  return layout;
}
// Game code packs {seed, playerCount} into one short base-36 token.
function makeGameCode(seed,count){return (((seed>>>0)*4)+(Math.max(2,Math.min(4,count||2))-2)).toString(36).toUpperCase()}
function parseGameCode(code){
  const n=parseInt(String(code||'').trim().toLowerCase().replace(/[^0-9a-z]/g,''),36);
  if(!Number.isFinite(n)||n<0)return null;
  return {seed:Math.floor(n/4)>>>0,count:(n%4)+2};
}
function ensureTileLayerCount(list, count, prefix){
  const cols=4;
  let changed=false;
  while(list.length<count){
    const idx=list.length, col=idx%cols;
    if(prefix==='post-layer' && count===8){
      // Logical Post Office order is interleaved by rows: 1,3,5,7 on top;
      // 2,4,6,8 directly underneath them.
      const row=idx%2===0?0:1;
      const column=Math.floor(idx/2);
      list.push({id:`${prefix}-${Date.now()}-${idx+1}`,left:20+column*20,top:28+row*34,size:12,fixed:true});
    }else{
      const row=Math.floor(idx/cols);
      list.push({id:`${prefix}-${Date.now()}-${idx+1}`,left:20+col*20,top:30+row*38,size:12,fixed:true});
    }
    changed=true;
  }
  return changed;
}
function persistTileTokens(){localStorage.setItem(TILE_TOKEN_KEY,JSON.stringify(tileTokenPlacements))}
function renderTileGreyCubes(host,list,kind){
  const indices=kind==='post'?getPostOfficeCubeSlots():[];
  host.innerHTML=indices.map((layerIndex,i)=>{
    const layer=list[layerIndex];
    if(!layer)return '';
    const cubeSize=Math.max(4, Math.min(11, (Number(layer.size)||16)*0.55));
    return `<div class="tile-grey-cube ${kind}-cube" data-cube-kind="${kind}" data-cube-layer="${layer.id}" style="--cube-left:${Number(layer.left)||50}%;--cube-top:${Number(layer.top)||50}%;--cube-size:${cubeSize}%" title="Post Office cube ${i+1}"><img src="assets/grey-cube.png" alt="Grey cube" draggable="false"></div>`;
  }).join('');
  return host;
}
function createDefaultLayout(){return ['Wainwright','Fabric Warehouse','Spice Warehouse','Fruit Warehouse','Post Office','Caravansary','Fountain','Black Market','Tea House','Large Market','Small Market','Police Station','Sultan’s Palace','Small Mosque','Great Mosque','Gemstone Dealer']}
const LAYOUT_KEY='istanbul-board-layout-v1';
try { const storedLayout=JSON.parse(localStorage.getItem(LAYOUT_KEY)||'null'); if(Array.isArray(storedLayout)&&storedLayout.length===locations.length&&storedLayout.every(x=>locations.includes(x))) currentLayout=storedLayout; } catch(_){}
function render({randomize=false,seed=null}={}){
  if(randomize) currentLayout=createRandomLayout(seed);
  else if(currentLayout.length!==locations.length) currentLayout=createDefaultLayout();
  localStorage.setItem(LAYOUT_KEY,JSON.stringify(currentLayout));
  const layout=currentLayout;
  ensureTileLayerCount(palaceLayers,1,'palace-layer');
  persistPalaceLayers();
  board.innerHTML='';
  layout.forEach(name=>{
    const index=locations.indexOf(name),p=index%4,tile=document.createElement('article'),size=slotSizes[name]||{};
    tile.className='tile';tile.dataset.location=name;tile.setAttribute('aria-label',name);
    const isFountain=name==='Fountain';
    tile.style.setProperty('--art',`url(${isFountain?fountainArt:sets[Math.floor(index/4)]})`);
    tile.style.setProperty('--x',isFountain?'50%':p%2?'100%':'0%');
    tile.style.setProperty('--y',isFountain?'50%':p>1?'100%':'0%');
    if(isFountain){tile.style.backgroundSize='100% 100%';tile.style.backgroundPosition='center'}
    const slot=document.createElement('div');slot.className='tile-slot';slot.dataset.location=name;
    Object.assign(slot.style,{position:'absolute',top:'12%',left:'12%',width:'76%',height:'70%',minWidth:'28px',minHeight:'28px',resize:'both',overflow:'hidden',border:'2px dashed rgba(255,238,182,.84)',borderRadius:'6px',background:'rgba(255,223,121,.08)',boxShadow:'inset 0 0 0 1px rgba(51,25,9,.55)',zIndex:'2'});
    if(size.width)slot.style.width=`${size.width}px`;
    if(size.height)slot.style.height=`${size.height}px`;
    tile.append(slot);
    const palaceLayerHost=document.createElement('div');palaceLayerHost.className='palace-layer-host';
    if(name==='Sultan’s Palace'){
      palaceLayerHost.innerHTML=palaceLayers.map((layer,index)=>`<div class="palace-board-layer ${layer.fixed?'is-fixed':''}" data-palace-layer-id="${layer.id}" style="--palace-left:${Number(layer.left)||50}%;--palace-top:${Number(layer.top)||50}%;--palace-size:${Number(layer.size)||16}%" title="Sultan's Palace layer ${index+1}"><span class="layer-index">${index+1}</span><div class="palace-layer-controls"><button type="button" data-palace-layer-action="down" aria-label="Make layer smaller">−</button><button type="button" data-palace-layer-action="up" aria-label="Make layer larger">+</button><button type="button" data-palace-layer-action="fixed" aria-label="${layer.fixed?'Unfix':'Fix'} layer">${layer.fixed?'🔓':'🔒'}</button><button type="button" data-palace-layer-action="remove" aria-label="Remove layer">×</button></div></div>`).join('');
      tile.append(palaceLayerHost);
      // The Sultan's Palace shows only the Ruby track that covers the goods
      // requirements — no separate grey cube.
      const palaceRequirementHost=document.createElement('div');
      palaceRequirementHost.className='sultan-palace-requirement-cubes';
      tile.append(palaceRequirementHost);
    }

    if(name==='Post Office'){
      const postHost=document.createElement('div');postHost.className='post-office-layer-host';
      postHost.innerHTML=postOfficeLayers.map((layer,index)=>`<div class="post-office-board-layer ${layer.fixed?'is-fixed':''}" data-post-layer-id="${layer.id}" style="--post-left:${Number(layer.left)||50}%;--post-top:${Number(layer.top)||50}%;--post-size:${Number(layer.size)||12}%" title="Post Office layer ${index+1}"><span class="layer-index">${index+1}</span><div class="post-office-layer-controls"><button type="button" data-post-layer-action="down" aria-label="Make layer smaller">−</button><button type="button" data-post-layer-action="up" aria-label="Make layer larger">+</button><button type="button" data-post-layer-action="fixed" aria-label="${layer.fixed?'Unlock':'Lock'} layer">${layer.fixed?'🔓':'🔒'}</button></div></div>`).join('');
      const add=document.createElement('button');
      add.type='button'; add.className='post-office-add-layer'; add.textContent='Add Layer'; add.setAttribute('aria-label','Add Post Office layer');
      add.addEventListener('click',e=>{e.stopPropagation();addPostOfficeLayer()});
      postHost.append(add);
      tile.append(postHost);
      const postCubeHost=document.createElement('div');postCubeHost.className='post-office-cube-host';
      renderTileGreyCubes(postCubeHost,postOfficeLayers,'post');
      tile.append(postCubeHost);
    }
    if(name==='Gemstone Dealer'){
      ensureGemstoneTrackLayers();
      const gemHost=document.createElement('div');gemHost.className='gemstone-layer-host';
      gemHost.innerHTML=gemstoneLayers.map((layer,index)=>`<div class="gemstone-board-layer ${layer.fixed?'is-fixed':''} ${layer.trackIndex?'gemstone-track-layer':''}" data-gem-layer-id="${layer.id}" style="--gem-left:${Number(layer.left)||50}%;--gem-top:${Number(layer.top)||50}%;--gem-size:${Number(layer.size)||16}%" title="Gemstone Dealer layer ${index+1}">${layer.trackIndex?`<img class="gem-track-ruby-3d" src="assets/ruby.png" alt="Ruby ${layer.trackIndex}" draggable="false"><span class="gem-ruby-number">${layer.trackIndex}</span>`:''}<span class="layer-index">${index+1}</span><div class="gemstone-layer-controls"><button type="button" data-gem-layer-action="down" aria-label="Make layer smaller">−</button><button type="button" data-gem-layer-action="up" aria-label="Make layer larger">+</button><button type="button" data-gem-layer-action="fixed" aria-label="${layer.fixed?'Unfix':'Fix'} layer">${layer.fixed?'🔓':'🔒'}</button><button type="button" data-gem-layer-action="remove" aria-label="Remove layer">×</button></div></div>`).join('');
      tile.append(gemHost);
    }
    const playersLayer=document.createElement('div');playersLayer.className='tile-players';
    const assistantsLayer=document.createElement('div');assistantsLayer.className='tile-assistants';
    tile.append(playersLayer,assistantsLayer);tile.addEventListener('click',()=>onTileClick(name));
    new ResizeObserver(entries=>{const rect=entries[0].contentRect;slotSizes[name]={width:Math.round(rect.width),height:Math.round(rect.height)};localStorage.setItem('istanbul-tile-slot-sizes',JSON.stringify(slotSizes))}).observe(slot);
    board.append(tile);
  });
  requestAnimationFrame(()=>{placeAttachments();placePlayers();updateReachable();bindPalaceLayers();bindPostOfficeLayers();bindGemstoneLayers();});
}
const mosque=(good,label)=>({id:good,label:`${label} Mosque stack`,rule:`2 → 5 ${good} · 2-goods tile on top`,size:[350,348],cards:[2,3,4,5].map(n=>`assets/cards-review/cards/mosque-tiles/mosque-tile-${good}-${n}-goods.jpg`)});
let decks=[mosque('fruit','Fruit'),mosque('spice','Spice'),mosque('heirloom','Ring'),mosque('fabric','Fabric'),{id:'small-market',label:'Small Market Demand deck',rule:'5 light demand tiles · face-up stack',size:[156,232],cards:[1,2,3,4,5].map(n=>`assets/cards-review/cards/demand-tiles/demand-tile-${String(n).padStart(2,'0')}-front.png`)},{id:'large-market',label:'Large Market Demand deck',rule:'5 dark demand tiles · face-up stack',size:[156,232],cards:[6,7,8,9,10].map(n=>`assets/cards-review/cards/demand-tiles/demand-tile-${String(n).padStart(2,'0')}-back.png`)},{id:'bonus',label:'Bonus-card deck',rule:'Shuffle and keep face-down beside the board',size:[158,102],cards:['assets/cards-review/cards/icon-bonus-cards/icon-bonus-card-01.png'],faceDown:true},{id:'ruby',label:'Ruby token',rule:'Move it to the ruby space you are using',size:[92,85],cards:['assets/ruby.png'],token:true},{id:'goods-strip',label:'Goods strip',size:[66,222],cards:['assets/source-sheets/strip.jpg']},{id:'mail-marker',label:'Post Office mail marker',size:[48,48],cards:['assets/post-office-mail-marker.png'],token:true}];

const saved=JSON.parse(localStorage.getItem('istanbul-component-positions')||'{}'),slotSizes=JSON.parse(localStorage.getItem('istanbul-tile-slot-sizes')||'{}');
// Remove any previously attached ruby component from Gemstone Dealer; the dealer now starts clean.
Object.keys(saved).forEach(id=>{ if(/^ruby-\d+$/.test(id) && saved[id]?.attached==='Gemstone Dealer'){ delete saved[id]; } });
Object.keys(saved).forEach(id=>{ if(saved[id]?.attached==='Gemstone Dealer' || saved[id]?.attachedPlayerLayer?.location==='Gemstone Dealer'){ delete saved[id]; } });
localStorage.setItem('istanbul-component-positions',JSON.stringify(saved));
const PLAYER_LAYER_KEY='istanbul-player-board-layers';
const PLAYER_RUBY_SLOT_KEY='istanbul-player-ruby-slots-v1';
let playerRubySlots=(()=>{try{const v=JSON.parse(localStorage.getItem(PLAYER_RUBY_SLOT_KEY)||'{}');return v&&typeof v==='object'?v:{}}catch(_){return {}}})();
const PLAYER_BOARD_EDIT_KEY='istanbul-player-board-edit-mode';
let playerBoardEditMode=localStorage.getItem(PLAYER_BOARD_EDIT_KEY)==='1';
let playerSlotLockShapeMode=false;

const PALACE_LAYER_KEY='istanbul-sultan-palace-layers';
const POST_LAYER_KEY='istanbul-post-office-layers-v5-persistent';
const GEMSTONE_LAYER_KEY='istanbul-gemstone-dealer-layers';
const playerBoardLayers=JSON.parse(localStorage.getItem(PLAYER_LAYER_KEY)||'{}');
const palaceLayers=JSON.parse(localStorage.getItem(PALACE_LAYER_KEY)||'[]');
try{localStorage.removeItem('istanbul-post-office-layers');}catch(_){}
const postOfficeLayers=(()=>{try{const v=JSON.parse(localStorage.getItem(POST_LAYER_KEY)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}})();
// Post Office layers remain movable until explicitly locked with the lock button.

const gemstoneLayers=JSON.parse(localStorage.getItem(GEMSTONE_LAYER_KEY)||'[]');
// Legacy Gemstone Dealer overlay cleanup. Keep the new editable-layer store separate.
if(localStorage.getItem('istanbul-gemstone-dealer-clean-v1')!=='3'){
  localStorage.removeItem('istanbul-gemstone-dealer-old-layers');
  localStorage.setItem('istanbul-gemstone-dealer-clean-v1','3');
}

const PLAYER_SLOT_LOCK_KEY='istanbul-player-board-slot-locks-v1';
const playerBoardSlotLocks=JSON.parse(localStorage.getItem(PLAYER_SLOT_LOCK_KEY)||'{}');
function persistPlayerSlotLocks(){localStorage.setItem(PLAYER_SLOT_LOCK_KEY,JSON.stringify(playerBoardSlotLocks))}

const TILE_TOKEN_KEY='istanbul-tile-token-placements-v1';
const tileTokenPlacements=JSON.parse(localStorage.getItem(TILE_TOKEN_KEY)||'{}');
Object.keys(saved).forEach(id=>{if(saved[id]?.attached==='Tea House'&&(id.includes('merchant')||id.includes('assistant')))delete saved[id]});

// One-time cleanup: strip any leftover draggable Sultan's Palace grey-cube
// tokens. The Palace now shows only its Ruby track, so these are never recreated.
const PALACE_CUBE_CLEANUP='istanbul-palace-cube-cleanup-v3';
let palaceCubeWasRemoved=false;
if(localStorage.getItem(PALACE_CUBE_CLEANUP)!=='1'){
  Object.keys(saved).forEach(id=>{
    if(/^grey-cube(?:-\d+)?$/.test(id)){
      delete saved[id];
      palaceCubeWasRemoved=true;
    }
  });
  localStorage.setItem(PALACE_CUBE_CLEANUP,'1');
}
// Remove legacy Post Office cube attachments. New Post Office markers/layers are
// created explicitly by the user instead of being restored automatically.
const POST_CUBE_CLEANUP='istanbul-post-office-cube-cleanup-v2';
if(localStorage.getItem(POST_CUBE_CLEANUP)!=='1'){
  Object.keys(saved).forEach(id=>{
    const st=saved[id];
    if(/^mail-marker(?:-\d+)?$/.test(id) || (/^grey-cube(?:-\d+)?$/.test(id) && st?.attached==='Post Office')){
      if(!st?.attachedPlayerLayer) delete saved[id];
    }
  });
  localStorage.setItem(POST_CUBE_CLEANUP,'1');
}

// Player-board layer grid: 4 rows × 6 columns (24 total). Existing layers keep
// their exact positions; any missing layers are added using the spacing already
// established by the user's existing layers. This is a one-time migration so
// intentionally removed layers do not come back after refresh.
const PLAYER_GRID_COLS=6, PLAYER_GRID_ROWS=4, PLAYER_GRID_TOTAL=24, PLAYER_GRID_MIGRATION='istanbul-player-board-grid-geometry-v3';
const PLAYER_GRID_X=[26.0,39.0,51.5,64.3,76.5,88.2];
const PLAYER_GRID_Y=[21.2,41.7,61.7,81.5];
const PLAYER_GRID_SIZE=10.5;

// Preserve user-created player-board layers. No automatic removal or generation of 1–24 slots.
const PLAYER_BOARD_CLEANUP='istanbul-player-board-cleanup-v3';
function cleanupPlayerBoardLayers(){
  // Preserve the user's custom C7–C30 layers plus the existing 25–30 ruby layers.
  // Legacy/generated non-custom 1–24 layers are removed; custom layers are authoritative.
  let changed=false;
  Object.keys(playerBoardLayers).forEach(playerId=>{
    const list=Array.isArray(playerBoardLayers[playerId])?playerBoardLayers[playerId]:[];
    const custom=list.filter(l=>l && l.custom && !l.ruby);
    custom.sort((a,b)=>{
      const aa=Number(a.customSlot),bb=Number(b.customSlot);
      return (Number.isFinite(aa)?aa:9999)-(Number.isFinite(bb)?bb:9999);
    });
    const keepCustom=custom.slice(0,24);
    keepCustom.forEach((layer,i)=>{
      const slot=7+i;
      if(Number(layer.customSlot)!==slot){layer.customSlot=slot;changed=true;}
      if('boardIndex' in layer){delete layer.boardIndex;changed=true;}
    });
    const ruby=list.filter(l=>l && l.ruby && Number(l.boardIndex)>=25 && Number(l.boardIndex)<=30);
    const keepIds=new Set([...keepCustom,...ruby]);
    const next=list.filter(l=>keepIds.has(l));
    if(next.length!==list.length){changed=true;playerBoardLayers[playerId]=next;}
  });
  if(changed||localStorage.getItem(PLAYER_BOARD_CLEANUP)!=='1'){
    persistPlayerBoardLayers();
    localStorage.setItem(PLAYER_BOARD_CLEANUP,'1');
  }
}
cleanupPlayerBoardLayers();

// Add the one explicitly requested custom row C25–C30 beneath C19–C24.
// The existing C7–C24 layers remain the geometry source of truth. The separate
// ruby layers 25–30 are intentionally left untouched.
const PLAYER_C25_ROW_MIGRATION='istanbul-player-board-c25-row-v1';
function ensurePlayerCustomC25Row(){
  if(localStorage.getItem(PLAYER_C25_ROW_MIGRATION)==='1') return;
  const playerIds=players.length ? players.map(p=>String(p.id)) : Object.keys(playerBoardLayers);
  if(!playerIds.length) return;
  let changed=false;
  playerIds.forEach(playerId=>{
    const layers=Array.isArray(playerBoardLayers[playerId])?playerBoardLayers[playerId]:(playerBoardLayers[playerId]=[]);
    const row19=layers.filter(l=>l&&l.custom&&Number(l.customSlot)>=19&&Number(l.customSlot)<=24).sort((a,b)=>Number(a.customSlot)-Number(b.customSlot));
    const row13=layers.filter(l=>l&&l.custom&&Number(l.customSlot)>=13&&Number(l.customSlot)<=18).sort((a,b)=>Number(a.customSlot)-Number(b.customSlot));
    const ruby25=layers.find(l=>l&&l.ruby&&Number(l.boardIndex)===25);
    const fallbackXs=[26,39,51.5,64.3,76.5,88.2];
    const xs=[0,1,2,3,4,5].map(i=>Number.isFinite(Number(row19[i]?.left))?Number(row19[i].left):fallbackXs[i]);
    const row19Top=Number(row19[0]?.top);
    const row13Top=Number(row13[0]?.top);
    let step=Number.isFinite(row19Top)&&Number.isFinite(row13Top)?Math.abs(row19Top-row13Top):20;
    if(step<5) step=20;
    let top=Number.isFinite(row19Top)?row19Top+step:81.5;
    // If the existing ruby row is below C19 but leaves no room, place C25 halfway
    // between C19 and the ruby row instead of modifying the ruby layer.
    const rubyTop=Number(ruby25?.top);
    if(Number.isFinite(row19Top)&&Number.isFinite(rubyTop)&&rubyTop>row19Top+2 && top>=rubyTop-2){
      top=row19Top+(rubyTop-row19Top)/2;
    }
    for(let col=0;col<6;col++){
      const slot=25+col;
      let layer=layers.find(l=>l&&l.custom&&Number(l.customSlot)===slot);
      if(!layer){
        layer={id:`layer-custom-${playerId}-${slot}-${Date.now()}-${col}`,left:xs[col],top,size:10.5,fixed:false,custom:true,customSlot:slot,boardIndex:null};
        layers.push(layer); changed=true;
      } else {
        layer.custom=true; layer.customSlot=slot; if('boardIndex' in layer) delete layer.boardIndex;
      }
    }
  });
  if(changed) persistPlayerBoardLayers();
  localStorage.setItem(PLAYER_C25_ROW_MIGRATION,'1');
}
function ensureRubyLayers(){
  const playerIds=players.length?players.map(p=>String(p.id)):Object.keys(playerBoardLayers);
  playerIds.forEach(playerId=>{
    const layers=Array.isArray(playerBoardLayers[playerId])?playerBoardLayers[playerId]:(playerBoardLayers[playerId]=[]);
    for(let n=25;n<=30;n++){
      let layer=layers.find(l=>Number(l.boardIndex)===n && l.ruby);
      const col=n-25;
      if(!layer){
        layer={id:`layer-ruby-${playerId}-${n}`,left:PLAYER_GRID_X[col],top:PLAYER_GRID_Y[3],size:PLAYER_GRID_SIZE,fixed:true,ruby:true,boardIndex:n,claimed:(Array.isArray(playerRubySlots[String(playerId)])?playerRubySlots[String(playerId)].includes(n):false)};
        layers.push(layer);
      } else {
        // Existing user-aligned 25–30 layers are never repositioned/resized.
        layer.boardIndex=n; layer.ruby=true; layer.claimed=Array.isArray(playerRubySlots[String(playerId)])?playerRubySlots[String(playerId)].includes(n):false;
        if(!Number.isFinite(Number(layer.left))) layer.left=PLAYER_GRID_X[col];
        if(!Number.isFinite(Number(layer.top))) layer.top=PLAYER_GRID_Y[3];
        if(!Number.isFinite(Number(layer.size))) layer.size=PLAYER_GRID_SIZE;
      }
    }
  });
  persistPlayerBoardLayers();
}

// Sultan cubes: exactly four persistent cubes on the first player's board,
// anchored initially to layers 1, 7, 13 and 19. Old cube instances are removed
// so the previous stuck/fixed cube cannot return after refresh.
Object.keys(saved).filter(id=>/^grey-cube(?:-\d+)?$/.test(id)).forEach(id=>delete saved[id]);
if(palaceCubeWasRemoved) localStorage.setItem('istanbul-component-positions',JSON.stringify(saved));
['red-family','red-merchant','red-assistant'].forEach(id=>delete saved[id]);
const removedIds=JSON.parse(localStorage.getItem('istanbul-removed-decks')||'[]');decks=decks.filter(d=>!removedIds.includes(d.id)&&!['red-family','red-merchant','red-assistant'].includes(d.id));
// Restore the standard board assets to their logical tiles when a saved attachment is missing.
// This is intentionally one-time/default-only: existing custom positions are preserved.
const TILE_ASSET_RESTORE='istanbul-tile-assets-restored-v1';
const DEFAULT_TILE_ATTACHMENTS={
  fruit:'Great Mosque',
  spice:'Small Mosque',
  heirloom:'Great Mosque',
  fabric:'Small Mosque',
  'small-market':'Small Market',
  'large-market':'Large Market',
  bonus:'Caravanserai',
  'goods-strip':'Wainwright',
};
if(localStorage.getItem(TILE_ASSET_RESTORE)!=='1'){
  const offsets={fruit:[0.16,0.12],spice:[0.58,0.12],heirloom:[0.16,0.56],fabric:[0.58,0.56],'small-market':[0.5,0.46],'large-market':[0.5,0.46],bonus:[0.78,0.18],'goods-strip':[0.84,0.42]};
  Object.entries(DEFAULT_TILE_ATTACHMENTS).forEach(([id,location])=>{
    const current=saved[id]||{};
    if(!current.attached && !current.attachedPlayerLayer){
      const [slotX,slotY]=offsets[id]||[0.5,0.5];
      saved[id]={...current,attached:location,slotX,slotY};
    }
  });
  localStorage.setItem(TILE_ASSET_RESTORE,'1');
}

// Definitive cleanup: the standalone Post Office mail-marker must not appear on the board.
// The four Post Office grey cubes are rendered from postOfficeLayers and remain intact.
const POST_MAIL_MARKER_CLEANUP='istanbul-post-office-mail-marker-cleanup-v3';
if(localStorage.getItem(POST_MAIL_MARKER_CLEANUP)!=='1'){
  Object.keys(saved).forEach(id=>{ if(/^mail-marker(?:-\d+)?$/.test(id)) delete saved[id]; });
  decks=decks.filter(d=>!/^mail-marker(?:-\d+)?$/.test(d.id));
  localStorage.setItem(POST_MAIL_MARKER_CLEANUP,'1');
}
Object.keys(saved).filter(id=>/^ruby-\d+$/.test(id)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).forEach(id=>{
  decks.push({id,label:id.replace('-',' '),size:[92,85],cards:['assets/ruby.png'],token:true});
});
localStorage.setItem('istanbul-component-positions',JSON.stringify(saved));
let locked=true,drag=null,dragFrame=0;
function initial(i){const area=document.querySelector('.deck-area'),base=area.offsetTop+area.offsetHeight+20;return{x:18+(i%4)*235,y:base+Math.floor(i/4)*400}}
function marketDeckImage(type){const idx=currentDemand(type);const face=idx<5?'front':'back';return `assets/cards-review/cards/demand-tiles/demand-tile-${String(idx+1).padStart(2,'0')}-${face}.png`}
function markup(d,i){const s=saved[d.id]||{},p=s.x==null?initial(i):s,scale=s.scale||1;let card='';if(d.id==='small-market')card=`<img src="${marketDeckImage('small')}" alt="Small Market demand" draggable="false">`;else if(d.id==='large-market')card=`<img src="${marketDeckImage('large')}" alt="Large Market demand" draggable="false">`;else if(['fruit','spice','heirloom','fabric'].includes(d.id)){const mosque=MOSQUE_OF_GOOD[d.id];const req=mosqueStacks?.[mosque]?.[d.id]?.[0];card=req?`<img src="${mosqueCardImage(mosque,d.id,req)}" alt="${GOOD_LABEL[d.id]} Mosque top card" draggable="false">`:'<div class="empty-deck">Empty</div>'}else if(!d.faceDown)card=`<img src="${d.cards[0]}" alt="" draggable="false">`;const back=d.faceDown?' style="border:3px solid #d8b464;border-radius:8px;background:repeating-linear-gradient(45deg,#693a23 0 7px,#8f552d 7px 14px);box-shadow:3px 4px 0 #160b06"':'';return `<article class="deck ${d.token?'token':''} ${s.attached?'fixed':''}" data-deck="${d.id}" style="--deck-x:${p.x}px;--deck-y:${p.y}px;--scale:${scale};--card-w:${d.size[0]}px;--card-h:${d.size[1]}px"><div class="stack ${d.faceDown?'face-down':''}"${back}>${card}</div><span class="deck-caption">${d.label}</span></article>`}
function height(){const bottom=Math.max(...[...deckRoot.children].map(d=>(parseFloat(d.style.getPropertyValue('--deck-y'))||0)+(parseFloat(d.style.getPropertyValue('--card-h'))||0)*(parseFloat(d.style.getPropertyValue('--scale'))||1)+150));const area=document.querySelector('.deck-area');surface.style.minHeight=`${Math.max(bottom+36,area.offsetTop+area.offsetHeight+360)}px`}
function saveAttachmentOffset(d){const state=saved[d.dataset.deck];if(!state?.attached)return;const slot=[...board.children].find(t=>t.dataset.location===state.attached)?.querySelector('.tile-slot');if(!slot)return;const surfaceBox=surface.getBoundingClientRect(),box=slot.getBoundingClientRect(),scale=parseFloat(d.style.getPropertyValue('--scale'))||1,width=(parseFloat(d.style.getPropertyValue('--card-w'))||0)*scale,height=(parseFloat(d.style.getPropertyValue('--card-h'))||0)*scale,x=parseFloat(d.style.getPropertyValue('--deck-x')),y=parseFloat(d.style.getPropertyValue('--deck-y')),left=box.left-surfaceBox.left,top=box.top-surfaceBox.top,maxX=Math.max(0,box.width-width),maxY=Math.max(0,box.height-height);state.slotX=Math.max(0,Math.min(x-left,maxX))/box.width;state.slotY=Math.max(0,Math.min(y-top,maxY))/box.height}
function save(d){saved[d.dataset.deck]={...saved[d.dataset.deck],x:parseFloat(d.style.getPropertyValue('--deck-x')),y:parseFloat(d.style.getPropertyValue('--deck-y')),scale:parseFloat(d.style.getPropertyValue('--scale'))};saveAttachmentOffset(d);localStorage.setItem('istanbul-component-positions',JSON.stringify(saved))}
function attachIfDropped(d,x,y){d.style.pointerEvents='none';const hit=document.elementFromPoint(x,y);const layerTarget=d.dataset.deck.startsWith('grey-cube')?hit?.closest('.player-board-layer'):null;const tileTarget=hit?.closest('.tile-slot');d.style.pointerEvents='';if(layerTarget){
  const playerId=Number(layerTarget.dataset.player),layerId=layerTarget.dataset.layerId;
  const layers=playerBoardLayers[String(playerId)]||playerBoardLayers[playerId]||[];
  let candidates=layers.map((l,i)=>({l,i})).filter(x=>x.l.id===layerId);
  if(d.dataset.deck.startsWith('grey-cube-')){
    const row=Number(saved[d.dataset.deck]?.sultanRow??0);
    candidates=layers.map((l,i)=>({l,i})).filter(x=>Math.floor(x.i/PLAYER_GRID_COLS)===row);
    const targetRect=layerTarget.parentElement.getBoundingClientRect();
    const colCenter=x-targetRect.left;
    candidates.sort((a,b)=>{
      const ax=(a.l.left/100*targetRect.width),bx=(b.l.left/100*targetRect.width);
      return Math.abs(ax-colCenter)-Math.abs(bx-colCenter)
    });
  }
  const chosen=candidates[0];if(!chosen)return;
  const chosenEl=[...document.querySelectorAll(`.player-board-layer[data-player="${playerId}"]`)].find(el=>el.dataset.layerId===chosen.l.id);
  if(!chosenEl)return;
  const center=playerLayerElementCenter(chosenEl);const surfaceBox=surface.getBoundingClientRect();
  saved[d.dataset.deck]={...saved[d.dataset.deck],attachedPlayerLayer:{playerId,layerId:chosen.l.id},attached:null};
  d.style.setProperty('--deck-x',`${center.x-surfaceBox.left}px`);d.style.setProperty('--deck-y',`${center.y-surfaceBox.top}px`);save(d);d.classList.add('player-layer-attached');return}if(!tileTarget)return;saved[d.dataset.deck]={...saved[d.dataset.deck],attached:tileTarget.dataset.location,attachedPlayerLayer:null};const fixed=constrainToSlot(d,parseFloat(d.style.getPropertyValue('--deck-x')),parseFloat(d.style.getPropertyValue('--deck-y')));d.style.setProperty('--deck-x',`${fixed.x}px`);d.style.setProperty('--deck-y',`${fixed.y}px`);save(d);d.classList.add('fixed')}
function placeAttachments(){const surfaceBox=surface.getBoundingClientRect();deckRoot.querySelectorAll('.deck').forEach(d=>{const state=saved[d.dataset.deck];if(state?.attachedPlayerLayer){const layer=document.querySelector(`.player-board-layer[data-player="${state.attachedPlayerLayer.playerId}"][data-layer-id="${state.attachedPlayerLayer.layerId}"]`);if(layer){const center=playerLayerElementCenter(layer);d.style.setProperty('--deck-x',`${center.x-surfaceBox.left}px`);d.style.setProperty('--deck-y',`${center.y-surfaceBox.top}px`)}return}if(!state?.attached)return;const slot=[...board.children].find(t=>t.dataset.location===state.attached)?.querySelector('.tile-slot');if(!slot)return;const box=slot.getBoundingClientRect(),x=box.left-surfaceBox.left+box.width*(state.slotX||0),y=box.top-surfaceBox.top+box.height*(state.slotY||0);d.style.setProperty('--deck-x',`${x}px`);d.style.setProperty('--deck-y',`${y}px`)})}
function renderDecks(){deckRoot.innerHTML=decks.map(markup).join('');deckRoot.querySelectorAll('.deck').forEach(d=>{const state=saved[d.dataset.deck]||{},isPlayerLayerAttached=!!state.attachedPlayerLayer,isFixed=!!state.attached&&!isPlayerLayerAttached;d.addEventListener('pointerdown',e=>{if(e.target.closest('button')||isFixed||(locked&&!isPlayerLayerAttached))return;e.preventDefault();if(isPlayerLayerAttached){saved[d.dataset.deck]={...state,attachedPlayerLayer:null};localStorage.setItem('istanbul-component-positions',JSON.stringify(saved));d.classList.remove('player-layer-attached')}drag={d,x:e.clientX,y:e.clientY,left:parseFloat(d.style.getPropertyValue('--deck-x')),top:parseFloat(d.style.getPropertyValue('--deck-y')),pointerId:e.pointerId};d.classList.add('dragging')});d.querySelectorAll('[data-resize]').forEach(b=>b.addEventListener('click',()=>{const n=parseFloat(d.style.getPropertyValue('--scale'))||1,delta=b.dataset.resize==='up'?.1:-.1,next=Math.min(1.5,Math.max(.3,n+delta));d.style.setProperty('--scale',String(next));save(d)}))});requestAnimationFrame(()=>{placeAttachments()})}
function constrainToSlot(d,x,y){const state=saved[d.dataset.deck];if(!state?.attached)return{x,y};const slot=[...board.children].find(t=>t.dataset.location===state.attached)?.querySelector('.tile-slot');if(!slot)return{x,y};const surfaceBox=surface.getBoundingClientRect(),box=slot.getBoundingClientRect(),scale=parseFloat(d.style.getPropertyValue('--scale'))||1,width=(parseFloat(d.style.getPropertyValue('--card-w'))||0)*scale,height=(parseFloat(d.style.getPropertyValue('--card-h'))||0)*scale,left=box.left-surfaceBox.left,top=box.top-surfaceBox.top;return{x:Math.max(left,Math.min(x,left+box.width-width)),y:Math.max(top,Math.min(y,top+box.height-height))}}
function paintDrag(){dragFrame=0;if(!drag)return;drag.d.style.transform=`translate3d(${drag.nextX-drag.left}px,${drag.nextY-drag.top}px,0)`}
function moveDrag(e){if(!drag||e.pointerId!==drag.pointerId)return;e.preventDefault();const next=constrainToSlot(drag.d,drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);drag.nextX=next.x;drag.nextY=next.y;if(!dragFrame)dragFrame=requestAnimationFrame(paintDrag)}
document.addEventListener('pointermove',moveDrag,{passive:false});document.addEventListener('pointerrawupdate',moveDrag,{passive:false});
document.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.pointerId)return;if(dragFrame){cancelAnimationFrame(dragFrame);dragFrame=0}const current=drag;current.d.style.transform='';current.d.style.setProperty('--deck-x',`${current.nextX??current.left}px`);current.d.style.setProperty('--deck-y',`${current.nextY??current.top}px`);current.d.classList.remove('dragging');save(current.d);attachIfDropped(current.d,e.clientX,e.clientY);drag=null});
function setLocked(v){locked=v;if(deckRoot)deckRoot.dataset.locked=String(v);if(!lockButton)return;lockButton.textContent=v?'Layout locked':'Layout unlocked — drag components';lockButton.setAttribute('aria-pressed',String(v));lockButton.classList.toggle('active',!v)}
if(lockButton)lockButton.addEventListener('click',()=>setLocked(!locked));
const namesButton=document.querySelector('#toggle-names');if(namesButton)namesButton.addEventListener('click',()=>{const visible=deckRoot.classList.toggle('show-captions');namesButton.textContent=visible?'Hide deck names':'Show deck names';namesButton.setAttribute('aria-pressed',String(visible))});
document.querySelector('#add-ruby')?.addEventListener('click',()=>{const number=decks.filter(d=>d.id.startsWith('ruby-')).length+1,id=`ruby-${number}`;decks.push({id,label:`Ruby ${number}`,size:[92,85],cards:['assets/ruby.png'],token:true});saved[id]={scale:1};localStorage.setItem('istanbul-component-positions',JSON.stringify(saved));renderDecks()});
document.querySelector('#add-mail-marker')?.addEventListener('click',()=>{const number=decks.filter(d=>d.id.startsWith('mail-marker-')).length+1,id=`mail-marker-${number}`;decks.push({id,label:`Mail marker ${number}`,size:[42,42],cards:['assets/post-office-mail-marker.png'],token:true});saved[id]={scale:1};localStorage.setItem('istanbul-component-positions',JSON.stringify(saved));renderDecks()});
function persistPlayerBoardLayers(){localStorage.setItem(PLAYER_LAYER_KEY,JSON.stringify(playerBoardLayers))}
// Every player's wheelbarrow uses the SAME board design. Player 0's editable grid
// (custom layers + slot-locks) is the template; copy it onto every other player so
// all boards look identical. Their own Ruby layers / claimed state are preserved.
function mirrorPlayerBoardLayout(){
  if(playerBoardEditMode)return;
  const src=playerBoardLayers['0'];
  if(!Array.isArray(src)||!src.length)return;
  const tmplLayers=src.filter(l=>l&&l.custom&&l.ruby!==true);
  if(!tmplLayers.length)return;
  const tmplRuby=src.filter(l=>l&&l.ruby===true);           // ruby-slot positions from player 0
  const tmplLocks=Array.isArray(playerBoardSlotLocks['0'])?playerBoardSlotLocks['0']:[];
  let changed=false;
  (players.length?players.map(p=>String(p.id)):['1','2','3']).forEach(key=>{
    if(key==='0')return;
    const cur=Array.isArray(playerBoardLayers[key])?playerBoardLayers[key]:[];
    if(cur.filter(l=>l&&l.custom&&l.ruby!==true).length===tmplLayers.length
       && cur.filter(l=>l&&l.ruby===true).length===tmplRuby.length
       && cur.filter(l=>l&&l.ruby===true).every(l=>{const t=tmplRuby.find(x=>x.boardIndex===l.boardIndex);return t&&Number(t.left)===Number(l.left)&&Number(t.top)===Number(l.top);})) return; // already mirrored
    const claimedByIndex={};
    cur.filter(l=>l&&l.ruby===true).forEach(l=>{claimedByIndex[l.boardIndex]=!!l.claimed;});
    playerBoardLayers[key]=[
      ...tmplLayers.map(l=>({...l,id:`layer-mirror-${key}-${l.customSlot??l.boardIndex??l.id}`})),
      ...tmplRuby.map(l=>({...l,id:`layer-ruby-${key}-${l.boardIndex}`,claimed:!!claimedByIndex[l.boardIndex]}))
    ];
    playerBoardSlotLocks[key]=tmplLocks.map((l,i)=>({...l,id:`slot-lock-mirror-${key}-${i}`}));
    changed=true;
  });
  if(changed){persistPlayerBoardLayers();persistPlayerSlotLocks();}
}
function persistPalaceLayers(){localStorage.setItem(PALACE_LAYER_KEY,JSON.stringify(palaceLayers))}
function persistPostOfficeLayers(){localStorage.setItem(POST_LAYER_KEY,JSON.stringify(postOfficeLayers))}
function persistGemstoneLayers(){localStorage.setItem(GEMSTONE_LAYER_KEY,JSON.stringify(gemstoneLayers))}
const GEMSTONE_TRACK_SLOTS=[
  {left:11.6,top:34.6}, // printed 12
  {left:11.6,top:55.8}, // 13
  {left:11.6,top:80.8}, // 14
  {left:24.2,top:80.8}, // 15
  {left:38.0,top:80.8}, // 16
  {left:51.9,top:80.8}, // 17
  {left:65.8,top:80.8}, // 18
  {left:79.6,top:80.8}, // 19
  {left:91.7,top:80.8}, // 20
  {left:91.7,top:55.8}, // 21
  {left:91.7,top:31.8}, // 22
  {left:91.7,top:11.0}  // 23
];
const GEMSTONE_TRACK_POSITION_FIX='istanbul-gemstone-track-position-fix-v4';
// The Dealer track has 12 numbered Ruby spaces (printed 12…23), one Ruby each.
function ensureGemstoneTrackLayers(){
  let changed=false;
  const byTrack=new Map();
  gemstoneLayers.forEach(layer=>{
    const n=Number(layer?.trackIndex);
    if(Number.isInteger(n) && n>=1 && n<=12 && !byTrack.has(n)) byTrack.set(n,layer);
  });
  const cleanupNeeded=localStorage.getItem(GEMSTONE_TRACK_POSITION_FIX)!=='1';
  const target=GEMSTONE_TRACK_SLOTS.map((slot,i)=>{
    const n=i+1;
    const existing=byTrack.get(n);
    const normalized={
      ...(existing||{}),
      id:`gem-track-${n}`,
      left:Number.isFinite(Number(existing?.left)) ? Number(existing.left) : slot.left,
      top:Number.isFinite(Number(existing?.top)) ? Number(existing.top) : slot.top,
      size:Number.isFinite(Number(existing?.size)) ? Number(existing.size) : 10.5,
      fixed:existing?.fixed===true,
      ruby:true,
      trackIndex:n
    };
    if(!existing) changed=true;
    return normalized;
  });
  // One-time cleanup: remove stray non-track layers, keeping the 12 dedicated
  // Ruby-track layers (trackIndex 1–12) plus any custom layers the user positioned.
  const extras=cleanupNeeded ? [] : gemstoneLayers.filter(layer=>{
    const n=Number(layer?.trackIndex);
    return !(Number.isInteger(n) && n>=1 && n<=12);
  });
  const before=JSON.stringify(gemstoneLayers);
  gemstoneLayers.splice(0,gemstoneLayers.length,...target,...extras);
  if(JSON.stringify(gemstoneLayers)!==before) changed=true;
  if(cleanupNeeded){
    localStorage.setItem(GEMSTONE_TRACK_POSITION_FIX,'1');
    changed=true;
  }
  if(changed) persistGemstoneLayers();
}

function addGemstoneLayer(){
  const idx=gemstoneLayers.length,cols=3,row=Math.floor(idx/cols),col=idx%cols;
  gemstoneLayers.push({id:`gem-layer-${Date.now()}-${idx+1}`,left:25+col*25,top:30+row*24,size:14,fixed:false});
  persistGemstoneLayers();render();
}
let gemMoveMode=false;
function setGemMoveMode(v){
  gemMoveMode=!!v;
  if(moveGemButton){
    moveGemButton.setAttribute('aria-pressed',String(gemMoveMode));
    moveGemButton.textContent=gemMoveMode?'Stop moving Gemstone rubies':'Move Gemstone rubies';
    moveGemButton.classList.toggle('active',gemMoveMode);
  }
  surface?.classList.toggle('gemstone-move-mode',gemMoveMode);
}
function bindGemstoneLayers(){
  document.querySelectorAll('.gemstone-board-layer').forEach(el=>{
    const id=el.dataset.gemLayerId,layer=gemstoneLayers.find(x=>x.id===id);if(!layer)return;
    el.querySelectorAll('[data-gem-layer-action]').forEach(btn=>btn.addEventListener('click',e=>{
      e.stopPropagation();const action=btn.dataset.gemLayerAction;
      if(action==='fixed')layer.fixed=!layer.fixed;
      if(action==='remove'){const i=gemstoneLayers.findIndex(x=>x.id===id);if(i>=0)gemstoneLayers.splice(i,1);}
      if(action==='up')layer.size=Math.min(45,(Number(layer.size)||14)+2);
      if(action==='down')layer.size=Math.max(6,(Number(layer.size)||14)-2);
      persistGemstoneLayers();render();
    }));
    let state=null;
    el.addEventListener('pointerdown',e=>{
      const moveOnly=gemMoveMode && Number(layer.trackIndex)>=1 && Number(layer.trackIndex)<=12;
      if(e.target.closest('.gemstone-layer-controls') || (!moveOnly && layer.fixed))return;
      const box=el.parentElement.getBoundingClientRect();
      state={x:e.clientX,y:e.clientY,left:Number(layer.left)||50,top:Number(layer.top)||50,box,moveOnly};
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('dragging');
      e.preventDefault();
      e.stopPropagation();
    });
    el.addEventListener('pointermove',e=>{
      if(!state)return;
      const sizePct=Math.min(90,Math.max(0,Number(layer.size)||10.5));
      const half=sizePct/2;
      layer.left=Math.max(half,Math.min(100-half,state.left+(e.clientX-state.x)/state.box.width*100));
      layer.top=Math.max(half,Math.min(100-half,state.top+(e.clientY-state.y)/state.box.height*100));
      el.style.setProperty('--gem-left',`${layer.left}%`);
      el.style.setProperty('--gem-top',`${layer.top}%`);
    });
    const finish=()=>{
      if(!state)return;
      const movingState=state;state=null;el.classList.remove('dragging');
      if(movingState.moveOnly) layer.fixed=true;
      persistGemstoneLayers();
      render();
    };
    el.addEventListener('pointerup',finish);
    el.addEventListener('pointercancel',finish);
  });
}
function addPostOfficeLayer(){
  const idx=postOfficeLayers.length, cols=4, row=Math.floor(idx/cols), col=idx%cols;
  postOfficeLayers.push({
    id:`post-layer-${Date.now()}-${idx+1}`,
    left:20+col*20,
    top:30+row*22,
    size:12,
    fixed:false
  });
  persistPostOfficeLayers();
  render();
}
function bindPostOfficeLayers(){
  document.querySelectorAll('.post-office-board-layer').forEach(el=>{
    const id=el.dataset.postLayerId,layer=postOfficeLayers.find(x=>x.id===id);if(!layer)return;
    el.querySelectorAll('[data-post-layer-action]').forEach(btn=>btn.addEventListener('click',e=>{
      e.stopPropagation();
      const action=btn.dataset.postLayerAction;
      if(action==='fixed') layer.fixed=!layer.fixed;
      else if(action==='up') layer.size=Math.min(40,(Number(layer.size)||12)+2);
      else if(action==='down') layer.size=Math.max(6,(Number(layer.size)||12)-2);
      persistPostOfficeLayers();render();
    }));
    let state=null;
    el.addEventListener('pointerdown',e=>{
      if(e.target.closest('.post-office-layer-controls')||layer.fixed)return;
      const box=el.parentElement.getBoundingClientRect();
      state={x:e.clientX,y:e.clientY,left:Number(layer.left)||50,top:Number(layer.top)||50,box};
      el.setPointerCapture?.(e.pointerId);
      e.preventDefault();e.stopPropagation();el.classList.add('dragging');
    });
    el.addEventListener('pointermove',e=>{
      if(!state)return;
      const half=(Number(layer.size)||12)/2;
      layer.left=Math.max(half,Math.min(100-half,state.left+(e.clientX-state.x)/state.box.width*100));
      layer.top=Math.max(half,Math.min(100-half,state.top+(e.clientY-state.y)/state.box.height*100));
      el.style.setProperty('--post-left',`${layer.left}%`);el.style.setProperty('--post-top',`${layer.top}%`);
    });
    const finish=()=>{if(!state)return;state=null;el.classList.remove('dragging');persistPostOfficeLayers()};
    el.addEventListener('pointerup',finish);el.addEventListener('pointercancel',finish);
  });
}
function addPalaceLayer(){
  const idx=palaceLayers.length;
  const cols=4, row=Math.floor(idx/cols), col=idx%cols;
  palaceLayers.push({id:`palace-layer-${Date.now()}-${idx+1}`,left:26+col*16,top:28+row*18,size:12,fixed:false});
  persistPalaceLayers();render();
}
function bindPalaceLayers(){
  document.querySelectorAll('.palace-board-layer').forEach(el=>{
    const id=el.dataset.palaceLayerId,layer=palaceLayers.find(x=>x.id===id);if(!layer)return;
    el.querySelectorAll('[data-palace-layer-action]').forEach(btn=>btn.addEventListener('click',e=>{
      e.stopPropagation();const action=btn.dataset.palaceLayerAction;
      if(action==='fixed')layer.fixed=!layer.fixed;
      if(action==='remove')palaceLayers.splice(palaceLayers.indexOf(layer),1);
      if(action==='up')layer.size=Math.min(40,(Number(layer.size)||16)+2);
      if(action==='down')layer.size=Math.max(6,(Number(layer.size)||16)-2);
      persistPalaceLayers();render();
    }));
    let state=null;
    el.addEventListener('pointerdown',e=>{if(e.target.closest('.palace-layer-controls')||layer.fixed)return;state={x:e.clientX,y:e.clientY,left:layer.left,top:layer.top};el.setPointerCapture?.(e.pointerId);e.preventDefault()});
    el.addEventListener('pointermove',e=>{if(!state)return;const box=el.parentElement.getBoundingClientRect();layer.left=Math.max(5,Math.min(95,state.left+(e.clientX-state.x)/box.width*100));layer.top=Math.max(5,Math.min(95,state.top+(e.clientY-state.y)/box.height*100));el.style.setProperty('--palace-left',`${layer.left}%`);el.style.setProperty('--palace-top',`${layer.top}%`)});
    el.addEventListener('pointerup',()=>{if(!state)return;state=null;persistPalaceLayers()});el.addEventListener('pointercancel',()=>{state=null;persistPalaceLayers()});
  });
}

function addPlayerBoardSlotLock(){
  if(!players.length)return;
  const now=Date.now();
  players.forEach((p,playerIndex)=>{
    const key=String(p.id);
    const list=Array.isArray(playerBoardSlotLocks[key])?playerBoardSlotLocks[key]:(playerBoardSlotLocks[key]=[]);
    const n=list.length+1;
    const col=Math.min(5,2+(n-1));
    list.push({id:`slot-lock-${now}-${p.id}-${n}`,left:PLAYER_GRID_X[col],top:50,size:9,height:26,fixed:false});
  });
  persistPlayerSlotLocks(); renderPlayerBoards();
}
function slotLockAction(playerId,lockId,action){
  if(!playerBoardEditMode)return;
  const list=playerBoardSlotLocks[String(playerId)]||[];
  const lock=list.find(x=>String(x.id)===String(lockId));
  if(!lock)return;
  const size=Math.max(3,Math.min(28,Number(lock.size)||9));
  const height=Math.max(8,Math.min(60,Number(lock.height)||26));
  if(action==='remove'){
    const i=list.findIndex(x=>String(x.id)===String(lockId));
    if(i>=0) list.splice(i,1);
  } else if(action==='fixed'){
    lock.fixed=!lock.fixed;
  } else if(action==='up'){
    lock.size=Math.min(40,size+1);
    lock.height=Math.min(80,height+2);
  } else if(action==='down'){
    lock.size=Math.max(1,size-1);
    lock.height=Math.max(4,height-2);
  }
  persistPlayerSlotLocks();
  renderPlayerBoards();
}
function bindPlayerBoardSlotLocks(){
  if(!boardsEl.dataset.slotLockDelegated){
    boardsEl.dataset.slotLockDelegated='1';
    boardsEl.addEventListener('click',e=>{
      const btn=e.target.closest('[data-slot-lock-action]');
      if(!btn||!boardsEl.contains(btn))return;
      e.preventDefault();e.stopPropagation();
      const host=btn.closest('.player-board-slot-lock');
      if(!host)return;
      slotLockAction(String(host.dataset.player||''),String(host.dataset.slotLockId||''),btn.dataset.slotLockAction);
    });
  }
  if(!boardsEl.dataset.slotLockResizeDelegated){
    boardsEl.dataset.slotLockResizeDelegated='1';
    let activeResize=null;
    const applyResize=e=>{
      if(!activeResize)return;
      const {playerId,lockId,handle,startX,startY,startLeft,startTop,startWidth,startHeight,box}=activeResize;
      const lock=(playerBoardSlotLocks[playerId]||[]).find(x=>String(x.id)===lockId);
      if(!lock)return;
      const dx=(e.clientX-startX)/box.width*100;
      const dy=(e.clientY-startY)/box.height*100;
      let left=startLeft-startWidth/2,right=startLeft+startWidth/2;
      let top=startTop-startHeight/2,bottom=startTop+startHeight/2;
      if(handle.includes('w')) left+=dx; else if(handle.includes('e')) right+=dx;
      if(handle.includes('n')) top+=dy; else if(handle.includes('s')) bottom+=dy;
      const minW=1,maxW=55,minH=3,maxH=90;
      if(right-left<minW){ if(handle.includes('w')) left=right-minW; else right=left+minW; }
      if(bottom-top<minH){ if(handle.includes('n')) top=bottom-minH; else bottom=top+minH; }
      if(right-left>maxW){ if(handle.includes('w')) left=right-maxW; else right=left+maxW; }
      if(bottom-top>maxH){ if(handle.includes('n')) top=bottom-maxH; else bottom=top+maxH; }
      const w=right-left,h=bottom-top;
      const cx=Math.max(w/2,Math.min(100-w/2,(left+right)/2));
      const cy=Math.max(h/2,Math.min(100-h/2,(top+bottom)/2));
      lock.left=cx; lock.top=cy; lock.size=w; lock.height=h;
      const host=document.querySelector(`.player-board-slot-lock[data-player="${CSS.escape(playerId)}"][data-slot-lock-id="${CSS.escape(lockId)}"]`);
      if(host){
        host.style.setProperty('--lock-left',`${lock.left}%`);
        host.style.setProperty('--lock-top',`${lock.top}%`);
        host.style.setProperty('--lock-size',`${lock.size}%`);
        host.style.setProperty('--lock-height',`${lock.height}%`);
      }
      e.preventDefault();
    };
    const endResize=()=>{ if(!activeResize)return; activeResize=null; persistPlayerSlotLocks(); renderPlayerBoards(); };
    window.addEventListener('pointermove',applyResize,{passive:false});
    window.addEventListener('pointerup',endResize);
    window.addEventListener('pointercancel',endResize);
    window.addEventListener('blur',endResize);
    boardsEl.addEventListener('pointerdown',e=>{
      const handle=e.target.closest('.slot-lock-resize');
      if(!handle||!boardsEl.contains(handle)||!playerBoardEditMode)return;
      const host=handle.closest('.player-board-slot-lock');
      if(!host)return;
      const playerId=String(host.dataset.player||''),lockId=String(host.dataset.slotLockId||'');
      const lock=(playerBoardSlotLocks[playerId]||[]).find(x=>String(x.id)===lockId);
      if(!lock)return;
      // Shape editing is available whenever player-board editing is active.
      if(lock.fixed) return;
      const box=host.parentElement.getBoundingClientRect();
      activeResize={playerId,lockId,handle:handle.dataset.resize||'',startX:e.clientX,startY:e.clientY,startLeft:Number(lock.left)||50,startTop:Number(lock.top)||50,startWidth:Number(lock.size)||9,startHeight:Number(lock.height)||26,box};
      e.preventDefault();e.stopPropagation();
    });
  }
  boardsEl.querySelectorAll('.player-board-slot-lock').forEach(el=>{
    if(el.dataset.slotLockBound==='1')return;
    el.dataset.slotLockBound='1';
    const playerId=String(el.dataset.player),lockId=String(el.dataset.slotLockId);
    const getLock=()=> (playerBoardSlotLocks[playerId]||[]).find(x=>String(x.id)===lockId);
    let drag=null;
    el.addEventListener('pointerdown',e=>{
      if(e.target.closest('.slot-lock-controls')||e.target.closest('.slot-lock-resize'))return;
      const lock=getLock();
      if(!lock||!playerBoardEditMode||drag||lock.fixed)return;
      const box=el.parentElement.getBoundingClientRect();
      drag={x:e.clientX,y:e.clientY,left:Number(lock.left)||50,top:Number(lock.top)||50,box,pointerId:e.pointerId};
      try{el.setPointerCapture(e.pointerId)}catch(_){ }
      e.preventDefault();e.stopPropagation();
    });
    el.addEventListener('pointermove',e=>{
      if(!drag)return;
      const lock=getLock();if(!lock)return;
      lock.left=Math.max(2,Math.min(98,drag.left+(e.clientX-drag.x)/drag.box.width*100));
      lock.top=Math.max(2,Math.min(98,drag.top+(e.clientY-drag.y)/drag.box.height*100));
      el.style.setProperty('--lock-left',`${lock.left}%`);el.style.setProperty('--lock-top',`${lock.top}%`);
      e.preventDefault();
    });
    el.addEventListener('pointerup',()=>{if(!drag)return;drag=null;persistPlayerSlotLocks();renderPlayerBoards()});
    el.addEventListener('pointercancel',()=>{drag=null;persistPlayerSlotLocks();renderPlayerBoards()});
  });
}

function addPlayerBoardLayer(){
  if(!players.length)return;
  const now=Date.now();
  players.forEach((p,playerIndex)=>{
    const key=String(p.id);
    const layers=Array.isArray(playerBoardLayers[key])?playerBoardLayers[key]:(playerBoardLayers[key]=[]);
    const n=layers.length+1;
    const size=8;
    const customIndex=layers.filter(l=>l.custom).length;
    const col=customIndex%3,row=Math.floor(customIndex/3);
    // Spawn custom layers in the lower-right area of the wheelbarrow,
    // offsetting each additional layer so it is immediately visible.
    const left=70+(col*9);
    const top=72+(row*10);
    layers.push({
      id:`layer-custom-${now}-${p.id}-${n}`,
      left:Math.max(6,Math.min(94,left)),
      top:Math.max(6,Math.min(94,top)),
      size,
      fixed:false,
      custom:true,
      boardIndex:null
    });
  });
  persistPlayerBoardLayers();
  renderPlayerBoards();
  requestAnimationFrame(()=>{ bindPlayerBoardLayers(); });
}
const directAddPlayerSlotLockButton=document.querySelector('#add-player-slot-lock-direct');
const directSlotLockShapeButton=document.querySelector('#player-slot-lock-shape-direct');
if(directAddPlayerSlotLockButton) directAddPlayerSlotLockButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();addPlayerBoardSlotLock()});
if(directSlotLockShapeButton) directSlotLockShapeButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();playerSlotLockShapeMode=!playerSlotLockShapeMode;directSlotLockShapeButton.textContent=playerSlotLockShapeMode?'Finish slot shape':'Edit slot shape';directSlotLockShapeButton.setAttribute('aria-pressed',String(playerSlotLockShapeMode));surface.classList.toggle('slot-lock-shape-mode',playerSlotLockShapeMode);renderPlayerBoards();});
const addPlayerSlotLockButton=document.querySelector('#add-player-slot-lock');
const playerSlotLockShapeButton=document.querySelector('#player-slot-lock-shape');
if(playerSlotLockShapeButton) playerSlotLockShapeButton.addEventListener('click',()=>{playerSlotLockShapeMode=!playerSlotLockShapeMode; playerSlotLockShapeButton.textContent=playerSlotLockShapeMode?'Finish slot-lock shape':'Edit slot-lock shape'; playerSlotLockShapeButton.setAttribute('aria-pressed',String(playerSlotLockShapeMode)); surface.classList.toggle('slot-lock-shape-mode',playerSlotLockShapeMode); renderPlayerBoards();});
if(addPlayerSlotLockButton)addPlayerSlotLockButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();addPlayerBoardSlotLock()});
const addPlayerLayerButton=document.querySelector('#add-player-layer');
if(addPlayerLayerButton)addPlayerLayerButton.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();addPlayerBoardLayer();});
const playerBoardEditButton=document.querySelector('#player-board-edit');if(playerBoardEditButton)playerBoardEditButton.addEventListener('click',()=>setPlayerBoardEditMode(!playerBoardEditMode));if(playerBoardEditButton){playerBoardEditButton.textContent=playerBoardEditMode?'Exit player-board edit':'Edit player-board';playerBoardEditButton.setAttribute('aria-pressed',String(playerBoardEditMode));playerBoardEditButton.classList.toggle('active',playerBoardEditMode)}
document.querySelector('#add-palace-layer')?.addEventListener('click',addPalaceLayer); document.querySelector('#add-gem-layer')?.addEventListener('click',addGemstoneLayer); moveGemButton?.addEventListener('click',()=>setGemMoveMode(!gemMoveMode)); setGemMoveMode(false);
const hideEditingButton=document.querySelector('#hide-editing-controls');
if(hideEditingButton)hideEditingButton.addEventListener('click',()=>{
  const hidden=surface.classList.toggle('hide-editing-controls');
  hideEditingButton.textContent=hidden?'Show layer controls':'Hide layer controls';
  hideEditingButton.setAttribute('aria-pressed',String(hidden));
  localStorage.setItem('istanbul-hide-editing-controls',hidden?'1':'0');
});
if(localStorage.getItem('istanbul-hide-editing-controls')==='1'&&hideEditingButton){surface.classList.add('hide-editing-controls');hideEditingButton.textContent='Show layer controls';hideEditingButton.setAttribute('aria-pressed','true')}
document.querySelector('#reset-decks')?.addEventListener('click',()=>{localStorage.removeItem('istanbul-component-positions');localStorage.removeItem('istanbul-removed-decks');location.reload()});
document.querySelector('#shuffle')?.addEventListener('click',e=>{e.preventDefault();render({randomize:true});});

/* ---------- Play engine ---------- */

const PLAYER_COLORS=['red','blue','green','yellow'];
const PLAYER_LABELS={red:'Red Merchant',blue:'Blue Merchant',green:'Green Merchant',yellow:'Yellow Merchant'};
// Keep the gameplay goods order identical to the player-board wheelbarrow rows.
// C7–C12 = Heirloom, C13–C18 = Fabric, C19–C24 = Spice, C25–C30 = Fruit.
const GOODS=['heirloom','fabric','spice','fruit'];
const GOOD_LABEL={fabric:'Fabric',spice:'Spice',fruit:'Fruit',heirloom:'Ring',any:'any good'};
const WHEELBARROW_GOOD_ROWS=['heirloom','fabric','spice','fruit'];
const START_ASSISTANTS=4;
const START_CART_CAPACITY=2;
const WIN_RUBIES_DEFAULT=5;
const actionInfo={
  'Fountain':{label:'Return any number of assistants.',type:'fountain'},
  'Wainwright':{label:'Pay 7 Lira for the next cart extension.',type:'wainwright'},
  'Fabric Warehouse':{label:'Fill Fabric to cart capacity.',type:'warehouse',good:'fabric'},
  'Spice Warehouse':{label:'Fill Spice to cart capacity.',type:'warehouse',good:'spice'},
  'Fruit Warehouse':{label:'Fill Fruit to cart capacity.',type:'warehouse',good:'fruit'},
  'Post Office':{label:'Take the 4 uncovered rewards.',type:'post'},
  'Caravansary':{label:'Take 2 Bonus cards, then discard 1.',type:'caravan'},
  'Black Market':{label:'Take 1 non-Ring good and roll 2 dice.',type:'black'},
  'Tea House':{label:'Choose 3–12 and roll 2 dice.',type:'tea'},
  'Large Market':{label:'Sell 1–5 demanded goods.',type:'marketLarge'},
  'Small Market':{label:'Sell 1–5 demanded goods.',type:'marketSmall'},
  'Police Station':{label:'Free your Family Member to another Place.',type:'police'},
  'Sultan’s Palace':{label:'Pay the next goods requirement for a Ruby.',type:'palace'},
  'Small Mosque':{label:'Take the top Small Mosque tile of one colour.',type:'mosqueSmall'},
  'Great Mosque':{label:'Take the top Great Mosque tile of one colour.',type:'mosqueGreat'},
  'Gemstone Dealer':{label:'Pay the biggest uncovered number for a Ruby.',type:'gem'}
};
// Post Office: 4 columns (I–IV), each with an upper and a lower reward, read
// directly off the tile art:
//   I:  Fabric / Spice     II:  2 Lira / 1 Lira
//   III: Ring   / Fruit     IV:  2 Lira / 1 Lira
// (read off the tile art: col I bottom = green Spice, col III bottom = yellow Fruit)
// A Mail indicator covers one space per column; the player receives the OTHER
// (uncovered) one. Indicators start on the upper row, so a fresh Post Office pays
// out the lower row (POST_BOTTOM).
const POST_TOP=[{good:'fabric',n:1},{coins:2},{good:'heirloom',n:1},{coins:2}];
const POST_BOTTOM=[{good:'spice',n:1},{coins:1},{good:'fruit',n:1},{coins:1}];
// Read from the 10 Demand tile faces. Tiles 0-4 = light (Small Market),
// 5-9 = dark (Large Market). This game's colour convention (from the wheelbarrow
// art and the Mosque tiles): blue = Ring/heirloom, red = fabric, GREEN = spice,
// YELLOW = fruit.
const DEMAND_GOODS=[
  ['heirloom','fabric','spice','fruit','fruit'],       // 1  light
  ['heirloom','fabric','fruit','spice','spice'],       // 2  light
  ['spice','spice','spice','fabric','fruit'],          // 3  light
  ['fabric','fruit','fruit','spice','spice'],          // 4  light
  ['heirloom','fruit','fruit','spice','spice'],        // 5  light
  ['spice','heirloom','heirloom','fabric','fabric'],   // 6  dark
  ['heirloom','heirloom','heirloom','fabric','spice'], // 7  dark
  ['fruit','heirloom','heirloom','fabric','fabric'],   // 8  dark
  ['heirloom','heirloom','heirloom','fabric','fruit'], // 9  dark
  ['fabric','heirloom','heirloom','spice','fruit']     // 10 dark
];
const DEMAND_INDICES={small:[0,1,2,3,4],large:[5,6,7,8,9]};
const MARKET_PAYOUT=[0,2,5,9,14,20];
// Mosque tile art: Fabric tile = red ability (dice), Ring tile = blue ability
// (5th Assistant), Spice tile = green ability (Warehouse +1 good), Fruit tile =
// yellow ability (return an Assistant).
const MOSQUE_ABILITY={fabric:'red',heirloom:'blue',spice:'green',fruit:'yellow'};
// Board layout: the Small Mosque holds the Fabric + Spice colour stacks; the
// Great Mosque holds Ring + Fruit. Each stack is one colour at counts 2,3,4,5.
const MOSQUE_STACKS={small:{fabric:[2,3,4,5],spice:[2,3,4,5]},great:{heirloom:[2,3,4,5],fruit:[2,3,4,5]}};
const MOSQUE_OF_GOOD={fabric:'small',spice:'small',heirloom:'great',fruit:'great'};
const MOSQUE_STACK_KEY='istanbul-mosque-stacks-v2';
let mosqueStacks={small:{},great:{}};
let players=[];
const SULTAN_CUBE_KEY='istanbul-sultan-cubes-v1';
let sultanCubes=JSON.parse(localStorage.getItem(SULTAN_CUBE_KEY)||'{}');
let selectedSultanCube=null;
let turn=0,gameOver=false,awaitingAction=false,actionInitiated=false;
let pendingAssistantDrop=false;
let winnerTarget=WIN_RUBIES_DEFAULT;
let lastDiceRoll=null;
let teaTarget=null;
let marketQuantities={fabric:0,spice:0,fruit:0,heirloom:0};
let smallDemandDeck=[],largeDemandDeck=[];
let smallDemandIndex=0,largeDemandIndex=0;
let postCubeSlots=[0,2,4,6];
let palaceRubyIndex=loadPalaceRubyIndex(),gemstoneRubyIndex=0;
let pendingDice=null;
let pendingBonusDiceEffect=null;
let pendingFamilyRewards=[];
let familyActionTarget=null;
let familyActionMode=false;
let familyPlacementMode=false;  // Police Station: player is clicking a board tile to send the Family Member to
let pendingFamilyCatch=null;    // tile the Merchant just moved to — catch other Family members there AFTER the action (phase 4)
let caravanChoice=null;        // null | 'pick' (choosing which revealed card to keep)
let caravanPendingCards=[];    // legacy — kept for older persisted state
let caravanOffer=[];           // the top-2 deck cards revealed for the Caravansary choice
let blackGoodChoice='fabric';   // the non-Ring good picked at the Black Market
// ---- Bonus cards: 26 cards across 10 types (rulebook p.5) ----
const BONUS_DEFS={
  good:      {count:4, name:'Gain 1 good of your choice',                                 phase:'any'},
  lira5:     {count:4, name:'Take 5 Lira',                                                phase:'any'},
  recall:    {count:2, name:'Return 1 Assistant to your Merchant stack',                  phase:'any'},
  family:    {count:2, name:'Send your Family member to the Police Station (take the reward)', phase:'any'},
  move34:    {count:4, name:'Move your Merchant 3 or 4 Places this turn',                 phase:'move'},
  nomove:    {count:2, name:'Do not move — use an Assistant at your current Place again', phase:'move'},
  palace2:   {count:2, name:'Sultan’s Palace: carry out the action twice',           phase:'place', place:'Sultan’s Palace'},
  post2:     {count:2, name:'Post Office: carry out the action twice',                    phase:'place', place:'Post Office'},
  gem2:      {count:2, name:'Gemstone Dealer: carry out the action twice',               phase:'place', place:'Gemstone Dealer'},
  marketflex:{count:2, name:'Small Market: sell any goods for the demanded count',        phase:'place', place:'Small Market'}
};
function makeBonusDeck(){const c=[];Object.entries(BONUS_DEFS).forEach(([t,d])=>{for(let i=0;i<d.count;i++)c.push(`${t}~${i}`)});return shuffle(c)}
function bonusType(id){return String(id).split('~')[0]}
function bonusName(id){return BONUS_DEFS[bonusType(id)]?.name||id}
// Each Bonus-card type has its own face art (…/caravansary-bonus-cards/icon-bonus-card-NN.png).
const BONUS_IMAGE={good:1,lira5:2,move34:3,nomove:4,recall:5,marketflex:6,family:7,post2:8,gem2:9,palace2:10};
function bonusImage(id){const n=BONUS_IMAGE[bonusType(id)]||1;return `assets/cards-review/cards/caravansary-bonus-cards/icon-bonus-card-${String(n).padStart(2,'0')}.png`}
let bonusDeck=makeBonusDeck(),bonusDiscard=[];
let bonusMoveMax=2;        // raised to 4 by a move34 card
let bonusDoubleAction=null;// 'palace2' | 'post2' | 'gem2' while a doubled action is pending
let bonusMarketFlex=false; // marketflex active for the current Small Market sale
let bonusReusePlace=false; // nomove: acting again at the current Place
const gameLog=[];
const diceTray=document.querySelector('#dice-tray');
const turnStatus=document.querySelector('#turn-status'),turnHint=document.querySelector('#turn-hint'),logEl=document.querySelector('#game-log'),boardsEl=document.querySelector('#player-boards'),endTurnBtn=document.querySelector('#end-turn'),actionBtn=document.querySelector('#do-action'),playerCountSelect=document.querySelector('#player-count');

function safeInt(v,d=0){const n=Number(v);return Number.isFinite(n)?Math.trunc(n):d}
function activePlayer(){return players[turn]||null}
function cartCapacity(p){return START_CART_CAPACITY+(p.cartUnlocked||[]).filter(Boolean).length}
function goodsTotal(p){return GOODS.reduce((s,g)=>s+(p.goods[g]||0),0)}
function persistPlayerState(){
  const data={};
  players.forEach(p=>data[p.color]={coins:p.coins,rubies:p.rubies,bonusCards:p.bonusCards,bonusHand:[...(p.bonusHand||[])],yellowRecallUsed:!!p.yellowRecallUsed,greenBonusUsed:!!p.greenBonusUsed,redMosqueUsed:!!p.redMosqueUsed,wainwrightRubyTaken:!!p.wainwrightRubyTaken,cartUnlocked:[...(p.cartUnlocked||[])],goods:{...p.goods},familyPos:p.familyPos,assistants:p.assistants,left:[...(p.left||[])],mosqueTiles:[...(p.mosqueTiles||[])],mosqueCardHand:[...(p.mosqueCardHand||[])],pos:(p._realPos||p.pos)});
  localStorage.setItem('istanbul-player-state',JSON.stringify(data));
}
function loadSavedPlayers(count){
  const savedState=JSON.parse(localStorage.getItem('istanbul-player-state')||'{}');
  return Array.from({length:count},(_,i)=>{
    const color=PLAYER_COLORS[i],s=savedState[color]||{};
    const bonusHand=Array.isArray(s.bonusHand)?s.bonusHand.slice():[];
    const mosqueCardHand=Array.isArray(s.mosqueCardHand)?s.mosqueCardHand.slice():[];
    return {id:i,color,name:PLAYER_LABELS[color],pos:s.pos||'Fountain',assistants:s.assistants??START_ASSISTANTS,left:Array.isArray(s.left)?s.left.slice():[],coins:s.coins??(2+i),rubies:s.rubies??0,bonusCards:bonusHand.length,bonusHand,cartUnlocked:Array.isArray(s.cartUnlocked)?s.cartUnlocked.slice(0,3):[false,false,false],goods:{fabric:0,spice:0,fruit:0,heirloom:0,...(s.goods||{})},familyPos:s.familyPos||'Police Station',mosqueTiles:Array.isArray(s.mosqueTiles)?s.mosqueTiles.slice():[],mosqueCardHand,yellowRecallUsed:!!s.yellowRecallUsed,greenBonusUsed:!!s.greenBonusUsed,redMosqueUsed:!!s.redMosqueUsed,wainwrightRubyTaken:!!s.wainwrightRubyTaken};
  });
}
function addLog(t){gameLog.unshift(t);if(gameLog.length>50)gameLog.length=50}
function addLira(p,n){p.coins+=n;}
function addGood(p,g,n){const cap=cartCapacity(p),before=p.goods[g]||0,after=Math.min(cap,before+n),gain=after-before;p.goods[g]=after;syncSultanCubeToGood(p,g);return gain}
function removeGood(p,g,n){const take=Math.min(p.goods[g]||0,n);p.goods[g]-=take;syncSultanCubeToGood(p,g);return take}
function canPayGoods(p,cost){
  // Specific goods (and coins) must be covered outright.
  for(const [g,n] of Object.entries(cost)){
    if(g==='coins'){ if(p.coins<n) return false; }
    else if(g!=='any'){ if((p.goods[g]||0)<n) return false; }
  }
  // "any" = any mix of goods left over after the specific requirements.
  const anyN=cost.any||0;
  if(anyN>0){
    const spare=GOODS.reduce((s,g)=>s+Math.max(0,(p.goods[g]||0)-(cost[g]||0)),0);
    if(spare<anyN) return false;
  }
  return true;
}
// Pay only the SPECIFIC goods (and coins) of a cost — the "any" portion is handled
// separately by askPalaceAny so the player can pick each one via an icon modal.
function paySpecificGoods(p,cost){
  Object.entries(cost).forEach(([g,n])=>{
    if(g==='coins')p.coins-=n;
    else if(g!=='any'){p.goods[g]-=n;syncSultanCubeToGood(p,g)}
  });
}
function refillGood(p,g){
  if(!p||!Object.prototype.hasOwnProperty.call(p.goods,g))return 0;
  const cap=cartCapacity(p);
  const before=Math.max(0,Number(p.goods[g]||0));
  const after=Math.min(cap,before+Math.max(0,cap-before));
  const gain=after-before;
  p.goods[g]=after;
  // A warehouse action may move ONLY its matching wheelbarrow cube.
  syncSultanCubeToGood(p,g);
  return gain;
}
function persistPlayerRubySlots(){localStorage.setItem(PLAYER_RUBY_SLOT_KEY,JSON.stringify(playerRubySlots))}
function claimPlayerRubySlot(p){
  if(!p)return null;
  ensureRubyLayers();
  const key=String(p.id);
  const claimed=Array.isArray(playerRubySlots[key])?playerRubySlots[key].map(Number).filter(n=>n>=25&&n<=30):[];
  for(let slot=25;slot<=30;slot++){
    if(!claimed.includes(slot)){
      claimed.push(slot);
      playerRubySlots[key]=claimed;
      const layers=playerBoardLayers[key]||[];
      const layer=layers.find(l=>l&&l.ruby===true&&Number(l.boardIndex)===slot);
      if(layer){
        layer.claimed=true;
        // Ruby slots are a dedicated row below the C25–C30 goods row.
        // Never reuse the goods-row geometry for a Ruby token.
        if(!Number.isFinite(Number(layer.left))) layer.left=PLAYER_GRID_X[slot-25];
        if(!Number.isFinite(Number(layer.top)) || Number(layer.top) <= PLAYER_GRID_Y[3]) layer.top=PLAYER_GRID_Y[3];
        if(!Number.isFinite(Number(layer.size))) layer.size=PLAYER_GRID_SIZE;
      }
      persistPlayerRubySlots();
      persistPlayerBoardLayers();
      return slot;
    }
  }
  return null;
}
function addRuby(p,note){p.rubies++;const slot=claimPlayerRubySlot(p);addLog(`${p.name} takes a Ruby${note?` (${note})`:''}${slot?` (player-board slot ${slot})`:''}.`)}
function endGameTrigger(){return players.some(p=>p.rubies>=winnerTarget)}
function prepareNewRoundEnd(){
  if(!endGameTrigger())return false;
  addLog(`A player has reached ${winnerTarget} Rubies. Finish the current round, then determine the winner.`);
  gameOver='round';
  return true;
}
function finalWinner(){
  const sorted=[...players].sort((a,b)=>b.rubies-a.rubies||b.coins-a.coins||goodsTotal(b)-goodsTotal(a)||(b.bonusHand?.length||0)-(a.bonusHand?.length||0));
  return sorted[0];
}

function initMosqueStacks(){
  const saved=JSON.parse(localStorage.getItem(MOSQUE_STACK_KEY)||'null');
  if(saved&&saved.small&&saved.great){
    mosqueStacks={small:{...saved.small},great:{...saved.great}};
    return;
  }
  const count=players.length;
  // Rulebook: 2 players remove the 3- and 5-symbol tiles; 3 players remove the
  // 5-symbol tiles; 4-5 players keep 2,3,4,5. (1 player: treat like 2.)
  const keep=v=>{
    if(count<=2)return v!==3&&v!==5;
    if(count===3)return v!==5;
    return true;
  };
  mosqueStacks={small:{},great:{}};
  Object.entries(MOSQUE_STACKS.small).forEach(([g,vals])=>{mosqueStacks.small[g]=vals.filter(keep)});
  Object.entries(MOSQUE_STACKS.great).forEach(([g,vals])=>{mosqueStacks.great[g]=vals.filter(keep)});
  localStorage.setItem(MOSQUE_STACK_KEY,JSON.stringify(mosqueStacks));
}
function persistMosqueStacks(){localStorage.setItem(MOSQUE_STACK_KEY,JSON.stringify(mosqueStacks))}

function drawBonus(){
  if(!bonusDeck.length&&bonusDiscard.length){bonusDeck=shuffle(bonusDiscard);bonusDiscard=[]}
  return bonusDeck.shift()||null;
}
function takeBonus(p,n=1,fromDiscard=false){
  for(let i=0;i<n;i++){
    const card=fromDiscard?bonusDiscard.pop()||drawBonus():drawBonus();
    if(!card)break;
    p.bonusHand=(p.bonusHand||[]);p.bonusHand.push(card);p.bonusCards=p.bonusHand.length;
  }
}
// Caravansary: reveal the top 2 of the deck; the player keeps 1 (of those 2, or
// the face-up discard-pile top). Whatever revealed deck cards are not kept go onto
// the discard pile; if the discard-top is kept, the revealed cards return to the
// deck. Net +1 card, and both options are seen before choosing.
function caravanReveal(p){
  if(!bonusDeck.length && bonusDiscard.length){bonusDeck=shuffle(bonusDiscard);bonusDiscard=[]}
  const offer=[];
  while(offer.length<2 && bonusDeck.length) offer.push(bonusDeck.shift());
  caravanOffer=offer;
  if(!offer.length && !bonusDiscard.length){
    addLog('No Bonus cards are available at the Caravansary.');
    caravanChoice=null;caravanOffer=[];return false;
  }
  caravanChoice='pick';
  addLog(`${p.name} at the Caravansary — keep 1 of the revealed cards (or the discard-pile top).`);
  return true;
}
function caravanKeep(which){
  const p=activePlayer();
  if(!p||caravanChoice!=='pick')return;
  let kept=null;
  if(String(which).startsWith('discard:')){
    const di=safeInt(String(which).slice('discard:'.length),-1);
    if(di<0||di>=bonusDiscard.length)return;
    kept=bonusDiscard.splice(di,1)[0];
    // the revealed deck cards were not taken — put them back on top of the deck
    bonusDeck.unshift(...caravanOffer);
    addLog(`${p.name} takes "${bonusName(kept)}" from the face-up discard pile.`);
  }else{
    const i=safeInt(String(which).replace('offer:',''),-1);
    if(i<0||i>=caravanOffer.length)return;
    kept=caravanOffer[i];
    const rest=caravanOffer.filter((_,j)=>j!==i);
    bonusDiscard.push(...rest);                 // the card(s) not kept are discarded face-up
    addLog(`${p.name} keeps "${bonusName(kept)}"${rest.length?` and discards "${rest.map(bonusName).join('", "')}"`:''}.`);
  }
  p.bonusHand=(p.bonusHand||[]);p.bonusHand.push(kept);p.bonusCards=p.bonusHand.length;
  caravanOffer=[];caravanChoice=null;
  persistPlayerState();
  finishAction(true);
}
function discardOneBonus(p,cardId){
  const hand=p.bonusHand||[];
  const idx=cardId?hand.indexOf(cardId):0;
  if(idx<0)return false;
  const [card]=hand.splice(idx,1);bonusDiscard.push(card);p.bonusCards=hand.length;return true;
}
// Which Bonus card ids the active player may play right now.
function playableBonusCards(){
  const p=activePlayer();
  if(!p||p.id!==turn||gameOver===true||caravanChoice||pendingGoodChoice||pendingDice||pendingFamilyRewards.length)return [];
  return (p.bonusHand||[]).filter(id=>{
    const d=BONUS_DEFS[bonusType(id)];if(!d)return false;
    if(d.phase==='any')return true;
    if(d.phase==='move')return !awaitingAction && !bonusReusePlace; // movement phase only
    if(d.phase==='place')return awaitingAction && p.pos===d.place && !familyActionMode;
    return false;
  });
}
async function playBonusCard(cardId){
  const p=activePlayer();if(!p||p.id!==turn)return;
  if(!playableBonusCards().includes(cardId))return;
  const type=bonusType(cardId);
  const spend=()=>{discardOneBonus(p,cardId);persistPlayerState()};
  if(type==='lira5'){spend();p.coins+=5;addLog(`${p.name} plays a Bonus card: takes 5 Lira.`);renderAll();return}
  if(type==='good'){
    chooseGood(GOODS,g=>{
      if((p.goods[g]||0)>=cartCapacity(p)){addLog(`${p.name}'s ${GOOD_LABEL[g]} wheelbarrow track is full — pick another.`);return false}
      spend();addGood(p,g,1);addLog(`${p.name} plays a Bonus card: gains 1 ${GOOD_LABEL[g]}.`);
    },{title:'Bonus card — gain 1 good of your choice'});
    return;
  }
  if(type==='recall'){
    if(!p.left.length){addLog(`${p.name} has no Assistants to return.`);return}
    const place=p.left.length===1?p.left[0]:await modalChoice({title:'Return an Assistant to your stack from…',options:p.left.map(pl=>({label:pl,value:pl}))});
    const idx=p.left.indexOf(place);if(idx<0)return;
    spend();p.left.splice(idx,1);p.assistants=Math.min(5,p.assistants+1);
    addLog(`${p.name} plays a Bonus card: returns an Assistant from ${place}.`);renderAll();return;
  }
  if(type==='family'){
    if(p.familyPos==='Police Station'){addLog(`${p.name}'s Family member is already at the Police Station.`);return}
    spend();p.familyPos='Police Station';
    const choice=await modalChoice({title:'Family Member sent to the Police Station — take your reward:',options:[
      {label:'Take 3 Lira',value:'lira',icon:'🪙'},
      {label:'Take 1 Bonus card',value:'bonus',icon:'🃏'}
    ]});
    if(choice==='lira'){p.coins+=3;addLog(`${p.name} plays a Bonus card: Family member to the Police Station, takes 3 Lira.`)}
    else{takeBonus(p,1);addLog(`${p.name} plays a Bonus card: Family member to the Police Station, takes 1 Bonus card.`)}
    persistPlayerState();renderAll();return;
  }
  if(type==='move34'){
    spend();bonusMoveMax=4;addLog(`${p.name} plays a Bonus card: may move 3–4 Places this turn.`);renderAll();return;
  }
  if(type==='nomove'){
    if(p.pos==='Fountain'){addLog('The Fountain action cannot be repeated with this card.');return}
    if(!p.assistants && !p.left.includes(p.pos)){addLog(`${p.name} has no Assistant to use again at ${p.pos}.`);return}
    spend();bonusReusePlace=true;
    awaitingAction=true;actionInitiated=false;pendingAssistantDrop=!p.left.includes(p.pos)&&p.assistants>0;
    beginTileAction(p,p.pos);
    addLog(`${p.name} plays a Bonus card: stays at ${p.pos} and uses an Assistant again.`);
    renderAll();return;
  }
  if(type==='marketflex'){
    spend();bonusMarketFlex=true;
    addLog(`${p.name} plays a Bonus card: may sell any goods at the Small Market.`);renderAll();return;
  }
  if(type==='palace2'||type==='post2'||type==='gem2'){
    spend();bonusDoubleAction=type;
    addLog(`${p.name} plays a Bonus card: will carry out the ${p.pos} action twice.`);renderAll();return;
  }
}
function createDemandDeck(type){return shuffle((DEMAND_INDICES[type]||DEMAND_INDICES.small).slice())}
function currentDemand(type){const deck=type==='small'?smallDemandDeck:largeDemandDeck;const idx=type==='small'?smallDemandIndex:largeDemandIndex;return deck[idx%deck.length]??(DEMAND_INDICES[type]||[0])[0]}
function demandCounts(cardIndex){const out={fabric:0,spice:0,fruit:0,heirloom:0};(DEMAND_GOODS[cardIndex]||[]).forEach(g=>out[g]++);return out}
function advanceDemand(type){if(type==='small')smallDemandIndex=(smallDemandIndex+1)%5;else largeDemandIndex=(largeDemandIndex+1)%5}

const DICE_FACES=['⚀','⚁','⚂','⚃','⚄','⚅'];
function rollDie(){return 1+Math.floor(Math.random()*6)}
function rollDice(){return [rollDie(),rollDie()]}
function ensureDiceOverlay(){
  let overlay=document.querySelector('#board-dice-overlay');
  if(!overlay){overlay=document.createElement('div');overlay.id='board-dice-overlay';document.querySelector('#play-surface')?.append(overlay)}
  return overlay;
}
function showBoardDiceAnimation(dice,caption,showResultText=true){
  const overlay=ensureDiceOverlay();if(!overlay)return;
  clearInterval(showBoardDiceAnimation.timer);clearTimeout(showBoardDiceAnimation.hideTimer);
  let ticks=0;
  const renderFaces=(vals,rolling=true)=>{const resultHtml=showResultText?(`<div class="board-dice-result">${rolling?'Rolling…':`Result: ${vals[0]} + ${vals[1]} = ${vals[0]+vals[1]}`}</div>`):'';overlay.innerHTML=`<div class="board-dice-title">${caption}</div><div class="board-dice-pair">${vals.map((d,i)=>`<span class="board-die" style="--delay:${i*70}ms">${DICE_FACES[d-1]}</span>`).join('')}</div>${resultHtml}`;overlay.classList.add('is-visible');overlay.classList.toggle('is-rolling',rolling)};
  renderFaces([rollDie(),rollDie()],true);
  showBoardDiceAnimation.timer=setInterval(()=>{ticks++;if(ticks>=18){clearInterval(showBoardDiceAnimation.timer);renderFaces(dice,false);showBoardDiceAnimation.hideTimer=setTimeout(()=>overlay.classList.remove('is-visible'),3000);return}renderFaces([rollDie(),rollDie()],true)},120);
}
// Dice modification at the Tea House / Black Market — Red (Fabric) Mosque tile.
// Rulebook: "At the Tea House and the Black Market, you may turn 1 die to '4'
// after the roll OR re-roll both dice (1x)." Reusable every visit; nothing is spent.
// Flow: menu → 'red-effect' (choose the effect).
function applyDiceMod(mode){
  const p=activePlayer();
  if(!p||!pendingDice)return;
  const d=pendingDice;

  if(mode==='keep'){
    d.canModify=false;d.modPhase='done';
    document.querySelector('#dice-mod-ui')?.remove();
    finalizePendingDice();renderAll();return;
  }
  if(mode==='use-red'){
    if(!hasAbility(p,'red')){addLog(`${p.name} does not have the Fabric Mosque tile.`);d.canModify=false;document.querySelector('#dice-mod-ui')?.remove();finalizePendingDice();renderAll();return}
    d.modPhase='red-effect';renderAll();return;
  }
  if(mode==='cancel'){ d.modPhase='menu';renderAll();return; }

  // --- apply the chosen effect (one modification per roll) ---
  if((mode==='reroll'||mode==='set4') && d.modPhase==='red-effect'){
    if(!hasAbility(p,'red'))return;
    if(mode==='reroll'){ d.dice=rollDice(); }
    else { const i=d.dice[0]<=d.dice[1]?0:1; d.dice[i]=4; }
    d.total=d.dice[0]+d.dice[1];
    addLog(`${p.name} uses the Fabric Mosque tile — ${mode==='reroll'?'re-rolls both dice':'turns the lower die to 4'}: now ${d.dice[0]} + ${d.dice[1]} = ${d.total}.`);
    d.canModify=false;d.modPhase='done';
    if(mode==='reroll') showBoardDiceAnimation(d.dice,d.title,d.type!=='tea');
    document.querySelector('#dice-mod-ui')?.remove();
    persistPlayerState();
    finalizePendingDice();renderAll();
  }
}
// legacy shim (some handlers call the old name)
function applyDiceBonusOption(mode){return applyDiceMod(mode)}

// Black Market: the chosen non-Ring good (1) plus Ring goods from the dice total
// (7–8 → 1, 9–10 → 2, 11–12 → 3). Each good has its own wheelbarrow track capped
// at cartCapacity, so a track that is already full simply takes fewer — the log
// reports what actually landed.
function blackMarketPayout(p,ctx){
  const gotGood=ctx.extraGood?addGood(p,ctx.extraGood,1):0;
  const blue=ctx.total>=11?3:ctx.total>=9?2:ctx.total>=7?1:0;
  const gotBlue=blue?addGood(p,'heirloom',blue):0;
  const parts=[];
  if(gotGood)parts.push(`1 ${GOOD_LABEL[ctx.extraGood]}`);
  if(gotBlue)parts.push(`${gotBlue} Ring${gotBlue>1?'s':''}`);
  const lost=(ctx.extraGood&&!gotGood)||(blue&&gotBlue<blue);
  addLog(`${p.name} rolls ${ctx.dice[0]} + ${ctx.dice[1]} = ${ctx.total} at the Black Market and gains ${parts.join(' + ')||'nothing'}${lost?' (wheelbarrow track full — the rest is lost)':''}.`);
}
function finalizePendingDice(){
  const p=activePlayer();if(!pendingDice||!p)return;
  const ctx=pendingDice;pendingDice=null;
  if(ctx.type==='tea'){
    const payout=ctx.total>=ctx.target?ctx.target:2;
    p.coins=Number(p.coins||0)+payout;
    addLog(`${p.name} rolls ${ctx.dice[0]} + ${ctx.dice[1]} = ${ctx.total} at Tea House and receives ${payout} Lira.`);
    persistPlayerState();
  }else if(ctx.type==='black'){
    blackMarketPayout(p,ctx);
  }
  lastDiceRoll={dice:[...ctx.dice],total:ctx.total,caption:ctx.title};
  persistPlayerState();finishAction(true);
}

const POST_KEY='istanbul-post-office-cube-slots-v1';
const POST_DIR_KEY='istanbul-post-office-cube-direction-v1';
postCubeSlots=JSON.parse(localStorage.getItem(POST_KEY)||'null');if(!Array.isArray(postCubeSlots)||postCubeSlots.length!==4)postCubeSlots=[0,2,4,6];
let postCubeDirection=localStorage.getItem(POST_DIR_KEY)||((postCubeSlots.length===4&&[1,3,5,7].every(x=>postCubeSlots.includes(x)))?'up':'down');
function persistPostOfficeState(){localStorage.setItem(POST_KEY,JSON.stringify(postCubeSlots));localStorage.setItem(POST_DIR_KEY,postCubeDirection)}
// Layer indexing: column c's upper space is layer 2c, its lower space is 2c+1.
const postTopSlot=c=>c*2, postBotSlot=c=>c*2+1;
function advancePostOffice(){
  // Rule: move the leftmost Mail indicator that is still in the top row down to
  // the bottom row. If every indicator is already in the bottom row, move them
  // all back to the top row.
  const cols=[0,1,2,3];
  const next=[...postCubeSlots].map(Number);
  if(cols.every(c=>next.includes(postBotSlot(c)))){
    postCubeSlots=cols.map(postTopSlot);
  }else{
    const c=cols.find(col=>next.includes(postTopSlot(col)));
    if(c!==undefined){const i=next.indexOf(postTopSlot(c));next[i]=postBotSlot(c);}
    postCubeSlots=next;
  }
  persistPostOfficeState();
}
function postUncovered(){
  // A Mail indicator in the bottom row covers the lower space → the upper reward
  // (POST_TOP) is uncovered; otherwise the lower reward (POST_BOTTOM) is uncovered.
  return [0,1,2,3].map(col=>{
    const indicatorInBottom=postCubeSlots.includes(postBotSlot(col));
    return indicatorInBottom?POST_TOP[col]:POST_BOTTOM[col];
  });
}

// Sultan's Palace goods track (this tile art): an L of 10 good boxes then the
// Ruby space —
//   1 Ring, 2 Fabric, 3 Spice           (left column, top→bottom)
//   4 Fruit, 5 Any, 6 Ring, 7 Fabric,
//   8 Spice, 9 Fruit, 10 Any             (bottom row, left→right; green=Spice, yellow=Fruit)
//   → Ruby space                         (turns up at the right end)
// Four Rubies cover boxes 8, 9, 10 and the Ruby space. A Ruby is taken from the
// LEFTMOST covered box each turn, exposing 8 → 9 → 10 (the Ruby space adds no
// good). "Any" = 1 good of any type. With no Rubies taken the cost is boxes 1–7,
// which is exactly the rulebook's Sultan's Palace example.
const PALACE_INITIAL_COST={heirloom:2,fabric:2,spice:1,fruit:1,any:1};
const PALACE_COVERED_GOODS=['spice','fruit','any']; // boxes 8,9,10 in exposure order; the 4th Ruby (Ruby space) adds nothing
const PALACE_CUBE_POSITIONS=[
  {left:65.5,top:80.5,good:'spice'}, // box 8
  {left:76.5,top:80.5,good:'fruit'}, // box 9
  {left:86.5,top:80.5,good:'any'},   // box 10
  {left:86.0,top:65.0,good:null}     // Ruby space (right end, one row up)
];
const PALACE_STATE_KEY='istanbul-sultan-palace-state-v2';
function loadPalaceRubyIndex(){
  try{const v=Number(JSON.parse(localStorage.getItem(PALACE_STATE_KEY)||'0'));return Number.isInteger(v)&&v>=0&&v<=PALACE_CUBE_POSITIONS.length?v:0}catch(_){return 0}
}
function persistPalaceRubyIndex(){localStorage.setItem(PALACE_STATE_KEY,JSON.stringify(palaceRubyIndex))}
function formatGoodsCost(cost){
  return Object.entries(cost).map(([g,n])=>{
    if(g==='coins')return `${n} Lira`;
    if(g==='any')return n===1?'1 good of any type':`${n} goods of any type`;
    return `${n} ${GOOD_LABEL[g]}`;
  }).join(', ');
}
function palaceCostForIndex(index=palaceRubyIndex){
  const cost={...PALACE_INITIAL_COST};
  // Each Ruby taken exposes the next covered box, left to right (8 → 9 → 10).
  for(let i=0;i<index;i++){
    const good=PALACE_COVERED_GOODS[i];
    if(good)cost[good]=(cost[good]||0)+1;
  }
  return cost;
}
function renderSultanPalaceCubes(){
  document.querySelectorAll('.sultan-palace-requirement-cubes').forEach(host=>{
    host.innerHTML=PALACE_CUBE_POSITIONS.map((pos,i)=>{
      // Rubies are taken from the left of the covered group first, so the
      // leftmost covered box (index 0) is the first to be exposed.
      if(i<palaceRubyIndex)return '';
      const label=!pos.good?'the Ruby space':pos.good==='any'?'a good of any type':`the ${GOOD_LABEL[pos.good]}`;
      return `<div class="sultan-palace-requirement-ruby" style="--palace-req-left:${pos.left}%;--palace-req-top:${pos.top}%" title="Sultan’s Palace Ruby on ${label}"><img src="assets/ruby.png" alt="Sultan’s Palace Ruby on ${label}" draggable="false"></div>`;
    }).join('');
  });
}
// Gemstone Dealer track: 12 numbered spaces (12…23), one Ruby on each at setup.
// Each purchase pays the biggest number not covered by a Ruby, then removes the
// lowest remaining Ruby — so successive purchases cost 12, 13, 14, … 23.
const GEMSTONE_VALUES=[12,13,14,15,16,17,18,19,20,21,22,23];

function remainingGemValue(){return GEMSTONE_VALUES[gemstoneRubyIndex]??null}
function gemRubyAvailableSlot(p){
  if(!p)return null;
  const key=String(p.id);
  const claimed=Array.isArray(playerRubySlots[key])?playerRubySlots[key].map(Number).filter(n=>n>=25&&n<=30):[];
  for(let slot=25;slot<=30;slot++) if(!claimed.includes(slot)) return slot;
  return null;
}
function hideGemRubyLayer(indexFromTop){
  try{
    ensureGemstoneTrackLayers();
    const layer=gemstoneLayers.find(l=>Number(l.trackIndex)===indexFromTop+1 && l.ruby===true);
    if(layer){layer.claimed=true;layer.opacity=0.2;persistGemstoneLayers();return true;}
  }catch(_){}
  return false;
}
function renderGemClaims(){try{const host=document.querySelector('.gemstone-layer-host');if(!host)return;host.querySelectorAll('.gemstone-board-layer').forEach(el=>{const l=gemstoneLayers.find(x=>x.id===el.dataset.gemLayerId);if(l?.claimed){el.style.opacity='0.2';el.querySelector('.gem-track-ruby-3d')?.remove();el.querySelector('.gem-ruby-number')?.remove()}})}catch(_){}}
function resolveGemstone(p){
  const cost=remainingGemValue();
  if(cost===null){addLog('No Gemstones remain on the track.');return false}
  const rubySlot=gemRubyAvailableSlot(p);
  if(!rubySlot){addLog(`${p.name} cannot take another Ruby: all player-board Ruby slots 25–30 are occupied.`);return false}
  // Not enough money: leave the action open so the player can gather Lira and retry
  // (matches resolvePalace), instead of silently consuming the turn.
  if(Number(p.coins||0)<cost){addLog(`${p.name} needs ${cost} Lira for the next Gemstone Dealer Ruby.`);return false}
  // The purchase is atomic: verify both payment and a free dedicated Ruby slot
  // before changing either the player's money or the dealer's Ruby supply.
  p.coins=Number(p.coins||0)-cost;
  const removed=hideGemRubyLayer(gemstoneRubyIndex);
  if(!removed){
    p.coins+=cost;
    addLog('The Gemstone Dealer Ruby could not be removed from the track. Purchase cancelled.');
    return false;
  }
  gemstoneRubyIndex++;
  const slot=claimPlayerRubySlot(p);
  if(!slot){
    // Defensive rollback: never leave the player charged without a Ruby.
    p.coins+=cost;
    gemstoneRubyIndex=Math.max(0,gemstoneRubyIndex-1);
    const layer=gemstoneLayers.find(l=>Number(l.trackIndex)===gemstoneRubyIndex+1 && l.ruby===true);
    if(layer){layer.claimed=false;delete layer.opacity;persistGemstoneLayers();}
    addLog('The Ruby could not be placed on the player board. Purchase cancelled.');
    return false;
  }
  p.rubies=Number(p.rubies||0)+1;
  addLog(`${p.name} takes a Ruby (Gemstone Dealer, ${cost} Lira) and places it on player-board Ruby slot ${slot}.`);
  persistPlayerState();
  return true;
}
let pendingPalaceAny=false;  // true while the player is picking "any" goods to pay
function resolvePalace(p){
  if(pendingPalaceAny)return false;
  if(palaceRubyIndex>=PALACE_CUBE_POSITIONS.length){
    addLog('No Rubies remain at the Sultan’s Palace.');
    return false;
  }
  const cost=palaceCostForIndex();
  if(!canPayGoods(p,cost)){
    addLog(`${p.name} needs ${formatGoodsCost(cost)} for the next Sultan’s Palace Ruby.`);
    return false;
  }
  paySpecificGoods(p,cost);
  const anyN=cost.any||0;
  if(anyN>0){ askPalaceAny(p,anyN); return false; }
  completePalaceRuby(p);
  return true;
}
function completePalaceRuby(p){
  palaceRubyIndex++;
  persistPalaceRubyIndex();
  addRuby(p,'Sultan’s Palace');
  persistPlayerState();
  renderSultanPalaceCubes();
}
async function askPalaceAny(p,n){
  pendingPalaceAny=true;
  for(let k=n;k>0;k--){
    const held=GOODS.filter(g=>(p.goods[g]||0)>0);
    if(!held.length)break;
    const g=held.length===1?held[0]:await modalChoice({
      title:`Sultan’s Palace — hand over 1 good of any type${n>1?` (${k} left)`:''}`,
      options:held.map(x=>({label:`${GOOD_LABEL[x]} (${p.goods[x]})`,value:x,img:GOOD_ICON(x)}))
    });
    p.goods[g]--;syncSultanCubeToGood(p,g);
  }
  pendingPalaceAny=false;
  completePalaceRuby(p);
  persistPlayerState();
  finishAction(true);
}
function unlockCartSlot(p){
  const idx=p.cartUnlocked.findIndex(v=>!v);if(idx<0){addLog('All 3 wheelbarrow extensions are already unlocked.');return true}
  // Can't afford it yet: keep the action open to gather Lira and retry.
  if(p.coins<7){addLog(`${p.name} needs 7 Lira for the next wheelbarrow extension.`);return false}
  p.coins-=7;p.cartUnlocked[idx]=true;addLog(`${p.name} buys wheelbarrow extension ${idx+1} for 7 Lira.`);
  // Each player takes their own Wainwright Ruby, once, for completing the 3rd extension.
  if(idx===2&&!p.wainwrightRubyTaken){p.wainwrightRubyTaken=true;addRuby(p,'completing the wheelbarrow');}
  persistPlayerState();return true;
}

function mosqueCardImage(mosque,color,req){return `assets/cards-review/cards/mosque-tiles/mosque-tile-${color}-${req}-goods.jpg`}
function mosqueCardId(mosque,color,req){return `${mosque}|${color}|${req}`}
function parseMosqueCardId(id){const [mosque,color,req]=String(id).split('|');return {mosque,color,req:Number(req)}}
function hasMatchingMosquePair(p,mosque){
  // Rule: own one tile of EACH of that Mosque's two colours (any counts).
  const colors=Object.keys(MOSQUE_STACKS[mosque]||{});
  if(colors.length!==2)return false;
  const hand=(p.mosqueCardHand||[]).map(parseMosqueCardId);
  return colors.every(color=>hand.some(c=>c.mosque===mosque&&c.color===color));
}
function tryClaimMosqueRuby(p,mosque){
  // "As soon as you have both tiles of the same Mosque, take 1 Ruby from that Mosque."
  const marker=`ruby-set-${mosque}`;
  p.mosqueTiles=Array.isArray(p.mosqueTiles)?p.mosqueTiles:[];
  if(p.mosqueTiles.includes(marker))return false;
  if(!hasMatchingMosquePair(p,mosque))return false;
  p.mosqueTiles.push(marker);
  addRuby(p,`${mosque==='small'?'Small':'Great'} Mosque set`);
  return true;
}
function acquireMosque(p,mosque,color){
  const stack=mosqueStacks[mosque]?.[color]||[];const req=stack[0];
  if(!req){addLog(`No ${GOOD_LABEL[color]} tile remains at the ${mosque} Mosque.`);return false}
  const cardKey=mosqueCardId(mosque,color,req);
  if((p.mosqueCardHand||[]).some(id=>{const c=parseMosqueCardId(id);return c.mosque===mosque&&c.color===color;})){addLog(`${p.name} already owns the ${GOOD_LABEL[color]} ${mosque} Mosque tile.`);return false}
  if((p.goods[color]||0)<req){addLog(`${p.name} needs ${req} ${GOOD_LABEL[color]} for this Mosque tile.`);return false}
  // Rule: your Wheelbarrow must CARRY the depicted quantity (req), but you only
  // PAY 1 good of that colour to take the tile.
  removeGood(p,color,1);
  stack.shift();persistMosqueStacks();
  p.mosqueTiles=Array.isArray(p.mosqueTiles)?p.mosqueTiles:[];p.mosqueTiles.push(cardKey);
  p.mosqueCardHand=Array.isArray(p.mosqueCardHand)?p.mosqueCardHand:[];p.mosqueCardHand.push(cardKey);
  const ability=MOSQUE_ABILITY[color];
  addLog(`${p.name} buys the ${mosque} ${GOOD_LABEL[color]} Mosque tile (${req} goods requirement).`);
  if(ability==='blue'){
    const total=p.assistants+(p.left?.length||0);
    if(total<5){p.assistants++;addLog(`${p.name} gains the 5th Assistant from the Blue Mosque tile.`)}
  }
  tryClaimMosqueRuby(p,mosque);
  persistPlayerState();renderDecks();return true;
}

function hasAbility(p,ability){
  return (p?.mosqueCardHand||[]).some(id=>{
    const c=parseMosqueCardId(id);
    return MOSQUE_ABILITY[c.color]===ability;
  });
}
function useYellowRecall(p,index){
  if(!hasAbility(p,'yellow')||p.yellowRecallUsed||p.coins<2||!p.left.length)return false;
  const idx=Math.max(0,Math.min(p.left.length-1,safeInt(index,0)));
  const place=p.left[idx];
  p.coins-=2;p.left.splice(idx,1);p.assistants=Math.min(5,p.assistants+1);p.yellowRecallUsed=true;
  addLog(`${p.name} uses the Yellow Mosque ability to recall an Assistant from ${place}.`);
  persistPlayerState();renderAll();return true;
}
function performGreenBonus(p){
  if(!hasAbility(p,'green')||p.greenBonusUsed||p.coins<2)return;
  chooseGood(GOODS,good=>{
    if((p.goods[good]||0)>=cartCapacity(p)){addLog(`${p.name} cannot gain another ${GOOD_LABEL[good]} — that track is full, pick another.`);return false;}
    p.coins-=2;p.greenBonusUsed=true;addGood(p,good,1);
    addLog(`${p.name} pays 2 Lira (Spice Mosque tile) for 1 additional ${GOOD_LABEL[good]}.`);
    persistPlayerState();
    if(awaitingAction&&actionInitiated&&actionInfo[p.pos]?.type==='warehouse')finishAction(true);
  },{title:'Spice Mosque tile — 1 extra good for 2 Lira'});
}
// ---- In-page choice modal (replaces window.confirm / window.prompt) ----
// options: [{label, value, img?, icon?}]. Resolves to the chosen value. No dismiss.
function modalChoice({title='Choose',options=[]}={}){
  return new Promise(resolve=>{
    document.querySelector('#choice-modal-backdrop')?.remove();
    const back=document.createElement('div');
    back.id='choice-modal-backdrop';back.className='choice-modal-backdrop';
    back.innerHTML=`<div class="choice-modal" role="dialog" aria-modal="true"><h3>${title}</h3><div class="choice-modal-opts">${
      options.map((o,i)=>`<button type="button" class="choice-modal-btn" data-i="${i}">${o.img?`<img src="${o.img}" alt="">`:o.icon?`<span class="choice-modal-emoji">${o.icon}</span>`:''}<span>${o.label}</span></button>`).join('')
    }</div></div>`;
    document.body.append(back);
    const finish=v=>{back.remove();resolve(v)};
    back.querySelectorAll('.choice-modal-btn').forEach(b=>b.onclick=()=>finish(options[Number(b.dataset.i)].value));
    back.querySelector('.choice-modal-btn')?.focus();
  });
}
// ---- Good-choice by icon (no typing) ----
const GOOD_ICON=g=>`assets/goods/good-${g}.png`;
function goodPickButtons(options){return options.map(g=>`<button type="button" class="good-pick" data-good="${g}" title="${GOOD_LABEL[g]}"><img src="${GOOD_ICON(g)}" alt="${GOOD_LABEL[g]}"><span>${GOOD_LABEL[g]}</span></button>`).join('')}
let pendingGoodChoice=null; // {options:[...], cb:fn, title:str}
function chooseGood(options,cb,opts={}){pendingGoodChoice={options:options.slice(),cb,title:opts.title||'Choose a good'};renderAll()}
function resolveGoodChoice(g){const pc=pendingGoodChoice;if(!pc||!pc.options.includes(g))return;const keep=pc.cb(g);if(keep!==false)pendingGoodChoice=null;renderAll()}

function renderActionUI(){
  const p=activePlayer();
  if(!p||!awaitingAction){ if(typeof diceTray!=='undefined'&&diceTray){diceTray.innerHTML='';diceTray.classList.remove('has-roll');} return; }
  const actionPlace=familyActionMode&&familyActionTarget?familyActionTarget:p.pos;
  const info=actionInfo[actionPlace];if(!info)return;
  if(info.type==='tea'){
    if(pendingDice){
      // The roll/status stays here; any dice-modification controls render in the turn-actions area.
      diceTray.innerHTML=`<span class="dice-caption">Tea House rolled ${pendingDice.dice[0]} + ${pendingDice.dice[1]} = ${pendingDice.total}${pendingDice.canModify?' — choose a dice option below.':'.'}</span>`;
      diceTray.classList.add('has-roll');
    }else{
      const n=teaTarget??6;diceTray.innerHTML=`<span class="dice-caption">Tea House target</span><input id="tea-target" class="tea-target" type="number" min="3" max="12" value="${n}"><button type="button" id="roll-tea">Roll Dice</button>`;diceTray.classList.add('has-roll');
    }
  }else if(info.type==='black'){
    const opts=['fabric','spice','fruit'];
    if(!opts.includes(blackGoodChoice))blackGoodChoice='fabric';
    const picks=opts.map(g=>`<button type="button" class="good-pick ${g===blackGoodChoice?'is-selected':''}" data-black-good="${g}" title="${GOOD_LABEL[g]}"><img src="${GOOD_ICON(g)}" alt="${GOOD_LABEL[g]}"><span>${GOOD_LABEL[g]}</span></button>`).join('');
    diceTray.innerHTML=`<span class="dice-caption">Take 1 good of your choice:</span><div class="good-pick-row">${picks}</div><span class="dice-caption">then <strong>Do action at Black Market</strong> rolls 2 dice — 7–8 → 1 Ring · 9–10 → 2 · 11–12 → 3.</span>`;diceTray.classList.add('has-roll');
  }else if(info.type==='marketSmall'||info.type==='marketLarge'){
    const type=info.type==='marketSmall'?'small':'large',idx=currentDemand(type);const img=marketDeckImage(type);const need=demandCounts(idx);
    const flex=bonusMarketFlex&&type==='small';
    if(!actionInitiated){
      diceTray.innerHTML=`<img src="${img}" alt="Demand tile" style="width:52px;height:76px;object-fit:cover;border-radius:6px"><span class="dice-caption">Press <strong>Do action at ${type==='small'?'Small':'Large'} Market</strong> to sell.</span>`;
    }else{
      const goodsList=flex?GOODS:GOODS.filter(g=>(need[g]||0)>0);
      const rows=goodsList.map(g=>{const cap=flex?Math.min(5,p.goods[g]||0):Math.min(need[g]||0,p.goods[g]||0);return `<label style="display:flex;align-items:center;gap:4px">${GOOD_LABEL[g]} <span class="dice-caption">${flex?'':`(demand ${need[g]})`}</span> <input class="market-q" data-good="${g}" type="number" min="0" max="${cap}" value="${Math.min(marketQuantities[g]||0,cap)}" style="width:46px"></label>`}).join('');
      const demanded=GOODS.reduce((s,g)=>s+(need[g]||0),0);
      diceTray.innerHTML=`<img src="${img}" alt="Demand tile" style="width:52px;height:76px;object-fit:cover;border-radius:6px"><span class="dice-caption">${flex?`Bonus card: sell exactly ${demanded} goods, any types.`:'Sell 1–5 goods shown on this demand tile.'}</span>${rows}<button type="button" id="sell-market">Sell</button>`;
    }
    diceTray.classList.add('has-roll');
  }else if(info.type==='mosqueSmall'||info.type==='mosqueGreat'){
    const mosque=info.type==='mosqueSmall'?'small':'great';
    const colors=Object.keys(mosqueStacks[mosque]||{});
    const preview=colors.map(g=>{
      const req=mosqueStacks[mosque][g]?.[0];
      if(!req)return '';
      const affordable=(p.goods[g]||0)>=req;
      return `<button type="button" class="mosque-top-card ${affordable?'':'is-unaffordable'}" data-mosque="${mosque}" data-good="${g}" ${affordable?'':'disabled'}><img src="${mosqueCardImage(mosque,g,req)}" alt="${mosque} ${GOOD_LABEL[g]} top card"><span>${GOOD_LABEL[g]} · ${req} goods</span></button>`;
    }).join('');
    diceTray.innerHTML=`<span class="dice-caption">Select one of the two top ${mosque} Mosque cards.</span><div class="mosque-top-cards">${preview}</div>`;diceTray.classList.add('has-roll');
  }else if(info.type==='fountain'){
    const opts=players.length&&p.left.length?p.left.map(name=>`<label style="display:block"><input type="checkbox" class="fountain-pick" value="${name}"> ${name}</label>`).join(''):'<span class="dice-caption">No Assistants are away.</span>';diceTray.innerHTML=`<div><strong>Return Assistants</strong>${opts}</div><button type="button" id="return-fountain">Return selected</button>`;diceTray.classList.add('has-roll');
  }else if(info.type==='post'){
    const r=postUncovered();diceTray.innerHTML=`<span class="dice-caption">Uncovered: ${r.map(x=>x.coins?`${x.coins} Lira`:GOOD_LABEL[x.good]).join(', ')}</span>`;diceTray.classList.add('has-roll');
  }else if(info.type==='caravan'){
    if(caravanChoice==='pick'){
      const offerBtns=caravanOffer.map((id,i)=>`<button type="button" class="caravan-source is-deck" data-caravan-keep="offer:${i}" title="${bonusName(id)} — from the deck"><img src="${bonusImage(id)}" alt="${bonusName(id)}"><span>Deck card ${i+1}</span></button>`).join('');
      const discBtns=bonusDiscard.map((id,i)=>`<button type="button" class="caravan-source is-discard" data-caravan-keep="discard:${i}" title="${bonusName(id)} — from the discard pile"><img src="${bonusImage(id)}" alt="${bonusName(id)}"><span>Discard${i===bonusDiscard.length-1?' (top)':''}</span></button>`).join('');
      diceTray.innerHTML=`<span class="dice-caption">Caravansary — take 1 card into your hand: the top ${caravanOffer.length} of the deck${bonusDiscard.length?`, or any of the ${bonusDiscard.length} face-up discard-pile cards`:''}.</span><div class="caravan-source-choices">${offerBtns}${discBtns}</div><span class="dice-caption">Revealed deck cards you don't keep go to the discard pile.</span>`;
    }else{
      diceTray.innerHTML=`<span class="dice-caption">Press <strong>Do action at Caravansary</strong> to reveal the top 2 Bonus cards.</span>`;
    }
    diceTray.classList.add('has-roll');
  }else if(info.type==='palace'){
    if(palaceRubyIndex>=PALACE_CUBE_POSITIONS.length){
      diceTray.innerHTML='<span class="dice-caption">No Rubies remain at the Sultan’s Palace.</span>';
    }else{
      const c=palaceCostForIndex();
      diceTray.innerHTML=`<span class="dice-caption">Next Ruby costs: ${formatGoodsCost(c)}</span>`;
    }
    diceTray.classList.add('has-roll');
  }else if(info.type==='gem'){
    const c=remainingGemValue();diceTray.innerHTML=`<span class="dice-caption">Next Ruby price: ${c??'none'} Lira</span>`;diceTray.classList.add('has-roll');
  }else if(info.type==='wainwright'){
    diceTray.innerHTML=`<span class="dice-caption">Wheelbarrow: ${p.cartUnlocked.filter(Boolean).length}/3 extensions unlocked. Cost: 7 Lira.</span>`;diceTray.classList.add('has-roll');
  }else if(info.type==='warehouse'){
    const g=info.good;diceTray.innerHTML=`<span class="dice-caption">${GOOD_LABEL[g]}: ${p.goods[g]||0}/${cartCapacity(p)}</span>${hasAbility(p,'green')?'<button type="button" id="green-bonus">Use Green Mosque: +1 good for 2 Lira</button>':''}`;diceTray.classList.add('has-roll');
  }else if(info.type==='police'){
    if(familyPlacementMode){diceTray.innerHTML=`<span class="dice-caption">Click a highlighted tile to send your Family Member there — you then carry out that Place's action (no encounters).</span>`;diceTray.classList.add('has-roll')}
    else diceTray.innerHTML=`<span class="dice-caption">Press <strong>Do action at Police Station</strong> to free your Family Member.</span>`;
  }else diceTray.classList.remove('has-roll');
}

function beginTileAction(p,name){teaTarget=null;lastDiceRoll=null;pendingDice=null;pendingBonusDiceEffect=null;blackGoodChoice='fabric';marketQuantities={fabric:0,spice:0,fruit:0,heirloom:0};if(name==='Tea House')teaTarget=6}

function resolveCore(p,name,{skipEncounters=false}={}){
  const info=actionInfo[name];if(!info)return true;const type=info.type;
  if(type==='warehouse'){const gain=refillGood(p,info.good);addLog(`${p.name} fills ${GOOD_LABEL[info.good]} by ${gain} to ${cartCapacity(p)}.`);return true}
  if(type==='wainwright')return unlockCartSlot(p);
  if(type==='post'){
    // The player takes every currently-uncovered reward (one per column), then
    // the shared mail marker advances one step.
    const uncovered = postUncovered();
    uncovered.forEach(r=>{ if(r.coins) p.coins=Number(p.coins||0)+r.coins; else addGood(p,r.good,r.n); });
    advancePostOffice();
    addLog(`${p.name} takes the Post Office rewards: ${uncovered.map(r=>r.coins?`${r.coins} Lira`:`1 ${GOOD_LABEL[r.good]}`).join(', ')}.`);
    persistPostOfficeState();
    persistPlayerState();
    render({randomize:false});
    return true;
  }
  if(type==='caravan'){
    caravanPendingCards=[];caravanOffer=[];
    if(!caravanReveal(p))return true;
    persistPlayerState();
    return false;
  }
  if(type==='fountain')return false;
  if(type==='palace')return resolvePalace(p);
  if(type==='gem')return resolveGemstone(p);
  if(type==='mosqueSmall'||type==='mosqueGreat')return false;
  if(type==='tea'){
    if(!pendingDice){
      const target=safeInt(document.querySelector('#tea-target')?.value??teaTarget,teaTarget??6);
      if(target<3||target>12){addLog('Tea House target must be 3–12.');return false}
      teaTarget=target;
      const dice=rollDice();
      const redMod=hasAbility(p,'red');
      pendingDice={type:'tea',target,dice,total:dice[0]+dice[1],title:'Tea House',canModify:redMod,modPhase:'menu'};
      showBoardDiceAnimation(dice,'Tea House',false);
      if(!pendingDice.canModify)finalizePendingDice();else renderAll();
    }
    return false;
  }
  if(type==='black'){
    if(!pendingDice){
      const good=['fabric','spice','fruit'].includes(blackGoodChoice)?blackGoodChoice:'fabric';const dice=rollDice();
      const redMod=hasAbility(p,'red');
      pendingDice={type:'black',extraGood:good,dice,total:dice[0]+dice[1],title:'Black Market',canModify:redMod,modPhase:'menu'};
      showBoardDiceAnimation(dice,'Black Market');
      if(!pendingDice.canModify)finalizePendingDice();else renderAll();
    }
    return false;
  }
  if(type==='marketSmall'||type==='marketLarge'){
    const market=type==='marketSmall'?'small':'large';const need=demandCounts(currentDemand(market));const flex=bonusMarketFlex&&market==='small';const qs={...marketQuantities};let count=0;
    document.querySelectorAll('.market-q').forEach(i=>{const g=i.dataset.good;qs[g]=Math.max(0,Math.min(5,p.goods[g]||0,safeInt(i.value,0)));i.value=String(qs[g]);count+=qs[g]});
    if(count<1||count>5){addLog('Choose between 1 and 5 goods to sell.');return false}
    if(GOODS.some(g=>qs[g]>(p.goods[g]||0))){addLog('You cannot sell more goods than you carry.');return false}
    if(flex){
      // Bonus card: sell the demanded NUMBER of goods, any types.
      const demanded=GOODS.reduce((s,g)=>s+(need[g]||0),0);
      if(count!==demanded){addLog(`With this Bonus card you must sell exactly ${demanded} goods (any types).`);return false}
    }else if(GOODS.some(g=>qs[g]>(need[g]||0))){
      // Only the goods depicted on the current demand tile may be sold, up to the count shown.
      addLog('You can only sell goods shown on the current Market demand tile, up to the amount depicted.');return false;
    }
    GOODS.forEach(g=>{p.goods[g]-=qs[g];syncSultanCubeToGood(p,g)});p.coins+=MARKET_PAYOUT[count];advanceDemand(market);marketQuantities={fabric:0,spice:0,fruit:0,heirloom:0};bonusMarketFlex=false;addLog(`${p.name} sells ${count} goods at the ${market==='small'?'Small':'Large'} Market for ${MARKET_PAYOUT[count]} Lira.`);persistPlayerState();renderDecks();return true;
  }
  // (Police Station is handled entirely in performAction / onTileClick via familyPlacementMode.)
  return true;
}

function finishAction(placeAssistant=false){
  const p=activePlayer();
  if(placeAssistant && pendingAssistantDrop && p && p.pos!=='Fountain' && p.assistants>0 && !p.left.includes(p.pos)){
    p.assistants--;
    p.left.push(p.pos);
    addLog(`${p.name} completes the action at ${p.pos} and leaves an Assistant there.`);
  }
  pendingAssistantDrop=false;
  document.querySelector('#board-dice-overlay')?.classList.remove('is-visible');
  clearInterval(showBoardDiceAnimation.timer);clearTimeout(showBoardDiceAnimation.hideTimer);
  document.querySelector('#dice-mod-ui')?.remove();
  pendingDice=null;pendingBonusDiceEffect=null;bonusMarketFlex=false;
  // "Carry out the action twice" Bonus card: replay the same Place action once more.
  const doubleMatch={palace2:'Sultan’s Palace',post2:'Post Office',gem2:'Gemstone Dealer'}[bonusDoubleAction];
  if(doubleMatch && p && p.pos===doubleMatch && !familyActionMode && !pendingFamilyRewards.length){
    bonusDoubleAction=null;
    awaitingAction=true;actionInitiated=false;
    beginTileAction(p,p.pos);
    addLog(`${p.name} carries out the ${p.pos} action a second time (Bonus card).`);
    renderAll();
    return;
  }
  bonusDoubleAction=null;bonusReusePlace=false;bonusMoveMax=2;
  // Family Member action done: put the merchant back where it really is.
  if(p&&p._realPos){p.pos=p._realPos;delete p._realPos;}
  awaitingAction=false;actionInitiated=true;familyActionMode=false;familyActionTarget=null;familyPlacementMode=false;teaTarget=null;marketQuantities={fabric:0,spice:0,fruit:0,heirloom:0};caravanChoice=null;caravanPendingCards=[];caravanOffer=[];persistPlayerState();
  // Phase 4: now that the action is finished, catch any other Family members on the tile you moved to.
  if(pendingFamilyCatch){const at=pendingFamilyCatch;pendingFamilyCatch=null;const mv=activePlayer();if(mv)afterMoveFamilyEncounters(at,mv);}
  if(endGameTrigger()&&!gameOver)addLog('The game is entering the final round after this turn.');
  resolvePendingFamilyRewards();
}
function resolvePendingFamilyRewards(){
  if(pendingFamilyRewards.length){renderAll();return}
  if(gameOver==='round'&&turn===0){const w=finalWinner();gameOver=true;addLog(`🏆 ${w.name} wins with ${w.rubies} Rubies.`)}else nextTurn();
}
function showFamilyRewardUI(){
  const p=activePlayer();if(!p||!pendingFamilyRewards.length)return;
  const target=pendingFamilyRewards[0];const panel=document.querySelector('.turn-actions');if(!panel)return;
  const existing=document.querySelector('#family-reward-ui');existing?.remove();const el=document.createElement('div');el.id='family-reward-ui';el.innerHTML=`<span>Family Member caught: ${target}. Reward:</span> <button type="button" data-family-reward="bonus">1 Bonus card</button> <button type="button" data-family-reward="lira">3 Lira</button>`;panel.append(el);
  el.querySelectorAll('[data-family-reward]').forEach(b=>b.onclick=()=>{const choice=b.dataset.familyReward;if(choice==='bonus')takeBonus(p,1);else p.coins+=3;addLog(`${p.name} takes ${choice==='bonus'?'1 Bonus card':'3 Lira'} for catching ${target}'s Family Member.`);pendingFamilyRewards.shift();persistPlayerState();el.remove();if(pendingFamilyRewards.length)showFamilyRewardUI();else resolvePendingFamilyRewards()});
}
function afterMoveFamilyEncounters(location,p){
  pendingFamilyRewards=players.filter(q=>q!==p&&q.familyPos===location&&location!=='Police Station').map(q=>{q.familyPos='Police Station';return q.name});
  if(pendingFamilyRewards.length)showFamilyRewardUI();
}

function performAction(){
  if(gameOver===true||!awaitingAction)return;const p=activePlayer();if(!p)return;
  const info=actionInfo[p.pos];if(!info)return;
  if(caravanChoice||pendingGoodChoice||pendingPalaceAny)return;
  const startingAction=!actionInitiated;
  actionInitiated=true;
  if((info.type==='marketSmall'||info.type==='marketLarge')&&startingAction){renderAll();return}
  if(info.type==='fountain'){
    const selected=[...document.querySelectorAll('.fountain-pick:checked')].map(x=>x.value);p.left=p.left.filter(x=>!selected.includes(x));p.assistants=Math.min(5,p.assistants+selected.length);addLog(`${p.name} returns ${selected.length} Assistant${selected.length===1?'':'s'} at the Fountain.`);finishAction(false);return;
  }
  if(info.type==='mosqueSmall'||info.type==='mosqueGreat'){
    // Selection buttons complete the action themselves.
    return;
  }
  if(info.type==='caravan'){if(caravanChoice)return;resolveCore(p,p.pos);renderAll();return}
  if(info.type==='police'&&p.familyPos!=='Police Station'){
    addLog(`${p.name}'s Family member is not at the Police Station, so there is nothing to free.`);
    actionInitiated=false;renderAll();return;
  }
  if(info.type==='police'){
    // Free the Family Member: enter tile-pick mode. onTileClick(name) sends it.
    familyPlacementMode=true;renderAll();return;
  }
  if((info.type==='tea'||info.type==='black')&&pendingDice){
    if(pendingDice.canModify){renderAll();return}
    finalizePendingDice();return;
  }
  const ok=resolveCore(p,p.pos);if(ok===false){
    // A Palace / Gemstone Dealer / Wainwright purchase can fail because the player
    // lacks the required goods or Lira; keep the action open (and re-enable the
    // Do-action button) so they can gather resources and try again this turn.
    if(info.type==='palace'||info.type==='gem'||info.type==='wainwright')actionInitiated=false;
    renderAll();return;
  }
  if(info.type==='warehouse'&&hasAbility(p,'green')){renderAll();return}
  finishAction(true);
}

function nextTurn(){
  if(gameOver===true)return;
  // Turn ended mid Family-Member action: put the merchant back where it really is.
  { const ap=activePlayer(); if(ap&&ap._realPos){ap.pos=ap._realPos;delete ap._realPos;} }
  familyPlacementMode=false;
  document.querySelector('#choice-modal-backdrop')?.remove();
  // If the turn is ended while a Tea House / Black Market roll is still pending
  // (Red Mosque option not taken), settle it first so the payout isn't lost.
  if(pendingDice){
    const ctx=pendingDice;pendingDice=null;const p=activePlayer();
    if(p){
      if(ctx.type==='tea'){const payout=ctx.total>=ctx.target?ctx.target:2;p.coins=Number(p.coins||0)+payout;addLog(`${p.name} accepts the Tea House roll and receives ${payout} Lira.`);}
      else if(ctx.type==='black'){blackMarketPayout(p,ctx);}
      persistPlayerState();
    }
  }
  document.querySelector('#dice-mod-ui')?.remove();
  // Final-round trigger: after a player reaches the target, end after returning to the start player.
  if(endGameTrigger())gameOver='round';
  document.querySelector('#board-dice-overlay')?.classList.remove('is-visible');
  clearInterval(showBoardDiceAnimation.timer);clearTimeout(showBoardDiceAnimation.hideTimer);
  pendingBonusDiceEffect=null;
  bonusMoveMax=2;bonusDoubleAction=null;bonusMarketFlex=false;bonusReusePlace=false;
  // A turn ended mid-Caravansary: return any revealed-but-unkept cards to the deck.
  if(caravanOffer.length){bonusDeck.unshift(...caravanOffer);}
  caravanChoice=null;caravanPendingCards=[];caravanOffer=[];marketQuantities={fabric:0,spice:0,fruit:0,heirloom:0};teaTarget=null;blackGoodChoice='fabric';pendingGoodChoice=null;pendingPalaceAny=false;
  turn=(turn+1)%players.length;awaitingAction=false;actionInitiated=false;pendingAssistantDrop=false;pendingDice=null;familyActionTarget=null;familyActionMode=false;pendingFamilyCatch=null;lastDiceRoll=null;
  players.forEach(p=>{p.yellowRecallUsed=false;p.greenBonusUsed=false});
  renderAll();
  announceTurn();
  if(gameOver==='round'&&turn===0){const w=finalWinner();gameOver=true;addLog(`🏆 ${w.name} wins with ${w.rubies} Rubies.`);renderAll()}
}
async function onTileClick(name){
  if(gameOver===true)return;const p=activePlayer();if(!p)return;
  // Police Station: send the freed Family Member to the clicked Place, then run
  // that Place's action (no encounters — the merchant does not move).
  if(familyPlacementMode){
    if(name==='Police Station'||name===p.pos)return;
    familyPlacementMode=false;
    familyActionMode=true;familyActionTarget=name;
    p.familyPos=name;
    p._realPos=p.pos;p.pos=name;               // run the action as if the merchant were here
    awaitingAction=true;actionInitiated=false;pendingAssistantDrop=false;
    beginTileAction(p,name);
    addLog(`${p.name} frees the Family Member and sends it to ${name}.`);
    renderAll();
    return;
  }
  if(name===p.pos||awaitingAction)return;
  if(!reachableWithinTwo(p.pos).includes(name))return;
  const isFountain=name==='Fountain';
  pendingAssistantDrop=false;
  const assistantWaitingHere=p.left.includes(name);
  if(!isFountain && !assistantWaitingHere && p.assistants<=0){
    // Movement phase 1b: the Merchant has no Assistant to leave behind and none
    // waiting here, so the turn ends immediately — no encounter, no action.
    p.pos=name;
    addLog(`${p.name} moves to ${name} but has no Assistant to leave behind — the turn ends.`);
    renderAll();
    nextTurn();
    return;
  }
  // Phase 1: leave / pick up an Assistant.
  let leftAssistantHere=false;
  if(!isFountain){
    if(assistantWaitingHere){
      p.left=p.left.filter(x=>x!==name);p.assistants=Math.min(5,p.assistants+1);
      addLog(`${p.name} picks up an Assistant at ${name}.`);
    }else if(p.assistants>0){
      p.assistants--;p.left.push(name);leftAssistantHere=true;
    }
  }
  p.pos=name;
  // Phase 2: pay other Merchants here — or decline and end the turn.
  const fee=players.filter(q=>q!==p&&q.pos===name).length*2;
  if(fee && !isFountain){
    if(p.coins<fee){
      addLog(`${p.name} moves to ${name}${leftAssistantHere?', leaves an Assistant,':''} but cannot pay the ${fee} Lira Merchant fee — the turn ends.`);
      renderAll();nextTurn();return;
    }
    const pay=await modalChoice({title:`${name}: ${fee} Lira in Merchant encounter fees (${fee/2} other merchant${fee>2?'s':''} here).`,options:[
      {label:`Pay ${fee} Lira`,value:'pay',icon:'🪙'},
      {label:'Decline — end turn',value:'end'}
    ]});
    if(pay!=='pay'){
      addLog(`${p.name} moves to ${name}${leftAssistantHere?', leaves an Assistant,':''} and declines the ${fee} Lira fee — the turn ends.`);
      persistPlayerState();renderAll();nextTurn();return;
    }
    p.coins-=fee;addLog(`${p.name} pays ${fee} Lira in Merchant encounter fees.`);
  }
  // Phase 3 begins (family-member encounters happen in phase 4, after the action).
  awaitingAction=true;actionInitiated=false;pendingFamilyCatch=name;beginTileAction(p,name);
  addLog(`${p.name} moves to ${name}.`);renderAll();
}
function reachableWithin(name,maxDist,minDist=1){
  const idx=currentLayout.indexOf(name);if(idx<0)return[];
  const dist=new Map([[idx,0]]);const q=[idx];const out=[];
  while(q.length){
    const i=q.shift(),d=dist.get(i);if(d>=maxDist)continue;
    const r=Math.floor(i/4),c=i%4;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc])=>{
      const rr=r+dr,cc=c+dc;
      if(rr>=0&&rr<4&&cc>=0&&cc<4){const j=rr*4+cc;if(!dist.has(j)){dist.set(j,d+1);q.push(j);if(d+1>=minDist)out.push(currentLayout[j])}}
    });
  }
  return out;
}
// Normal move = 1–2 Places. The "move 3 or 4" Bonus card replaces that with 3–4
// (you may NOT move only 1–2 while it is in effect).
function reachableWithinTwo(name){return bonusMoveMax>=4?reachableWithin(name,4,3):reachableWithin(name,bonusMoveMax)}

function placePlayers(){
  [...board.children].forEach(tile=>{
    const name=tile.dataset.location,playersLayer=tile.querySelector('.tile-players'),assistantsLayer=tile.querySelector('.tile-assistants');
    if(!playersLayer)return;
    playersLayer.innerHTML='';assistantsLayer.innerHTML='';
    players.forEach(p=>{
      if((p._realPos||p.pos)===name){const el=document.createElement('div');el.className='player-token';el.innerHTML=`<img src="assets/player-pieces/${p.color}player.png" alt="${p.name}" draggable="false"><span class="assist-badge">x${p.assistants}</span>`;playersLayer.append(el)}
      if(p.left.includes(name)){const el=document.createElement('div');el.className='assistant-marker';el.innerHTML=`<img src="assets/player-pieces/${p.color}player-assistant.png" alt="${p.name} assistant" draggable="false">`;assistantsLayer.append(el)}
      if(p.familyPos===name){const el=document.createElement('div');el.className='family-marker';el.title=`${p.name} — Family member`;el.innerHTML=`<img src="assets/player-pieces/${p.color}player-assistant.png" alt="${p.name} family member" draggable="false"><span class="family-badge">F</span>`;assistantsLayer.append(el)}
    });
  });
}
function updateReachable(){
  const p=activePlayer();
  const here=p?(p._realPos||p.pos):null;
  if(familyPlacementMode){
    [...board.children].forEach(t=>{const n=t.dataset.location;t.classList.toggle('reachable',n!=='Police Station');t.classList.toggle('occupied-self',n===here)});
    return;
  }
  const reach=p&&!gameOver&&!awaitingAction?reachableWithinTwo(here):[];
  [...board.children].forEach(t=>{t.classList.toggle('reachable',reach.includes(t.dataset.location));t.classList.toggle('occupied-self',t.dataset.location===here)});
}
function getPostOfficeCubeSlots(){
  if(!Array.isArray(postCubeSlots)||postCubeSlots.length!==4)postCubeSlots=[0,2,4,6];
  return postCubeSlots.map(n=>Number(n)).filter(n=>n>=0&&n<8);
}
function playerLayerByRef(playerId,layerId){
  return (playerBoardLayers[String(playerId)]||playerBoardLayers[playerId]||[]).find(l=>l.id===layerId)||null;
}
function playerLayerElementCenter(layer){
  const rect=layer.getBoundingClientRect();
  return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};
}
function layerAction(playerId,layerId,action){
  if(!playerBoardEditMode)return;
  const list=playerBoardLayers[playerId]||playerBoardLayers[String(playerId)]||[];
  const idx=list.findIndex(l=>l.id===layerId); if(idx<0)return;
  const layer=list[idx];
  if(action==='remove'){
    list.splice(idx,1);
    Object.keys(saved).forEach(id=>{
      const state=saved[id];
      if(state?.attachedPlayerLayer?.playerId===Number(playerId)&&state?.attachedPlayerLayer?.layerId===layerId) delete state.attachedPlayerLayer;
    });
    localStorage.setItem('istanbul-component-positions',JSON.stringify(saved));
  } else if(action==='fixed') layer.fixed=!layer.fixed;
  else if(action==='up') layer.size=Math.min(28,Number(layer.size||8)+1);
  else if(action==='down') layer.size=Math.max(3,Number(layer.size||8)-1);
  persistPlayerBoardLayers(); renderPlayerBoards();
}
function bindPlayerBoardLayers(){
  boardsEl.querySelectorAll('.player-board-layer').forEach(el=>{
    const playerId=String(el.dataset.player), layerId=el.dataset.layerId, layer=playerLayerByRef(playerId,layerId);
    if(!layer)return;
    el.querySelectorAll('[data-layer-action]').forEach(btn=>btn.addEventListener('click',e=>{
      e.stopPropagation(); layerAction(playerId,layerId,btn.dataset.layerAction);
    }));
    let dragState=null;
    el.addEventListener('pointerdown',e=>{
      if(!playerBoardEditMode || e.target.closest('.player-board-layer-controls')||layer.fixed)return;
      const wrap=el.parentElement.getBoundingClientRect();
      dragState={startX:e.clientX,startY:e.clientY,startLeft:Number(layer.left),startTop:Number(layer.top),wrap};
      el.classList.add('dragging'); el.setPointerCapture?.(e.pointerId); e.preventDefault();
    });
    el.addEventListener('pointermove',e=>{
      if(!dragState)return;
      const dx=(e.clientX-dragState.startX)/dragState.wrap.width*100;
      const dy=(e.clientY-dragState.startY)/dragState.wrap.height*100;
      layer.left=Math.max(3,Math.min(97,dragState.startLeft+dx));
      layer.top=Math.max(3,Math.min(97,dragState.startTop+dy));
      el.style.setProperty('--layer-left',`${layer.left}%`); el.style.setProperty('--layer-top',`${layer.top}%`);
    });
    const finish=()=>{ if(!dragState)return; dragState=null; el.classList.remove('dragging'); persistPlayerBoardLayers(); renderPlayerBoards(); };
    el.addEventListener('pointerup',finish); el.addEventListener('pointercancel',finish);
  });
}
function playerBoardSlotNumber(layer){
  if(layer?.custom && Number.isFinite(Number(layer.customSlot))) return Number(layer.customSlot);
  const n=Number(layer?.boardIndex);
  return Number.isFinite(n)?n:null;
}
function playerBoardRowLayers(layers,row){
  const min=row*6+7, max=min+5;
  const list=layers.filter(l=>{
    const n=playerBoardSlotNumber(l);
    return Number.isFinite(n)&&n>=min&&n<=max && l?.ruby!==true;
  });
  return list.sort((a,b)=>playerBoardSlotNumber(a)-playerBoardSlotNumber(b));
}
function playerBoardLayerForSlot(layers,slot){
  // Gameplay slot lookup always prefers user-created custom layers; numeric 25–30
  // ruby layers are a separate visual track and are never cube targets.
  return layers.find(l=>l?.custom && Number(l.customSlot)===Number(slot))
      || layers.find(l=>l?.ruby!==true && playerBoardSlotNumber(l)===Number(slot))
      || null;
}
const SULTAN_CUBE_ANCHOR_MIGRATION='istanbul-sultan-c25-anchor-v2';
function ensureSultanCubes(){
  ensureRubyLayers();
  ensurePlayerCustomC25Row();
  const starts=[7,13,19,25];
  let changed=false;
  if(localStorage.getItem(SULTAN_CUBE_ANCHOR_MIGRATION)!=='1'){
    sultanCubes={};
    localStorage.setItem(SULTAN_CUBE_ANCHOR_MIGRATION,'1');
    changed=true;
  }
  players.forEach(p=>{
    const layers=playerBoardLayers[String(p.id)]||[];
    WHEELBARROW_GOOD_ROWS.forEach((good,row)=>{
      const id=`${p.id}-${row+1}`;
      const current=sultanCubes[id]||{};
      const anchor=playerBoardLayerForSlot(layers,starts[row]);
      let col=Number.isInteger(current.col)?Math.max(0,Math.min(5,current.col)):0;
      let layerId=current.layerId||null;
      const linked=layerId?layers.find(l=>l.id===layerId):null;
      if(linked){
        const n=playerBoardSlotNumber(linked);
        const isValid=linked.ruby!==true && Number.isFinite(n) && n>=starts[row] && n<=starts[row]+5;
        if(isValid) col=n-starts[row]; else layerId=null;
      }
      if(!layerId && anchor){ layerId=anchor.id; col=0; }
      const next={playerId:p.id,row,col,layerId,fixed:current.fixed===true};
      if(JSON.stringify(sultanCubes[id])!==JSON.stringify(next)){sultanCubes[id]=next;changed=true;}
    });
  });
  if(changed)localStorage.setItem(SULTAN_CUBE_KEY,JSON.stringify(sultanCubes));
}
function syncSultanCubes(){ensureSultanCubes()}
function cubeMaxColumnForPlayer(p){
  // Column 0 represents zero goods. The cube may occupy one position per
  // quantity up to the cart's current capacity; positions beyond capacity are locked.
  return Math.max(0, Math.min(5, cartCapacity(p)));
}
function isSultanCubeTargetUnlocked(cube, nextCol){
  const p=players.find(x=>x.id===cube.playerId);
  if(!p)return false;
  return nextCol>=0 && nextCol<=cubeMaxColumnForPlayer(p);
}
function syncSultanCubeToGood(p, good){
  if(!p)return;
  const row=WHEELBARROW_GOOD_ROWS.indexOf(good);
  if(row<0)return;
  const cubeId=`${p.id}-${row+1}`;
  const cube=sultanCubes[cubeId];
  if(!cube)return;
  const maxCol=cubeMaxColumnForPlayer(p);
  const col=Math.max(0,Math.min(maxCol,Number(p.goods[good]||0)));
  const layers=playerBoardLayers[String(p.id)]||[];
  const slot=[7,13,19,25][row]+col;
  const target=playerBoardLayerForSlot(layers,slot);
  if(!target)return;
  cube.col=col;
  cube.layerId=target.id;
  localStorage.setItem(SULTAN_CUBE_KEY,JSON.stringify(sultanCubes));
}
function syncAllSultanCubesToGoods(p){
  GOODS.forEach(g=>syncSultanCubeToGood(p,g));
  localStorage.setItem(SULTAN_CUBE_KEY,JSON.stringify(sultanCubes));
}
function moveSelectedSultanCube(direction){
  if(!selectedSultanCube)return;
  const cube=sultanCubes[selectedSultanCube];if(!cube||cube.fixed)return;
  const target=Math.round(cube.col+direction);
  if(!isSultanCubeTargetUnlocked(cube,target))return;
  moveSultanCubeToColumn(cube,target);
}
function moveSultanCubeToColumn(cube,next){
  if(!cube)return false;
  const p=players.find(x=>x.id===cube.playerId);
  const maxCol=cubeMaxColumnForPlayer(p);
  const clamped=Math.max(0,Math.min(maxCol,Math.round(next)));
  if(clamped===cube.col)return false;
  const layers=playerBoardLayers[String(cube.playerId)]||[];
  const targetSlot=[7,13,19,25][cube.row]+clamped;
  const target=playerBoardLayerForSlot(layers,targetSlot);
  if(!target)return false;
  cube.col=clamped;
  cube.layerId=target.id;
  const g=GOODS[cube.row];
  if(p){p.goods[g]=clamped;persistPlayerState();}
  localStorage.setItem(SULTAN_CUBE_KEY,JSON.stringify(sultanCubes));
  renderPlayerBoards();
  return true;
}
function bindSultanCubeDragging(){
  boardsEl.querySelectorAll('[data-sultan-cube]').forEach(btn=>{
    let dragState=null,moved=false;
    btn.addEventListener('pointerdown',e=>{
      if(e.button!==undefined&&e.button!==0)return;
      const cube=sultanCubes[btn.dataset.sultanCube];if(!cube)return;
      selectedSultanCube=btn.dataset.sultanCube;
      const wrap=btn.closest('.cart-board-wrap');if(!wrap)return;
      dragState={pointerId:e.pointerId,startX:e.clientX,wrap,cube,startCol:cube.col,moved:false};
      btn.setPointerCapture?.(e.pointerId);e.preventDefault();
      btn.classList.add('is-dragging');
    });
    btn.addEventListener('pointermove',e=>{
      if(!dragState)return;
      const rect=dragState.wrap.getBoundingClientRect();
      const xPct=((e.clientX-rect.left)/rect.width)*100;
      const row=dragState.cube.row;
      const layers=playerBoardLayers[String(dragState.cube.playerId)]||[];
      const rowLayers=playerBoardRowLayers(layers,row);
      const xs=rowLayers.length?rowLayers.map(l=>Number(l.left)):PLAYER_GRID_X;
      let nearest=xs.reduce((best,x,i)=>Math.abs(x-xPct)<Math.abs(xs[best]-xPct)?i:best,0); nearest=Math.min(nearest,cubeMaxColumnForPlayer(players.find(x=>x.id===dragState.cube.playerId)));
      const preview=dragState.wrap.querySelector(`.sultan-cube[data-sultan-cube="${btn.dataset.sultanCube}"]`);
      if(preview){preview.style.setProperty('--cube-left',`${xs[nearest]}%`);preview.style.setProperty('--cube-top',`${rowLayers[nearest]?Number(rowLayers[nearest].top):PLAYER_GRID_Y[row]}%`)}
      if(nearest!==dragState.startCol)dragState.moved=true;
    });
    const finish=e=>{
      if(!dragState)return;
      const rect=dragState.wrap.getBoundingClientRect();
      const xPct=((e.clientX-rect.left)/rect.width)*100;
      const row=dragState.cube.row;
      const layers=playerBoardLayers[String(dragState.cube.playerId)]||[];
      const rowLayers=playerBoardRowLayers(layers,row);
      const xs=rowLayers.length?rowLayers.map(l=>Number(l.left)):PLAYER_GRID_X;
      let nearest=xs.reduce((best,x,i)=>Math.abs(x-xPct)<Math.abs(xs[best]-xPct)?i:best,0); nearest=Math.min(nearest,cubeMaxColumnForPlayer(players.find(x=>x.id===dragState.cube.playerId)));
      const didMove=dragState.moved||nearest!==dragState.startCol;
      dragState=null;btn.classList.remove('is-dragging');
      if(didMove)moveSultanCubeToColumn(sultanCubes[btn.dataset.sultanCube],nearest);else renderPlayerBoards();
    };
    btn.addEventListener('pointerup',finish);btn.addEventListener('pointercancel',finish);
    btn.onclick=e=>{e.preventDefault();selectedSultanCube=btn.dataset.sultanCube;renderPlayerBoards()};
  });
  boardsEl.querySelectorAll('[data-sultan-cube-lock]').forEach(b=>b.onclick=e=>{
    e.preventDefault();e.stopPropagation();if(!playerBoardEditMode)return;
    const id=b.dataset.sultanCubeLock,c=sultanCubes[id];if(!c)return;
    c.fixed=!c.fixed;localStorage.setItem(SULTAN_CUBE_KEY,JSON.stringify(sultanCubes));renderPlayerBoards();
  });
}
function setPlayerBoardEditMode(enabled){
  playerBoardEditMode=!!enabled;
  if(playerBoardEditMode){
    // Entering player-board edit mode always opens the editor: unlock all
    // player-board layers and Sultan cubes so their controls are immediately
    // usable. Game-play state is not changed; these are editor lock states.
    Object.values(playerBoardLayers).forEach(list=>{
      if(Array.isArray(list)) list.forEach(layer=>{ layer.fixed=false; });
    });
    Object.values(sultanCubes).forEach(cube=>{ if(cube) cube.fixed=false; });
    persistPlayerBoardLayers();
    localStorage.setItem(SULTAN_CUBE_KEY,JSON.stringify(sultanCubes));
  }
  localStorage.setItem(PLAYER_BOARD_EDIT_KEY,playerBoardEditMode?'1':'0');
  surface.classList.toggle('player-board-edit-mode',playerBoardEditMode);
  const b=document.querySelector('#player-board-edit');
  if(b){b.textContent=playerBoardEditMode?'Exit player-board edit':'Edit player-board';b.setAttribute('aria-pressed',String(playerBoardEditMode));b.classList.toggle('active',playerBoardEditMode)}
  renderPlayerBoards();
}
function ensureThreePlayerBoardSlotLocks(){
  if(!players.length)return;
  let changed=false;
  const xs=[PLAYER_GRID_X[3],PLAYER_GRID_X[4],PLAYER_GRID_X[5]];
  players.forEach(p=>{
    const key=String(p.id);
    const list=Array.isArray(playerBoardSlotLocks[key])?playerBoardSlotLocks[key]:(playerBoardSlotLocks[key]=[]);
    const next=[];
    for(let i=0;i<3;i++){
      const existing=list[i];
      const normalized={
        ...(existing||{}),
        id:existing?.id||`slot-lock-${p.id}-${i+1}`,
        left:Number.isFinite(Number(existing?.left))?Number(existing.left):xs[i],
        top:Number.isFinite(Number(existing?.top))?Number(existing.top):50,
        size:Number.isFinite(Number(existing?.size))?Number(existing.size):6,
        height:Number.isFinite(Number(existing?.height))?Number(existing.height):12,
        fixed:true
      };
      next.push(normalized);
      if(!existing || JSON.stringify(existing)!==JSON.stringify(normalized)) changed=true;
    }
    if(list.length!==3){changed=true;}
    playerBoardSlotLocks[key]=next;
  });
  if(changed)persistPlayerSlotLocks();
}
function renderPlayerBoards(){
  ensureRubyLayers();
  mirrorPlayerBoardLayout();
  ensureSultanCubes();
  ensureThreePlayerBoardSlotLocks();
  const ap=activePlayer();
  // In multiplayer each viewer sees their own wheelbarrow; otherwise the active one.
  const myColor=window.NET&&NET.role!=='solo'?NET.myColor:null;
  const shownPlayers=myColor?players.filter(p=>p.color===myColor)
    :(ap?players.filter(p=>p.id===ap.id):players);
  boardsEl.innerHTML=(shownPlayers.length?shownPlayers:players.slice(0,1)).map(playerBoardCardHTML).join('');
  bindPlayerBoardsInteractions();
}
function playerBoardCardHTML(p){
    const layers=playerBoardLayers[String(p.id)]||[];
    const cubeHtml=Object.values(sultanCubes).filter(c=>Number(c.playerId)===Number(p.id)).map(c=>{
      const cubeId=`${p.id}-${c.row+1}`;
      const row=Math.max(0,Math.min(3,Number(c.row)||0));
      const col=Math.max(0,Math.min(5,Number(c.col)||0));
      const layer=layers.find(l=>l.id===c.layerId)||null;
      const left=layer&&Number.isFinite(Number(layer.left))?Number(layer.left):PLAYER_GRID_X[col];
      const top=layer&&Number.isFinite(Number(layer.top))?Number(layer.top):PLAYER_GRID_Y[row];
      return `<button type="button" class="sultan-cube ${c.fixed?'is-fixed':''} ${selectedSultanCube===cubeId?'is-selected':''}" data-sultan-cube="${cubeId}" style="--cube-left:${left}%;--cube-top:${top}%;" aria-label="Sultan cube row ${row+1}"><img src="assets/grey-cube.png" alt="Grey cube" draggable="false">${playerBoardEditMode?`<span class="sultan-cube-lock" data-sultan-cube-lock="${cubeId}">${c.fixed?'🔓':'🔒'}</span>`:''}</button>`;
    }).join('');
    const cubes=cubeHtml;
    const locks='';
    const layersHtml=layers.map((l,i)=>{const bi=Number(l.boardIndex);const isRuby=!!l.ruby && l.claimed===true;const label=Number.isFinite(bi)&&bi>=25?bi:(l.custom&&Number.isFinite(Number(l.customSlot))?'C'+Number(l.customSlot):'');return `<div class="player-board-layer ${l.fixed?'is-fixed':''} ${isRuby?'ruby-layer':''}" data-player="${p.id}" data-layer-id="${l.id}" style="--layer-left:${Number(l.left)||26}%;--layer-top:${Number(l.top)||81.5}%;--layer-size:${Number(l.size)||PLAYER_GRID_SIZE}%">${isRuby?'<img class="layer-ruby-3d" src="assets/ruby.png" alt="Ruby" draggable="false">':''}${label?`<span class="layer-index">${label}</span>`:''}${playerBoardEditMode?`<div class="player-board-layer-controls"><button type="button" data-layer-action="down">−</button><button type="button" data-layer-action="up">+</button><button type="button" data-layer-action="fixed">${l.fixed?'🔓':'🔒'}</button><button type="button" data-layer-action="remove">×</button></div>`:''}</div>`}).join('');
    const slotLocksHtml=(playerBoardSlotLocks[String(p.id)]||[]).slice(0,3).map((l,i)=>{ const lockedCol=3+i; const unlocked=lockedCol<=cubeMaxColumnForPlayer(p); return unlocked?'':`<div class="player-board-slot-lock icon-only ${l.fixed?'is-fixed':''}" data-player="${p.id}" data-slot-lock-id="${l.id}" style="--lock-left:${PLAYER_GRID_X[lockedCol]}%;--lock-top:${Number(l.top)||50}%;--lock-size:${Number(l.size)||6}%;--lock-height:${Number(l.height)||12}%" aria-label="Locked slot ${lockedCol+1}"><span class="slot-lock-icon" aria-hidden="true">🔒</span></div>`; }).join('');
    const rawHand=Array.isArray(p.bonusHand)?p.bonusHand:[];
    const uniqueHand=[...new Set(rawHand)];
    if(uniqueHand.length!==rawHand.length){p.bonusHand=uniqueHand;p.bonusCards=uniqueHand.length;}
    const visibleHand=uniqueHand.slice();
    const playable=p.id===turn?playableBonusCards():[];
    const cardHand=visibleHand.map((id,i)=>{
      const canPlay=playable.includes(id);
      return `<button type="button" class="bonus-card-chip ${canPlay?'is-playable':''}" data-player="${p.id}" data-bonus-card="${id}" data-discard-card="${id}" draggable="true" title="${canPlay?'Play: ':''}${bonusName(id)}"><img src="${bonusImage(id)}" alt="${bonusName(id)}"> <span>${canPlay?'▶':i+1}</span></button>`;
    }).join('');
    const mosqueHand=(p.mosqueCardHand||[]).map((id,i)=>{const c=parseMosqueCardId(id);return `<div class="mosque-card-chip" title="${c.mosque} Mosque tile — ${GOOD_LABEL[c.color]} (${MOSQUE_ABILITY[c.color]} ability)"><img src="${mosqueCardImage(c.mosque,c.color,c.req)}" alt="${c.mosque} ${GOOD_LABEL[c.color]} Mosque tile"><span>M</span></div>`}).join('');
    // One "Hand" holding every kind of card the player owns (Bonus cards + Mosque tiles).
    const handHtml=(cardHand+mosqueHand)||'<span class="empty-card-slot">No cards</span>';
    return `<div class="player-board-card ${p.id===turn&&!gameOver?'is-current':''}"><h3><span class="dot" style="background:${cssColor(p.color)}"></span>${p.name}</h3><div class="player-board-stage"><span class="sultan-row-arrow-spacer" aria-hidden="true"></span><div class="cart-board-wrap"><img class="wheelbarrow-art" src="assets/player-pieces/cart-board.png" alt="${p.name} wheelbarrow" draggable="false"><div class="player-board-layers-layer">${layersHtml}</div><div class="player-board-slot-locks">${slotLocksHtml}</div><div class="sultan-cubes-layer">${cubes}</div><div class="cart-vertical-locks">${locks}</div></div>${renderCoinRack(p)}<div class="player-card-sidebar"><div class="bonus-hand-area"><span class="card-area-label">Hand</span><div class="bonus-card-row">${handHtml}</div></div><div class="discard-area"><span class="card-area-label">Discard</span><div class="discard-slot ${bonusDiscard.length?'has-cards':''}" data-player="${p.id}">${bonusDiscard.length?`<img src="${bonusImage(bonusDiscard[bonusDiscard.length-1])}" alt="Top discard: ${bonusName(bonusDiscard[bonusDiscard.length-1])}"><span>x${bonusDiscard.length}</span>`:'<span>Drop card here</span>'}</div></div></div><span class="sultan-row-arrow-spacer" aria-hidden="true"></span></div><div class="stat-row"><span class="stat-chip">${p.coins} Lira</span><span class="stat-chip rubies">${p.rubies}/${winnerTarget} Rubies</span><span class="stat-chip">${goodsTotal(p)}/${cartCapacity(p)} goods</span><span class="stat-chip">${(p.bonusHand?.length||0)+(p.mosqueCardHand?.length||0)} cards</span></div><div class="stat-row">${GOODS.map(g=>`<span class="stat-chip">${GOOD_LABEL[g]} ${p.goods[g]||0}</span>`).join('')}</div></div>`;
}
function bindPlayerBoardsInteractions(){
  boardsEl.querySelectorAll('[data-sultan-cube]').forEach(b=>b.oncontextmenu=e=>e.preventDefault());
  boardsEl.querySelectorAll('[data-discard-card]').forEach(b=>{
    b.onclick=async()=>{
      const p=players.find(x=>x.id===Number(b.dataset.player));if(!p)return;
      const id=b.dataset.bonusCard;
      // The current player PLAYS a playable card.
      if(p.id===turn && playableBonusCards().includes(id)){playBonusCard(id);return}
      // A dice roll is pending — the dice panel handles the modification, not the hand.
      if(pendingDice)return;
      // Otherwise the chip discards (confirm via modal so it is not an accident).
      const ans=await modalChoice({title:`Discard "${bonusName(id)}" from ${p.name}'s hand? (no effect)`,options:[
        {label:'Discard it',value:'yes'},{label:'Keep it',value:'no'}
      ]});
      if(ans!=='yes')return;
      discardOneBonus(p,id);persistPlayerState();renderAll();
    };
    b.addEventListener('dragstart',e=>{e.dataTransfer?.setData('text/plain',JSON.stringify({playerId:Number(b.dataset.player),cardId:b.dataset.discardCard}));b.classList.add('dragging')});
    b.addEventListener('dragend',()=>b.classList.remove('dragging'));
  });
  boardsEl.querySelectorAll('.discard-slot').forEach(slot=>{
    slot.addEventListener('dragover',e=>e.preventDefault());
    slot.addEventListener('drop',e=>{
      e.preventDefault();let data=null;try{data=JSON.parse(e.dataTransfer?.getData('text/plain')||'null')}catch(_){}
      if(data&&Number(data.playerId)===Number(slot.dataset.player)){const p=players.find(x=>x.id===Number(data.playerId));if(p&&discardOneBonus(p,data.cardId)){persistPlayerState();renderAll()}}
    });
  });
  bindPlayerBoardLayers();
  bindPlayerBoardSlotLocks();
  bindSultanCubeDragging();
}

function coinDenominationCounts(total){const v=Math.max(0,safeInt(total,0));return[{value:1,count:v%5},{value:5,count:Math.floor((v%10)/5)},{value:10,count:Math.floor(v/10)}]}
function renderCoinRack(p){return `<div class="player-coin-rack">${coinDenominationCounts(p.coins).map(c=>`<div class="player-coin-item"><img src="assets/coins/coin-${c.value}.png" alt="${c.value} Lira"><span class="player-coin-count">x${c.count}</span></div>`).join('')}</div>`}
function cssColor(c){return{red:'#c6443b',blue:'#2f6fb0',green:'#3f8a4c',yellow:'#d9a92e'}[c]||'#999'}

function renderCardSupply(){
  const slot=document.querySelector('#global-bonus-discard');
  if(slot)slot.innerHTML=bonusDiscard.length?`<img src="${bonusImage(bonusDiscard[bonusDiscard.length-1])}" alt="Top discard: ${bonusName(bonusDiscard[bonusDiscard.length-1])}"><span>Discard pile · ${bonusDiscard.length}</span>`:'<span>Discard pile · 0</span>';
}

function renderTurnStatus(){
  const p=activePlayer();
  if(gameOver===true){
    turnStatus.textContent='Game complete';turnHint.textContent=`${finalWinner()?.name||''} wins.`;
    actionBtn.disabled=true;endTurnBtn.disabled=true;actionBtn.style.display='none';return;
  }
  if(!p){turnStatus.textContent='Setting up…';return}
  turnStatus.textContent=`${p.name}'s turn — ${p.pos}${gameOver==='round'?' (final round)':''}`;
  const canShowAction=awaitingAction&&!actionInitiated&&!pendingDice;
  actionBtn.style.display=canShowAction?'inline-block':'none';
  if(awaitingAction){
    const caravanBusy=caravanChoice==='pick';
    turnHint.textContent=caravanBusy?'Caravansary: keep 1 of the revealed cards (the rest are discarded).':familyPlacementMode?'Click a highlighted tile to send your Family Member there.':pendingGoodChoice?`${pendingGoodChoice.title} — pick a good below.`:familyActionMode?`Family Member at ${familyActionTarget}: carry out that Place's action.`:`${p.pos}: ${actionInfo[p.pos]?.label||''}`;
    actionBtn.disabled=caravanBusy||!!pendingGoodChoice;
    actionBtn.textContent=caravanBusy?'Caravansary…':familyActionMode?'Resolve Family action':(p.pos==='Tea House'&&!pendingDice?'Roll Dice':`Do action at ${p.pos}`);
  }else{
    turnHint.textContent=`${p.name}: click a place 1–2 orthogonal steps from ${p.pos} to move.`;
    actionBtn.disabled=true;actionBtn.textContent='Move to a tile first';
  }
  endTurnBtn.disabled=!awaitingAction;
}
// Spoken/written turn announcement — a brief banner whenever the active merchant changes.
function announceTurn(force){
  const p=activePlayer();
  const el=document.getElementById('turn-toast');
  if(!el||!p||gameOver===true)return;
  if(!force && announceTurn._last===p.id)return;
  announceTurn._last=p.id;
  el.textContent=`${p.name} — your turn to move`;
  el.hidden=false;
  requestAnimationFrame(()=>el.classList.add('show'));
  clearTimeout(announceTurn._t);
  announceTurn._t=setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=>{ if(!el.classList.contains('show')) el.hidden=true; },450);
  },2400);
}
function renderAll(){renderTurnStatus();renderActionUI();updateReachable();placePlayers();renderPlayerBoards();renderCardSupply();
  const p=activePlayer();
  document.querySelector('#family-target')?.remove();
  document.querySelector('#dice-mod-ui')?.remove();
  if(pendingDice && pendingDice.canModify){
    const d=pendingDice;const panel=document.querySelector('.turn-actions');
    if(panel){
      const el=document.createElement('div');el.id='dice-mod-ui';
      const head=`<span class="dice-caption">${d.title} rolled <strong>${d.dice[0]} + ${d.dice[1]} = ${d.total}</strong>.</span>`;
      let body='';
      if(d.modPhase==='red-effect'){
        body=`<div class="dice-mod-section"><span>Fabric Mosque tile —</span><button type="button" data-dice-mod="reroll">Re-roll both dice</button><button type="button" data-dice-mod="set4">Turn the lower die to 4</button><button type="button" data-dice-mod="cancel">Back</button></div>`;
      }else{ // menu
        body='<div class="dice-mod-section">'
          +`<button type="button" data-dice-mod="use-red">Use Fabric Mosque tile &mdash; re-roll or turn a die to 4</button>`
          +`<button type="button" data-dice-mod="keep">Keep this roll</button></div>`;
      }
      el.innerHTML=head+body;
      panel.append(el);
    }
  }
  document.querySelector('#good-choice-ui')?.remove();
  if(pendingGoodChoice){
    const panel=document.querySelector('.turn-actions');
    if(panel){
      const el=document.createElement('div');el.id='good-choice-ui';
      el.innerHTML=`<span>${pendingGoodChoice.title}:</span><div class="good-pick-row">${goodPickButtons(pendingGoodChoice.options)}</div>`;
      panel.append(el);
      el.querySelectorAll('.good-pick[data-good]').forEach(b=>b.onclick=()=>resolveGoodChoice(b.dataset.good));
    }
  }
  document.querySelector('#yellow-mosque-ui')?.remove();
  // Yellow Mosque tile: once on your turn (any phase) pay 2 Lira to recall an Assistant.
  if(p&&p.id===turn&&!gameOver&&hasAbility(p,'yellow')&&!p.yellowRecallUsed&&p.left.length&&p.coins>=2&&!pendingDice&&!pendingFamilyRewards.length){
    const panel=document.querySelector('.turn-actions');
    if(panel){const el=document.createElement('div');el.id='yellow-mosque-ui';el.innerHTML=`<span>Fruit Mosque tile — recall an Assistant for 2 Lira:</span>${p.left.map((place,i)=>`<button type="button" data-yellow-recall="${i}">${place}</button>`).join('')}`;panel.append(el);el.querySelectorAll('[data-yellow-recall]').forEach(b=>b.onclick=()=>useYellowRecall(p,b.dataset.yellowRecall));}
  }
  if(pendingFamilyRewards.length && !awaitingAction)showFamilyRewardUI();
  document.querySelector('#bonus-play-ui')?.remove();
  const playCards=playableBonusCards();
  if(playCards.length){
    const panel=document.querySelector('.turn-actions');
    if(panel){
      const el=document.createElement('div');el.id='bonus-play-ui';
      el.innerHTML=`<span>Bonus cards:</span>`+[...new Set(playCards.map(bonusType))].map(t=>{
        const id=playCards.find(c=>bonusType(c)===t);
        return `<button type="button" data-play-bonus="${id}">${BONUS_DEFS[t].name}</button>`;
      }).join('');
      panel.append(el);
      el.querySelectorAll('[data-play-bonus]').forEach(b=>b.onclick=()=>playBonusCard(b.dataset.playBonus));
    }
  }
  markPlayerCountButtons();
  logEl.innerHTML=gameLog.slice(0,10).map(x=>`<li>${x}</li>`).join('');requestAnimationFrame(()=>{placeAttachments();renderGemClaims();renderSultanPalaceCubes()});
}

// Event wiring
if(actionBtn){actionBtn.onclick=performAction}
if(endTurnBtn){endTurnBtn.onclick=()=>{if(awaitingAction){awaitingAction=false;if(pendingFamilyRewards.length){renderAll();return}}nextTurn()}}
if(playerCountSelect){playerCountSelect.onchange=()=>newGame(safeInt(playerCountSelect.value,1))}
document.querySelector('#new-game')?.addEventListener('click',()=>newGame(safeInt(playerCountSelect?.value,1)));
// Player-count buttons: start a fresh game (new random 16-tile layout) with N players.
document.querySelectorAll('.player-count-buttons [data-players]').forEach(b=>{
  b.addEventListener('click',()=>newGame(safeInt(b.dataset.players,2),{layout:'random'}));
});
function markPlayerCountButtons(){
  document.querySelectorAll('.player-count-buttons [data-players]').forEach(b=>{
    b.classList.toggle('is-active',Number(b.dataset.players)===players.length);
  });
}
function refreshGameCodeUI(){
  const el=document.querySelector('#game-code');
  if(el)el.textContent=makeGameCode(gameSeed,players.length||2);
}
document.querySelector('#copy-code')?.addEventListener('click',()=>{
  const code=makeGameCode(gameSeed,players.length||2);
  const done=()=>{const b=document.querySelector('#copy-code');if(b){const t=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=t,1200)}};
  if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code).then(done,done);else done();
});
document.querySelector('#join-btn')?.addEventListener('click',()=>{
  const input=document.querySelector('#join-code');
  const raw=(input?.value||'').trim();
  if(!raw){                    // empty box: just seat another merchant at this table
    if(players.length>=PLAYER_COLORS.length){addLog('All four merchants have already joined.');return}
    addPlayer();
    return;
  }
  const parsed=parseGameCode(raw);
  if(!parsed){addLog('That game code is not valid.');if(input)input.classList.add('invalid');return}
  input?.classList.remove('invalid');
  newGame(parsed.count,{layout:parsed.seed});
});
document.querySelector('#join-code')?.addEventListener('keydown',e=>{if(e.key==='Enter')document.querySelector('#join-btn')?.click()});

document.addEventListener('click',e=>{
  const t=e.target;
  if(t?.id==='roll-tea'){
    const p=activePlayer();
    const target=safeInt(document.querySelector('#tea-target')?.value,6);
    if(target>=3&&target<=12){
      // A new Tea House roll must always begin a fresh Bonus-card decision.
      // Do not allow a stale phase from a previous Tea House action to leak into this roll.
      pendingDice=null;
      pendingBonusDiceEffect=null;
      resolveCore(p,'Tea House');
      // resolveCore creates pendingDice. Re-render after the roll so the entry
      // control is guaranteed to be present in the current turn UI.
      renderAll();
    }
    return;
  }
  if(t?.id==='roll-black'){const p=activePlayer();resolveCore(p,'Black Market');renderAll()}
  if(t?.id==='sell-market'){const p=activePlayer();const place=familyActionMode&&familyActionTarget?familyActionTarget:p?.pos;if(p&&place) {const ok=resolveCore(p,place,{skipEncounters:familyActionMode});if(ok!==false){finishAction(true);renderAll()} else {renderAll()}}}
  if(t?.id==='return-fountain'){const p=activePlayer();if(familyActionMode&&familyActionTarget==='Fountain'&&p){const selected=[...document.querySelectorAll('.fountain-pick:checked')].map(x=>x.value);p.left=p.left.filter(x=>!selected.includes(x));p.assistants=Math.min(5,p.assistants+selected.length);addLog(`${p.name} returns ${selected.length} Assistant${selected.length===1?'':'s'} at the Fountain through the Family Member action.`);finishAction(false)}else performAction();}
  if(t?.id==='post-claim')performAction();
  const blackGoodBtn=t?.closest?.('[data-black-good]');
  if(blackGoodBtn){blackGoodChoice=blackGoodBtn.dataset.blackGood;renderActionUI();return}
  const caravanKeepBtn=t?.closest?.('[data-caravan-keep]');
  if(caravanKeepBtn){caravanKeep(caravanKeepBtn.dataset.caravanKeep);return}
  if(t?.id==='green-bonus')performGreenBonus(activePlayer());
  if(t?.closest?.('.mosque-top-card[data-mosque]')){const card=t.closest('.mosque-top-card[data-mosque]');const p=activePlayer();const ok=acquireMosque(p,card.dataset.mosque,card.dataset.good);if(ok)finishAction(true);else renderAll()}
  const diceModifier=t?.closest?.('[data-dice-mod]');
  if(diceModifier){
    e.preventDefault();
    e.stopPropagation();
    applyDiceMod(diceModifier.dataset.diceMod);
    return;
  }
});

document.addEventListener('input',e=>{
  if(e.target.id==='tea-target'){teaTarget=safeInt(e.target.value,6);return}
  if(e.target.classList.contains('market-q')){
    const p=activePlayer();const g=e.target.dataset.good;
    const mtype=actionInfo[p?.pos]?.type;
    const isMarket=mtype==='marketSmall'||mtype==='marketLarge';
    const need=p&&isMarket?demandCounts(currentDemand(mtype==='marketSmall'?'small':'large')):{};
    const flex=bonusMarketFlex&&mtype==='marketSmall';
    const cap=p?(flex?Math.min(5,p.goods[g]||0):Math.min(need[g]||0,p.goods[g]||0)):0;
    const v=Math.max(0,Math.min(cap,safeInt(e.target.value,0)));
    e.target.value=String(v);marketQuantities[g]=v;
  }
});

// opts.layout: 'random' → fresh random layout + new seed; a number → that seed;
// undefined → keep whatever board is currently up (page reload / re-init).
function newGame(count,opts={}){
  count=Math.min(PLAYER_COLORS.length,Math.max(1,safeInt(count,1))); // only 4 player colours exist
  const wantLayout=opts.layout;
  if(typeof wantLayout==='number'){ gameSeed=wantLayout>>>0; }
  else if(wantLayout==='random'){ gameSeed=(Math.random()*4294967296)>>>0; }
  localStorage.setItem('istanbul-game-seed',String(gameSeed));
  localStorage.setItem('istanbul-game-count',String(count));
  localStorage.removeItem('istanbul-player-state');
  // Clear any half-finished turn state left over from the previous game.
  caravanChoice=null;caravanPendingCards=[];caravanOffer=[];marketQuantities={fabric:0,spice:0,fruit:0,heirloom:0};blackGoodChoice='fabric';pendingGoodChoice=null;pendingPalaceAny=false;
  pendingDice=null;pendingFamilyRewards=[];familyActionMode=false;familyActionTarget=null;familyPlacementMode=false;pendingFamilyCatch=null;
  bonusMoveMax=2;bonusDoubleAction=null;bonusMarketFlex=false;bonusReusePlace=false;pendingAssistantDrop=false;
  // A new game always starts with an empty Ruby row (slots 25–30).
  playerRubySlots={};persistPlayerRubySlots();
  // Restore every Gemstone Dealer Ruby to the track (clear prior claimed/dimmed state),
  // so the visible track matches the reset price ladder (gemstoneRubyIndex=0 below).
  gemstoneLayers.forEach(l=>{ if(l&&l.trackIndex){ delete l.claimed; delete l.opacity; } });
  persistGemstoneLayers();
  sultanCubes={};selectedSultanCube=null;localStorage.setItem(SULTAN_CUBE_KEY,JSON.stringify(sultanCubes));players=loadSavedPlayers(count);players.forEach(p=>{p.rubies=0});ensurePlayerCustomC25Row();ensureRubyLayers();mirrorPlayerBoardLayout();turn=0;gameOver=false;awaitingAction=false;actionInitiated=false;pendingAssistantDrop=false;pendingBonusDiceEffect=null;winnerTarget=count===2?6:5;lastDiceRoll=null;teaTarget=null;pendingDice=null;pendingFamilyRewards=[];familyActionTarget=null;familyActionMode=false;smallDemandDeck=createDemandDeck('small');largeDemandDeck=createDemandDeck('large');smallDemandIndex=0;largeDemandIndex=0;postCubeSlots=[0,2,4,6];postCubeDirection='down';persistPostOfficeState();palaceRubyIndex=0;persistPalaceRubyIndex();gemstoneRubyIndex=0;bonusDeck=makeBonusDeck();bonusDiscard=[];bonusMoveMax=2;bonusDoubleAction=null;bonusMarketFlex=false;bonusReusePlace=false;localStorage.removeItem(MOSQUE_STACK_KEY);initMosqueStacks();players.forEach(p=>{p.bonusHand=[];p.bonusCards=0;p.mosqueCardHand=[];p.yellowRecallUsed=false;p.greenBonusUsed=false;p.redMosqueUsed=false;p.wainwrightRubyTaken=false;p.rubies=0});persistPlayerRubySlots();persistPlayerState();sultanCubes={};selectedSultanCube=null;localStorage.setItem(SULTAN_CUBE_KEY,JSON.stringify(sultanCubes));gameLog.length=0;
  const doRandom = opts.layout!==undefined;
  if(doRandom) addLog(`New ${count}-player game — board code ${makeGameCode(gameSeed,count)}.`);
  addLog(`${players[0].name} starts at the Fountain.`);
  renderAll();render({randomize:doRandom,seed:gameSeed});renderDecks();setLocked(true);refreshGameCodeUI();}

ensureDiceOverlay();
// Start solo: only the host merchant is on the board. Others appear one at a
// time via "Join" (addPlayer), each new merchant token showing as it joins.
// (In a multiplayer lobby this board just sits behind the lobby overlay until
// the host presses Start / the first snapshot arrives.)
newGame(1,{layout:gameSeed});

function addPlayer(){
  if(players.length>=PLAYER_COLORS.length)return;
  const i=players.length,color=PLAYER_COLORS[i];
  players.push({id:i,color,name:PLAYER_LABELS[color],pos:'Fountain',assistants:START_ASSISTANTS,left:[],
    coins:2+i,rubies:0,bonusCards:0,bonusHand:[],mosqueCardHand:[],
    cartUnlocked:[false,false,false],goods:{fabric:0,spice:0,fruit:0,heirloom:0},
    familyPos:'Police Station',mosqueTiles:[],
    yellowRecallUsed:false,greenBonusUsed:false,redMosqueUsed:false,wainwrightRubyTaken:false});
  localStorage.setItem('istanbul-game-count',String(players.length));
  winnerTarget=players.length===2?6:5;
  try{ ensureSultanCubes(); ensureThreePlayerBoardSlotLocks(); mirrorPlayerBoardLayout(); }catch(_){}
  addLog(`${PLAYER_LABELS[color]} joins — ${players.length} merchant${players.length===1?'':'s'} at the table.`);
  persistPlayerState();
  markPlayerCountButtons();
  renderAll();
  announceTurn(true);
}
refreshGameCodeUI();
renderSultanPalaceCubes();
renderDecks();
setLocked(true);
announceTurn(true);

// Fit-to-screen layout: scale tile-attached card stacks with the board, and
// keep every attached component aligned when the viewport is resized.
const FIT_REFERENCE_BOARD_WIDTH=1134; // board width the saved card scales were tuned at
function applyFitScale(){
  if(!document.body.classList.contains('fit'))return;
  const bw=board.getBoundingClientRect().width;
  if(bw>0) deckRoot.style.setProperty('--fit-k',String(bw/FIT_REFERENCE_BOARD_WIDTH));
}
function relayoutFit(){ applyFitScale(); try{ placeAttachments(); placePlayers(); updateReachable(); }catch(_){} }
relayoutFit();
requestAnimationFrame(relayoutFit);
window.addEventListener('load',relayoutFit);
let _resizeT=0;
window.addEventListener('resize',()=>{ clearTimeout(_resizeT); _resizeT=setTimeout(relayoutFit,120); });

/* ===================================================================
   MULTIPLAYER  —  host-authority.  The room creator's tab runs the real
   game and broadcasts a snapshot after every render; guests display it
   and forward their clicks, which the host replays on its own DOM.
   =================================================================== */
const MP = window.NET || null;

function mpSnapshot(){
  const panel=document.getElementById('game-panel');
  return {
    turn, gameOver, awaitingAction, actionInitiated, winnerTarget,
    layout: currentLayout.slice(),
    players: players.map(p=>({
      id:p.id, color:p.color, name:p.name,
      pos:(p._realPos||p.pos), hiddenPos:p._realPos?p.pos:null,
      assistants:p.assistants, left:(p.left||[]).slice(), familyPos:p.familyPos,
      coins:p.coins, rubies:p.rubies, goods:{...p.goods}, cartUnlocked:(p.cartUnlocked||[]).slice(),
      bonusHand:(p.bonusHand||[]).slice(), mosqueCardHand:(p.mosqueCardHand||[]).slice(),
      yellowRecallUsed:!!p.yellowRecallUsed, greenBonusUsed:!!p.greenBonusUsed,
      redMosqueUsed:!!p.redMosqueUsed, wainwrightRubyTaken:!!p.wainwrightRubyTaken,
      mosqueTiles:(p.mosqueTiles||[]).slice(),
    })),
    sultanCubes: JSON.parse(JSON.stringify(sultanCubes||{})),
    gemClaims: gemstoneLayers.filter(l=>l&&l.claimed).map(l=>l.id),
    palaceRubyIndex, gemstoneRubyIndex,
    panelHTML: panel ? panel.innerHTML : '',
    wheelbarrows: Object.fromEntries(players.map(p=>[p.color, playerBoardCardHTML(p)])),
    modalHTML: document.getElementById('choice-modal-backdrop')?.outerHTML || null,
    toast: document.getElementById('turn-toast')?.textContent || '',
  };
}

function mpApplySnapshot(s){
  players = s.players.map(pp=>({
    ...pp,
    pos: pp.hiddenPos || pp.pos,
    _realPos: pp.hiddenPos ? pp.pos : undefined,
    left: pp.left || [],
    goods: pp.goods || {fabric:0,spice:0,fruit:0,heirloom:0},
    bonusHand: pp.bonusHand || [], mosqueCardHand: pp.mosqueCardHand || [],
    cartUnlocked: pp.cartUnlocked || [false,false,false],
    bonusCards:(pp.bonusHand||[]).length,
  }));
  turn=s.turn; gameOver=s.gameOver; awaitingAction=s.awaitingAction;
  actionInitiated=s.actionInitiated; winnerTarget=s.winnerTarget;
  if(Array.isArray(s.layout)&&s.layout.length===locations.length) currentLayout=s.layout.slice();
  sultanCubes=s.sultanCubes||{};
  palaceRubyIndex=s.palaceRubyIndex; gemstoneRubyIndex=s.gemstoneRubyIndex;
  const claimed=new Set(s.gemClaims||[]);
  gemstoneLayers.forEach(l=>{ if(l){ if(claimed.has(l.id)) l.claimed=true; else delete l.claimed; } });

  render();                       // rebuild the 16 tiles from currentLayout
  placePlayers(); updateReachable();
  try{ renderSultanPalaceCubes(); }catch(_){}
  try{ renderGemClaims(); }catch(_){}
  renderDecks();
  requestAnimationFrame(()=>{ try{ placeAttachments(); applyFitScale(); }catch(_){} });

  const panel=document.getElementById('game-panel');
  if(panel && s.panelHTML!=null) panel.innerHTML=s.panelHTML;

  const my=MP.myColor;
  const mine=players.find(p=>p.color===my)||activePlayer()||players[0];
  if(mine){ boardsEl.innerHTML=playerBoardCardHTML(mine); bindPlayerBoardsInteractions(); }

  document.getElementById('choice-modal-backdrop')?.remove();
  if(s.modalHTML) document.body.insertAdjacentHTML('beforeend', s.modalHTML);

  mpSetTurnGate();
  mpToast(s.toast);
}

function mpToast(text){
  const el=document.getElementById('turn-toast');
  if(!el||!text) return;
  if(mpToast._last===text) return;
  mpToast._last=text;
  el.textContent=text; el.hidden=false;
  requestAnimationFrame(()=>el.classList.add('show'));
  clearTimeout(mpToast._t);
  mpToast._t=setTimeout(()=>el.classList.remove('show'), 2400);
}

// Grey out every action control unless it is the local player's turn.
function mpSetTurnGate(){
  if(!MP || MP.role==='solo') return;
  const mine = activePlayer() && activePlayer().color===MP.myColor;
  document.body.classList.toggle('mp-not-my-turn', !mine && !gameOver);
  document.body.classList.toggle('mp-my-turn', !!mine && !gameOver);
}

// ---- click describe / replay -------------------------------------
function mpDescribeClick(target){
  const t=target.closest?.('.tile[data-location],#do-action,#end-turn,#roll-tea,#roll-black,#return-fountain,.choice-modal-btn,.good-pick,[data-dice-mod],.bonus-card-chip[data-bonus-card]');
  if(!t) return null;
  if(t.dataset && t.dataset.location) return {kind:'tile', loc:t.dataset.location};
  if(t.classList.contains('choice-modal-btn')) return {kind:'modal', i:t.dataset.i};
  if(t.classList.contains('good-pick')) return {kind:'good', g:t.dataset.good||t.dataset.blackGood||''};
  if(t.dataset && t.dataset.diceMod) return {kind:'dmod', v:t.dataset.diceMod};
  if(t.dataset && t.dataset.bonusCard) return {kind:'card', id:t.dataset.bonusCard};
  if(t.id) return {kind:'id', id:t.id};
  return null;
}
function mpReplayClick(from, d){
  const ap=activePlayer();
  if(!ap || ap.color!==from) return;          // not that player's turn — ignore
  let el=null;
  const q=s=>document.querySelector(s);
  if(d.kind==='tile') el=q(`.tile[data-location="${(window.CSS&&CSS.escape)?CSS.escape(d.loc):d.loc}"]`);
  else if(d.kind==='id') el=document.getElementById(d.id);
  else if(d.kind==='modal') el=q(`#choice-modal-backdrop .choice-modal-btn[data-i="${d.i}"]`);
  else if(d.kind==='good') el=q(`.good-pick[data-good="${d.g}"]`)||q(`.good-pick[data-black-good="${d.g}"]`);
  else if(d.kind==='dmod') el=q(`[data-dice-mod="${d.v}"]`);
  else if(d.kind==='card') el=q(`.bonus-card-chip[data-bonus-card="${d.id}"]`);
  else if(d.kind==='val'){ const i=document.getElementById(d.id); if(i) i.value=d.value; return; }
  else if(d.kind==='fpick'){ const c=[...document.querySelectorAll('.fountain-pick')].find(x=>x.value===d.value); if(c) c.checked=d.checked; return; }
  if(el) el.click();
}

if(MP){
  // Callbacks/wrappers are installed now but each checks MP.role at call time —
  // the lobby only decides host vs guest vs solo after the page has loaded.
  // ---- guest: forward clicks, never run the game locally ----
  document.addEventListener('click', e=>{
    if(MP.role!=='guest') return;
    if(e.target.closest?.('#mp-lobby,#wb-open-btn,.wb-modal-close,.wb-modal-backdrop,#copy-code,#mp-copy-link')) return;
    const d=mpDescribeClick(e.target);
    if(!d) return;
    e.preventDefault(); e.stopPropagation();
    MP.sendInput(d);                    // host validates it is this player's turn
  }, true);
  document.addEventListener('change', e=>{
    if(MP.role!=='guest') return;
    const el=e.target;
    if(el.id==='tea-target') MP.sendInput({kind:'val', id:'tea-target', value:el.value});
    else if(el.classList && el.classList.contains('fountain-pick')) MP.sendInput({kind:'fpick', value:el.value, checked:el.checked});
  }, true);

  MP.onState = s=>{ if(MP.role==='guest') mpApplySnapshot(s); };
  MP.onInput = ({from, action})=>{ if(MP.role==='host'){ mpReplayClick(from, action); } };

  // ---- host: broadcast after every render, once started ----
  let _bcT=0;
  MP.scheduleBroadcast = ()=>{ clearTimeout(_bcT); _bcT=setTimeout(()=>{ try{ MP.sendState(mpSnapshot()); }catch(_){} }, 60); };
  const _renderAll=renderAll;
  renderAll=function(){ _renderAll.apply(this, arguments); mpSetTurnGate(); if(MP.role==='host'&&MP.hostStarted) MP.scheduleBroadcast(); };

  MP.onStart = roster=>{
    document.getElementById('mp-lobby')?.setAttribute('hidden','');
    if(MP.role==='host'){
      MP.hostStarted=true;
      newGame(Math.max(1, roster.length), {layout: gameSeed});
      // newGame's final render() defers token placement to a rAF; do it now so the
      // first broadcast carries a fully-drawn board even in a background tab.
      placePlayers(); updateReachable(); renderSultanPalaceCubes(); renderAll();
      announceTurn(true);
      MP.scheduleBroadcast();
    } else {
      // guest waits for the first snapshot
      mpSetTurnGate();
    }
  };
  MP.onHostLeft = ()=>{ mpToast('Host left — game paused'); };
}
