// =============================================
//  board.js  —  Board rendering
// =============================================

const Board = (() => {

  // Map square index → [row, col] in 11×11 grid
  function squareToGrid(idx) {
    if (idx >= 0  && idx <= 10) return [10, 10 - idx];          // bottom row  (right→left)
    if (idx >= 11 && idx <= 19) return [10 - (idx - 10), 0];    // left column (bottom→top)
    if (idx >= 20 && idx <= 30) return [0,  idx - 20];          // top row     (left→right)
    if (idx >= 31 && idx <= 39) return [idx - 30, 10];          // right column(top→bottom)
    return [5, 5];
  }

  // Determine if cell is on left/right edges (needs rotation indicator)
  function cellSide(idx) {
    if (idx >= 11 && idx <= 19) return 'left';
    if (idx >= 31 && idx <= 39) return 'right';
    return 'none';
  }

  function build() {
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';

    // 11×11 grid positions
    const cells = [];
    for (let r = 0; r < 11; r++) {
      cells[r] = [];
      for (let c = 0; c < 11; c++) {
        const cell = document.createElement('div');
        cell.style.gridRow    = `${r + 1}`;
        cell.style.gridColumn = `${c + 1}`;
        cells[r][c] = cell;
        boardEl.appendChild(cell);
      }
    }

    // Center
    const center = document.createElement('div');
    center.className = 'board-center';
    center.style.gridRow    = '2 / 11';
    center.style.gridColumn = '2 / 11';
    center.innerHTML = `<div style="text-align:center">
      <div class="board-center-text">MONOPOLY</div>
      <div class="board-center-sub">نسخة الأوقية</div>
    </div>`;
    boardEl.appendChild(center);

    // Fill each square
    SQUARES.forEach((sq, idx) => {
      const [r, c] = squareToGrid(idx);
      const cell = cells[r][c];
      cell.className = 'cell';
      cell.dataset.idx = idx;

      const side = cellSide(idx);

      if (sq.type === 'corner') {
        cell.classList.add('cell-corner');
        cell.innerHTML = `<span class="corner-icon">${sq.icon}</span>
          <span class="corner-label">${sq.name.replace('\n','<br>')}</span>`;
      }
      else if (sq.type === 'prop') {
        const grp = GROUPS[sq.group];
        const barHeight = (r === 0 || r === 10) ? '12px' : '30%';
        const barStyle  = (r === 0 || r === 10)
          ? `height:12px;width:100%;background:${grp.color};`
          : `height:100%;width:30%;background:${grp.color};`;

        if (r === 0 || r === 10) {
          // top/bottom rows — bar on top
          cell.innerHTML = `
            <div class="cell-color-bar" style="${barStyle}"></div>
            <div class="cell-name">${sq.name}</div>
            <div class="cell-price">${sq.price} ${CURRENCY}</div>
            <div class="cell-buildings" id="bld-${idx}"></div>
            <div class="cell-tokens" id="tok-${idx}"></div>`;
        } else if (side === 'left') {
          cell.innerHTML = `
            <div style="display:flex;height:100%;width:100%;flex-direction:row;align-items:stretch">
              <div style="width:30%;background:${grp.color};border-radius:2px 0 0 2px"></div>
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(90deg)">
                <div class="cell-name">${sq.name}</div>
                <div class="cell-price">${sq.price} ${CURRENCY}</div>
              </div>
            </div>
            <div class="cell-buildings" id="bld-${idx}"></div>
            <div class="cell-tokens" id="tok-${idx}"></div>`;
        } else if (side === 'right') {
          cell.innerHTML = `
            <div style="display:flex;height:100%;width:100%;flex-direction:row;align-items:stretch">
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotate(-90deg)">
                <div class="cell-name">${sq.name}</div>
                <div class="cell-price">${sq.price} ${CURRENCY}</div>
              </div>
              <div style="width:30%;background:${grp.color};border-radius:0 2px 2px 0"></div>
            </div>
            <div class="cell-buildings" id="bld-${idx}"></div>
            <div class="cell-tokens" id="tok-${idx}"></div>`;
        } else {
          cell.innerHTML = `
            <div class="cell-color-bar" style="${barStyle}"></div>
            <div class="cell-name">${sq.name}</div>
            <div class="cell-price">${sq.price} ${CURRENCY}</div>
            <div class="cell-buildings" id="bld-${idx}"></div>
            <div class="cell-tokens" id="tok-${idx}"></div>`;
        }
        cell.addEventListener('click', () => UI.showPropModal(idx));
      }
      else if (sq.type === 'station') {
        cell.classList.add('cell-station');
        cell.innerHTML = `
          <div class="cell-icon">${sq.icon}</div>
          <div class="cell-name">${sq.name}</div>
          <div class="cell-price">${sq.price} ${CURRENCY}</div>
          <div class="cell-tokens" id="tok-${idx}"></div>`;
        cell.addEventListener('click', () => UI.showPropModal(idx));
      }
      else if (sq.type === 'utility') {
        cell.classList.add('cell-utility');
        cell.innerHTML = `
          <div class="cell-icon">${sq.icon}</div>
          <div class="cell-name">${sq.name}</div>
          <div class="cell-price">${sq.price} ${CURRENCY}</div>
          <div class="cell-tokens" id="tok-${idx}"></div>`;
        cell.addEventListener('click', () => UI.showPropModal(idx));
      }
      else {
        // chance, chest, tax, corner
        if (!cell.querySelector('.cell-icon')) {
          cell.innerHTML = `
            <div class="cell-icon">${sq.icon || '?'}</div>
            <div class="cell-name">${sq.name}</div>
            <div class="cell-tokens" id="tok-${idx}"></div>`;
        }
      }
    });
  }

  function refreshTokens(players) {
    // Clear all token containers
    document.querySelectorAll('.cell-tokens').forEach(el => el.innerHTML = '');
    players.forEach((p, pi) => {
      if (p.bankrupt) return;
      const tokEl = document.getElementById(`tok-${p.position}`);
      if (tokEl) {
        const tok = document.createElement('div');
        tok.className = 'token';
        tok.style.background = p.color;
        tok.textContent = p.token;
        tok.title = p.name;
        tokEl.appendChild(tok);
      }
    });
  }

  function refreshBuildings(properties) {
    document.querySelectorAll('.cell-buildings').forEach(el => el.innerHTML = '');
    Object.entries(properties).forEach(([idx, prop]) => {
      const bldEl = document.getElementById(`bld-${idx}`);
      if (!bldEl) return;
      if (prop.houses === 5) {
        // hotel
        const h = document.createElement('div');
        h.className = 'hotel-chip';
        h.title = 'Hotel';
        bldEl.appendChild(h);
      } else {
        for (let i = 0; i < prop.houses; i++) {
          const h = document.createElement('div');
          h.className = 'house-chip';
          h.title = 'House';
          bldEl.appendChild(h);
        }
      }
    });
  }

  function refreshOwnerDots(properties, players) {
    document.querySelectorAll('.owner-dot').forEach(e => e.remove());
    document.querySelectorAll('.cell-mortgaged').forEach(e => e.classList.remove('cell-mortgaged'));
    Object.entries(properties).forEach(([idx, prop]) => {
      const [r, c] = squareToGrid(Number(idx));
      const cell = document.querySelector(`[data-idx="${idx}"]`);
      if (!cell) return;
      const dot = document.createElement('div');
      dot.className = 'owner-dot';
      dot.style.background = players[prop.owner].color;
      dot.title = `Owned by ${players[prop.owner].name}`;
      cell.appendChild(dot);
      if (prop.mortgaged) cell.classList.add('cell-mortgaged');
    });
  }

  return { build, refreshTokens, refreshBuildings, refreshOwnerDots, squareToGrid };
})();
