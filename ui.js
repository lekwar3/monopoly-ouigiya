// =============================================
//  ui.js  —  All UI rendering and modals
// =============================================

const UI = (() => {

  // ── Setup screen ──────────────────────────
  let selectedCount = 2;

  function initSetup() {
    document.querySelectorAll('.cnt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cnt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedCount = parseInt(btn.dataset.count);
        buildPlayerRows(selectedCount);
      });
    });
    buildPlayerRows(2);
  }

  function buildPlayerRows(n) {
    const container = document.getElementById('player-setup-rows');
    container.innerHTML = '';
    const defaultNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];
    for (let i = 0; i < n; i++) {
      const row = document.createElement('div');
      row.className = 'player-setup-row';
      row.innerHTML = `
        <div class="player-color-swatch" style="background:${PLAYER_COLORS[i]}"></div>
        <input class="setup-input" type="text" placeholder="${defaultNames[i]}" id="pname-${i}">
        <select class="token-select" id="ptoken-${i}">
          ${PLAYER_TOKENS.map((t,ti) => `<option value="${t}" ${ti===i?'selected':''}>${t}</option>`).join('')}
        </select>`;
      container.appendChild(row);
    }
  }

  function getSetupPlayers() {
    const players = [];
    for (let i = 0; i < selectedCount; i++) {
      const name  = document.getElementById(`pname-${i}`).value.trim() || `Player ${i+1}`;
      const token = document.getElementById(`ptoken-${i}`).value;
      players.push({ name, token, color: PLAYER_COLORS[i] });
    }
    return players;
  }

  // ── Screen switcher ───────────────────────
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  // ── Players list ──────────────────────────
  function renderPlayers(players, currentPlayer) {
    const list = document.getElementById('players-list');
    list.innerHTML = '';
    players.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'player-card'
        + (i === currentPlayer ? ' active-turn' : '')
        + (p.bankrupt ? ' bankrupt' : '');
      const sqName = (SQUARES[p.position].name || '').replace(/\n/g, ' ');
      const propCount = Object.values(window._gameState?.properties || {}).filter(pr => pr.owner === i).length;
      card.innerHTML = `
        <div class="p-token" style="background:${p.color}">${p.token}</div>
        <div class="p-info">
          <div class="p-name">${p.name}${p.bankrupt ? ' 💸' : ''}</div>
          <div class="p-pos">📍 ${sqName} · 🏠 ${propCount}</div>
        </div>
        <div class="p-money">${p.money.toLocaleString()} ${CURRENCY}</div>`;
      card.addEventListener('click', () => {
        if (!p.bankrupt) UI.showPlayerProperties(i, players);
      });
      list.appendChild(card);
    });
  }

  // ── Turn panel ────────────────────────────
  function renderTurn(player, isInJail) {
    document.getElementById('turn-avatar').style.background = player.color;
    document.getElementById('turn-avatar').textContent = player.token;
    document.getElementById('turn-name').textContent   = player.name;
    document.getElementById('turn-money').textContent  = player.money.toLocaleString() + ' ' + CURRENCY;
    document.getElementById('jail-notice').style.display = isInJail ? 'block' : 'none';
  }

  // ── Dice ──────────────────────────────────
  function animateDice(d1, d2) {
    const die1 = document.getElementById('die1');
    const die2 = document.getElementById('die2');
    const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    die1.classList.add('rolling');
    die2.classList.add('rolling');
    return new Promise(resolve => {
      setTimeout(() => {
        die1.classList.remove('rolling');
        die2.classList.remove('rolling');
        die1.textContent = faces[d1 - 1];
        die2.textContent = faces[d2 - 1];
        document.getElementById('dice-sum').textContent = `= ${d1 + d2}`;
        resolve();
      }, 500);
    });
  }

  function showDoubles(show) {
    document.getElementById('doubles-notice').style.display = show ? 'block' : 'none';
  }

  // ── Action buttons ────────────────────────
  function setActionButtons({ canRoll, canEnd, canJailPay, canTrade, canMortgage, canBankrupt }) {
    document.getElementById('btn-roll').disabled  = !canRoll;
    _setVis('btn-end',      canEnd);
    _setVis('btn-jail-pay', canJailPay);
    _setVis('btn-trade',    canTrade);
    _setVis('btn-mortgage', canMortgage);
    _setVis('btn-bankrupt', canBankrupt);
  }

  function _setVis(id, show) {
    document.getElementById(id).style.display = show ? 'block' : 'none';
  }

  // ── Log ───────────────────────────────────
  function log(msg, type) {
    // type: 'gain' | 'loss' | 'move' | ''
    const area = document.getElementById('game-log');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    let html = msg;
    if (type === 'gain')  html = `<span class="log-money-gain">${msg}</span>`;
    if (type === 'loss')  html = `<span class="log-money-loss">${msg}</span>`;
    if (type === 'hl')    html = `<span class="log-hl">${msg}</span>`;
    entry.innerHTML = html;
    area.prepend(entry);
  }

  // ── Property Modal ────────────────────────
  let _propModalPendingBuy = null;
  let _propModalPendingBuild = null;

  function showPropModal(idx, { canBuy = false, canBuild = false, canAuction = false } = {}) {
    const sq   = SQUARES[idx];
    const prop = window._gameState?.properties[idx];
    const players = window._gameState?.players || [];

    // Color band
    let bandColor = '#555';
    if (sq.group && GROUPS[sq.group]) bandColor = GROUPS[sq.group].color;
    else if (sq.type === 'station')   bandColor = '#4a5568';
    else if (sq.type === 'utility')   bandColor = '#744210';
    document.getElementById('prop-color-band').style.background = bandColor;

    document.getElementById('prop-modal-icon').textContent = sq.icon || '';
    document.getElementById('prop-modal-name').textContent = sq.name.replace(/\n/g, ' ');
    document.getElementById('prop-modal-type').textContent =
      sq.type === 'station' ? 'CARAFOR STATION' :
      sq.type === 'utility' ? 'UTILITY' :
      sq.group ? `${GROUPS[sq.group].name.toUpperCase()} PROPERTY` : '';

    // Rent table
    const tbl = document.getElementById('prop-rent-table');
    tbl.innerHTML = '';
    if (sq.type === 'prop' && sq.rent) {
      const houseCount = prop?.houses || 0;
      const labels = ['Base Rent', '1 House', '2 Houses', '3 Houses', '4 Houses', 'Hotel'];
      sq.rent.forEach((r, i) => {
        const row = document.createElement('div');
        row.className = 'rent-row' + (i === houseCount ? ' active' : '');
        row.innerHTML = `<span class="rl">${labels[i]}</span><span class="rv">${r} ${CURRENCY}</span>`;
        tbl.appendChild(row);
      });
      if (sq.group) {
        const grp = GROUPS[sq.group];
        const row = document.createElement('div');
        row.className = 'rent-row';
        row.innerHTML = `<span class="rl">House cost</span><span class="rv">${grp.houseCost} ${CURRENCY}</span>`;
        tbl.appendChild(row);
      }
    } else if (sq.type === 'station') {
      [1,2,3,4].forEach(n => {
        const row = document.createElement('div');
        row.className = 'rent-row';
        row.innerHTML = `<span class="rl">${n} station${n>1?'s':''}</span><span class="rv">${STATION_RENT[n]} ${CURRENCY}</span>`;
        tbl.appendChild(row);
      });
    } else if (sq.type === 'utility') {
      const row1 = document.createElement('div');
      row1.className = 'rent-row';
      row1.innerHTML = `<span class="rl">1 utility (×dice)</span><span class="rv">×${UTILITY_RENT_MULT[1]}</span>`;
      const row2 = document.createElement('div');
      row2.className = 'rent-row';
      row2.innerHTML = `<span class="rl">2 utilities (×dice)</span><span class="rv">×${UTILITY_RENT_MULT[2]}</span>`;
      tbl.appendChild(row1);
      tbl.appendChild(row2);
    }
    if (sq.price) {
      const row = document.createElement('div');
      row.className = 'rent-row';
      row.innerHTML = `<span class="rl">Purchase Price</span><span class="rv">${sq.price} ${CURRENCY}</span>`;
      tbl.appendChild(row);
      const rowM = document.createElement('div');
      rowM.className = 'rent-row';
      rowM.innerHTML = `<span class="rl">Mortgage Value</span><span class="rv">${Math.floor(sq.price/2)} ${CURRENCY}</span>`;
      tbl.appendChild(rowM);
    }

    // Owner info
    const ownerEl = document.getElementById('prop-modal-owner');
    if (prop) {
      const owner = players[prop.owner];
      ownerEl.innerHTML = `<span style="color:${owner.color}">●</span> Owned by <strong>${owner.name}</strong>
        ${prop.mortgaged ? '<span style="color:#fc8181"> — MORTGAGED</span>' : ''}
        ${prop.houses > 0 ? `· ${prop.houses === 5 ? '🏨 Hotel' : `🏠 ×${prop.houses}`}` : ''}`;
      ownerEl.style.display = 'block';
    } else {
      ownerEl.style.display = 'none';
    }

    // Action buttons
    const acts = document.getElementById('prop-modal-actions');
    acts.innerHTML = '';

    if (canBuy && !prop) {
      const btn = document.createElement('button');
      btn.className = 'btn-action btn-primary';
      btn.textContent = `Buy — ${sq.price} ${CURRENCY}`;
      btn.onclick = () => { Game.buyProperty(idx); closePropModal(); };
      acts.appendChild(btn);
    }

    if (canAuction && !prop) {
      const btn = document.createElement('button');
      btn.className = 'btn-action btn-secondary';
      btn.textContent = 'Auction';
      btn.onclick = () => { closePropModal(); Game.startAuction(idx); };
      acts.appendChild(btn);
    }

    if (canBuild && prop && !prop.mortgaged && sq.type === 'prop') {
      const grp = GROUPS[sq.group];
      const houses = prop.houses || 0;
      if (houses < 5) {
        const label = houses === 4 ? `Build Hotel — ${grp.hotelCost} ${CURRENCY}` : `Build House — ${grp.houseCost} ${CURRENCY}`;
        const btn = document.createElement('button');
        btn.className = 'btn-action btn-trade';
        btn.textContent = label;
        btn.onclick = () => { Game.buildHouse(idx); closePropModal(); };
        acts.appendChild(btn);
      }
      if (houses > 0) {
        const btn2 = document.createElement('button');
        btn2.className = 'btn-action btn-secondary';
        btn2.textContent = houses === 5 ? 'Demolish Hotel' : 'Sell House';
        btn2.onclick = () => { Game.sellHouse(idx); closePropModal(); };
        acts.appendChild(btn2);
      }
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-action btn-secondary';
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => closePropModal();
    acts.appendChild(closeBtn);

    document.getElementById('prop-modal').classList.add('open');
  }

  function closePropModal(e) {
    if (e && e.target !== document.getElementById('prop-modal')) return;
    document.getElementById('prop-modal').classList.remove('open');
  }

  // ── Card Modal ────────────────────────────
  let _cardCallback = null;

  function showCardModal(card, effectText, effectType, callback) {
    const isChance = card._deck === 'chance';
    document.getElementById('card-icon').textContent  = isChance ? '❓' : '💼';
    document.getElementById('card-type').textContent  = isChance ? 'CHANCE' : 'COMMUNITY CHEST';
    document.getElementById('card-text').textContent  = card.text;
    const effEl = document.getElementById('card-effect');
    effEl.textContent  = effectText;
    effEl.className    = 'card-modal-effect ' + (effectType || '');
    _cardCallback = callback;
    document.getElementById('card-modal').classList.add('open');
  }

  function closeCardModal() {
    document.getElementById('card-modal').classList.remove('open');
    if (_cardCallback) { _cardCallback(); _cardCallback = null; }
  }

  // ── Trade Modal ───────────────────────────
  let _tradeOfferProps  = new Set();
  let _tradeRecvProps   = new Set();

  function openTradeModal() {
    const gs = window._gameState;
    if (!gs) return;
    _tradeOfferProps = new Set();
    _tradeRecvProps  = new Set();
    document.getElementById('trade-offer-cash').value = 0;
    document.getElementById('trade-recv-cash').value  = 0;

    // Offer title
    document.getElementById('trade-offer-title').textContent = gs.players[gs.currentPlayer].name + '\'s Offer';

    // Target player select
    const sel = document.getElementById('trade-target-select');
    sel.innerHTML = '';
    gs.players.forEach((p, i) => {
      if (i !== gs.currentPlayer && !p.bankrupt) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = p.name;
        sel.appendChild(opt);
      }
    });

    _buildTradeProps();
    document.getElementById('trade-modal').classList.add('open');
  }

  function _buildTradeProps() {
    const gs = window._gameState;
    if (!gs) return;
    const cp = gs.currentPlayer;
    const tp = parseInt(document.getElementById('trade-target-select').value);

    // Offer side
    const offerEl = document.getElementById('trade-offer-props');
    offerEl.innerHTML = '';
    Object.entries(gs.properties).forEach(([idx, prop]) => {
      if (prop.owner !== cp) return;
      const sq = SQUARES[idx];
      const item = document.createElement('div');
      item.className = 'trade-prop-item' + (_tradeOfferProps.has(Number(idx)) ? ' selected' : '');
      const dotColor = sq.group ? GROUPS[sq.group].color : '#888';
      item.innerHTML = `<div class="trade-prop-dot" style="background:${dotColor}"></div>${sq.name.replace(/\n/g,' ')}`;
      item.onclick = () => {
        const n = Number(idx);
        _tradeOfferProps.has(n) ? _tradeOfferProps.delete(n) : _tradeOfferProps.add(n);
        _buildTradeProps();
      };
      offerEl.appendChild(item);
    });

    // Recv side
    const recvEl = document.getElementById('trade-recv-props');
    recvEl.innerHTML = '';
    if (!isNaN(tp)) {
      Object.entries(gs.properties).forEach(([idx, prop]) => {
        if (prop.owner !== tp) return;
        const sq = SQUARES[idx];
        const item = document.createElement('div');
        item.className = 'trade-prop-item' + (_tradeRecvProps.has(Number(idx)) ? ' selected' : '');
        const dotColor = sq.group ? GROUPS[sq.group].color : '#888';
        item.innerHTML = `<div class="trade-prop-dot" style="background:${dotColor}"></div>${sq.name.replace(/\n/g,' ')}`;
        item.onclick = () => {
          const n = Number(idx);
          _tradeRecvProps.has(n) ? _tradeRecvProps.delete(n) : _tradeRecvProps.add(n);
          _buildTradeProps();
        };
        recvEl.appendChild(item);
      });
    }
  }

  function updateTradeTarget() { _buildTradeProps(); }

  function getTradeData() {
    return {
      targetPlayer: parseInt(document.getElementById('trade-target-select').value),
      offerCash:    parseInt(document.getElementById('trade-offer-cash').value) || 0,
      recvCash:     parseInt(document.getElementById('trade-recv-cash').value) || 0,
      offerProps:   [..._tradeOfferProps],
      recvProps:    [..._tradeRecvProps],
    };
  }

  function closeTradeModal(e) {
    if (e && e.target !== document.getElementById('trade-modal')) return;
    document.getElementById('trade-modal').classList.remove('open');
  }

  // ── Mortgage Panel ────────────────────────
  function openMortgagePanel() {
    const gs = window._gameState;
    if (!gs) return;
    const list = document.getElementById('mortgage-list');
    list.innerHTML = '';
    const cp = gs.currentPlayer;
    const myProps = Object.entries(gs.properties).filter(([, p]) => p.owner === cp);

    if (myProps.length === 0) {
      list.innerHTML = '<p style="color:var(--muted);font-size:0.82rem;padding:1rem">No properties owned.</p>';
    }

    myProps.forEach(([idx, prop]) => {
      const sq = SQUARES[idx];
      const dotColor = sq.group ? GROUPS[sq.group].color : '#888';
      const mortgageVal = Math.floor(sq.price / 2);
      const unmortgageVal = Math.floor(mortgageVal * 1.1);
      const item = document.createElement('div');
      item.className = 'mortgage-item';
      item.innerHTML = `
        <div class="mortgage-dot" style="background:${dotColor}"></div>
        <div class="mortgage-name">${sq.name.replace(/\n/g,' ')} ${prop.mortgaged ? '<span style="color:#fc8181">(M)</span>' : ''}</div>
        <div class="mortgage-val">${prop.mortgaged ? unmortgageVal : mortgageVal} ${CURRENCY}</div>
        <button class="btn-mortgage-toggle" onclick="Game.toggleMortgage(${idx}); UI.openMortgagePanel()">
          ${prop.mortgaged ? 'Unmortgage' : 'Mortgage'}
        </button>`;
      list.appendChild(item);
    });

    document.getElementById('mortgage-modal').classList.add('open');
  }

  function closeMortgagePanel(e) {
    if (e && e.target !== document.getElementById('mortgage-modal')) return;
    document.getElementById('mortgage-modal').classList.remove('open');
  }

  // ── Auction Modal ─────────────────────────
  function openAuctionModal(sq, bidHistory, currentBid, currentBidder, activeBidder) {
    document.getElementById('auction-prop-name').textContent = sq.name.replace(/\n/g,' ');
    document.getElementById('auction-current').textContent =
      `Current bid: ${currentBid} ${CURRENCY}`;
    document.getElementById('auction-bidder').textContent =
      currentBidder !== null ? `Highest bidder: ${currentBidder}` : 'No bids yet';
    const bidsEl = document.getElementById('auction-bids');
    bidsEl.innerHTML = bidHistory.map(b => `<div>${b}</div>`).join('');
    document.getElementById('auction-bid-input').placeholder = `Min: ${currentBid + 1}`;
    document.getElementById('auction-bidder').style.display = currentBidder ? 'block' : 'none';

    const aEl = document.querySelector('.auction-controls .btn-action.btn-secondary');
    if (aEl) aEl.textContent = `Pass (${activeBidder})`;
    document.getElementById('auction-modal').classList.add('open');
  }

  function closeAuctionModal() {
    document.getElementById('auction-modal').classList.remove('open');
  }

  // ── Winner screen ─────────────────────────
  function showWinner(player, stats) {
    document.getElementById('winner-name').textContent  = `${player.token} ${player.name}`;
    document.getElementById('winner-stats').innerHTML = stats;
    showScreen('winner-screen');
  }

  // ── Player Properties list ────────────────
  function showPlayerProperties(pi, players) {
    const gs = window._gameState;
    if (!gs) return;
    const p = players[pi];
    const myProps = Object.entries(gs.properties)
      .filter(([, pr]) => pr.owner === pi)
      .map(([idx]) => `<div style="font-size:0.78rem;padding:2px 0;color:var(--text)">${SQUARES[idx].name.replace(/\n/g,' ')}</div>`)
      .join('');
    alert(`${p.token} ${p.name}\nMoney: ${p.money} ${CURRENCY}\nProperties:\n${Object.entries(gs.properties).filter(([,pr])=>pr.owner===pi).map(([idx])=>SQUARES[idx].name.replace(/\n/g,' ')).join(', ') || 'None'}`);
  }

  return {
    initSetup, getSetupPlayers, showScreen,
    renderPlayers, renderTurn,
    animateDice, showDoubles,
    setActionButtons, log,
    showPropModal, closePropModal,
    showCardModal, closeCardModal,
    openTradeModal, closeTradeModal, updateTradeTarget, getTradeData,
    openMortgagePanel, closeMortgagePanel,
    openAuctionModal, closeAuctionModal,
    showWinner,
    showPlayerProperties,
  };
})();

// Init setup on load
document.addEventListener('DOMContentLoaded', () => UI.initSetup());
