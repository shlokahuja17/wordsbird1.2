(function(){
  // Maze Chase heavyweight relocation fix
  // - Watches #maze-grid for newly spawned .mc-heavy tiles
  // - If a heavyweight is unreachable from the player, relocates it to the nearest reachable path tile
  // Notes: drop this file in the repo and include it in words-bird_6.html (add
  // <script src="/mazechase-fix.js"></script> before </body>)

  function gridDimensions(){
    var grid = document.getElementById('maze-grid');
    if(!grid) return null;
    var cols = 0;
    try{
      var cs = getComputedStyle(grid).gridTemplateColumns;
      if(cs) cols = cs.split(/\s+/).length;
    }catch(e){}
    var children = grid.children.length;
    if(!cols) cols = Math.round(Math.sqrt(children)) || 0;
    if(cols===0) return null;
    return {width: cols, height: Math.ceil(children/cols)};
  }

  function neighbors(index, w, h){
    var r = Math.floor(index / w), c = index % w;
    var out = [];
    [[0,1],[0,-1],[1,0],[-1,0]].forEach(function(d){
      var rr = r + d[0], cc = c + d[1];
      if(rr>=0 && rr<h && cc>=0 && cc<w) out.push(rr*w + cc);
    });
    return out;
  }

  function isWalkableIndex(i, cells){
    var el = cells[i];
    if(!el) return false;
    if(el.classList.contains('mc-wall')) return false;
    // treat immovable blocks and enemies as obstacles
    if(el.classList.contains('mc-block')) return false;
    if(el.classList.contains('mc-enemy')) return false;
    return true;
  }

  function reachableFrom(playerIndex, w, h, cells){
    var q = [playerIndex];
    var vis = new Uint8Array(cells.length);
    if(playerIndex<0 || playerIndex>=cells.length){ return {vis:vis, order:[]} }
    vis[playerIndex]=1;
    for(var qi=0; qi<q.length; qi++){
      var cur = q[qi];
      var neigh = neighbors(cur,w,h);
      for(var j=0;j<neigh.length;j++){
        var ni = neigh[j];
        if(vis[ni]) continue;
        if(!isWalkableIndex(ni,cells)) continue;
        vis[ni]=1; q.push(ni);
      }
    }
    return {vis:vis, order:q};
  }

  function relocateHeavyIfUnreachable(){
    var grid = document.getElementById('maze-grid'); if(!grid) return;
    var cells = Array.prototype.slice.call(grid.children);
    var dims = gridDimensions(); if(!dims) return;
    var w = dims.width, h = dims.height;
    // find player index
    var playerIndex = cells.findIndex(function(el){ return el && el.classList.contains('mc-player'); });
    if(playerIndex < 0) return;

    var heavyIndices = [];
    cells.forEach(function(el,i){ if(el && el.classList.contains('mc-heavy')) heavyIndices.push(i); });
    if(heavyIndices.length===0) return;

    var reach = reachableFrom(playerIndex,w,h,cells);

    heavyIndices.forEach(function(hidx){
      if(reach.vis[hidx]) return; // already reachable
      // find nearest reachable path/letter tile using BFS order
      var candidate = null;
      for(var k=0;k<reach.order.length;k++){
        var ii = reach.order[k];
        if(ii===playerIndex) continue;
        var el = cells[ii];
        if(!el) continue;
        if((el.classList.contains('mc-path') || el.classList.contains('mc-letter')) && !el.classList.contains('mc-heavy')){
          candidate = ii; break;
        }
      }
      // fallback: any reachable non-player
      if(candidate===null){
        for(var k=0;k<reach.order.length;k++){ var ii = reach.order[k]; if(ii!==playerIndex){ candidate = ii; break; } }
      }

      if(candidate!==null){
        try{
          cells[hidx].classList.remove('mc-heavy');
          cells[candidate].classList.add('mc-heavy');
          // optional: move contents (if heavy has inner text or children), adapt if needed
          // update any UI counters if present
          var display = document.getElementById('mc-heavy-count');
          if(display && display.dataset && display.dataset.lastUpdate!==String(candidate)){
            display.dataset.lastUpdate = String(candidate);
          }
          console.info('maze-fix: moved mc-heavy from', hidx, 'to', candidate);
        }catch(e){ console.warn('maze-fix: relocate failed', e); }
      } else {
        console.warn('maze-fix: no reachable candidate to relocate heavy');
      }
    });
  }

  function setupObserver(){
    var grid = document.getElementById('maze-grid');
    if(!grid) return;
    var mo = new MutationObserver(function(muts){
      var added=false;
      muts.forEach(function(m){ if(m.addedNodes && m.addedNodes.length) added=true; });
      if(added) setTimeout(relocateHeavyIfUnreachable, 60);
    });
    mo.observe(grid, {childList:true, subtree:false});
    // periodic safety check
    setInterval(relocateHeavyIfUnreachable, 1000);
    // initial run after DOM ready
    setTimeout(relocateHeavyIfUnreachable, 120);
  }

  if(document.readyState==='complete' || document.readyState==='interactive') setupObserver();
  else document.addEventListener('DOMContentLoaded', setupObserver);
})();
