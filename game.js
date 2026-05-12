// =============================================
//  game.js  —  All game logic
// =============================================

const Game = (() => {

  // ── State ─────────────────────────────────
  let state = null;
  window._gameState = null;

  function _sync() { window._gameState = state; }

  function _fresh() {
    return {
      players:       [],       // { name, token, color, money, position, bankrupt, jailTurns }
      currentPlayer: 0,
      properties:    {},       // idx → { owner, houses, mortgaged }
      rolled:        false,
      doublesCount:  0,
      phase:         'roll',   // 'roll' | 'action' | 'auction' | 'card'
      lastDice:      [1, 1],
      chanceIdx:     0,
      chestIdx:      0,
      // auction state
      auction:       null,
    };
  }

  // ── Start ─────────────────────────────────
  function start() {
    const setupPlayers = UI.getSetupPlayers();
    if (setupPlayers.length < 2) { alert('Need at least 2 players!'); return; }

    state = _fresh();
    setupPlayers.forEach(p => {
      state.players.push({
        name: p.name, token: p.token, color: p.color,
        money: START_MONEY, position: 0, bankrupt: false, jailTurns: 0,
      });
    });
    _sync();

    UI.showScreen('game-screen');
    Board.build();
    _refresh();
    _updateButtons();
    UI.log('🎲 Game started! Each player starts with ' + START_MONEY + ' ' + CURRENCY, 'hl');
  }

  // ── New Game ──────────────────────────────
  function newGame() {
    state = null;
    window._gameState = null;
    UI.showScreen('setup-screen');
  }

  // ── Helpers ───────────────────────────────
  function _cp() { return state.players[state.currentPlayer]; }
  function _cpi() { return state.currentPlayer; }

  function _refresh() {
    _sync();
    Board.refreshTokens(state.players);
    Board.refreshBuildings(state.properties);
    Board.refreshOwnerDots(state.properties, state.players);
    UI.renderPlayers(state.players, state.currentPlayer);
    UI.renderTurn(_cp(), _cp().jailTurns > 0);
  }

  function _updateButtons() {
    const p = _cp();
    const inJail = p.jailTurns > 0;
    UI.setActionButtons({
      canRoll:     state.phase === 'roll' && !state.rolled,
      canEnd:      state.phase === 'action',
      canJailPay:  state.phase === 'roll' && inJail && p.money >= JAIL_FINE,
      canTrade:    state.phase === 'action',
      canMortgage: state.phase === 'action',
      canBankrupt: state.phase === 'action',
    });
  }

  // ── Roll Dice ─────────────────────────────
  async function rollDice() {
    if (state.rolled || state.phase !== 'roll') return;

    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const isDoubles = (d1 === d2);
    state.lastDice = [d1, d2];

    // disable roll button immediately
    document.getElementById('btn-roll').disabled = true;

    await UI.animateDice(d1, d2);

    const p = _cp();
    const total = d1 + d2;
    UI.log(`${p.token} ${p.name} rolled ${d1}+${d2}=${total}${isDoubles ? ' 🎉 DOUBLES!' : ''}`);

    // Three doubles → jail
    if (isDoubles) {
      state.doublesCount++;
      if (state.doublesCount >= 3) {
        UI.log(`${p.name} rolled doubles 3 times — sent to Habis!`, 'loss');
        state.doublesCount = 0;
        _sendToJail(_cpi());
        state.phase = 'action';
        state.rolled = true;
        _refresh();
        _updateButtons();
        return;
      }
    } else {
      state.doublesCount = 0;
    }

    // Jail logic
    if (p.jailTurns > 0) {
      if (isDoubles) {
        p.jailTurns = 0;
        UI.log(`${p.name} rolled doubles and escaped Habis!`, 'gain');
      } else {
        p.jailTurns++;
        UI.log(`${p.name} stays in Habis (turn ${p.jailTurns}).`);
        if (p.jailTurns > MAX_JAIL_TURNS) {
          p.money -= JAIL_FINE;
          p.jailTurns = 0;
          UI.log(`${p.name} paid ${JAIL_FINE} ${CURRENCY} to leave Habis.`, 'loss');
          _checkBankruptcy(_cpi());
        }
        state.rolled = true;
        state.phase = 'action';
        _refresh();
        _updateButtons();
        return;
      }
    }

    // Move
    const oldPos = p.position;
    const newPos = (oldPos + total) % 40;

    if (newPos < oldPos && !(p.jailTurns > 0)) {
      p.money += GO_SALARY;
      UI.log(`${p.name} passed GO — collected ${GO_SALARY} ${CURRENCY}!`, 'gain');
    }

    p.position = newPos;
    _refresh();

    // If doubles, player rolls again (but land first)
    state.rolled = !isDoubles;
    if (isDoubles) UI.showDoubles(true);
    else           UI.showDoubles(false);

    // Land on square
    await _landOn(_cpi(), newPos, total);

    if (!isDoubles) {
      state.phase = 'action';
    }
    _refresh();
    _updateButtons();
  }

  // ── Land On ───────────────────────────────
  async function _landOn(pi, pos, diceTotal) {
    const sq = SQUARES[pos];
    const p  = state.players[pi];
    UI.log(`${p.token} ${p.name} → ${sq.name.replace(/\n/g,' ')}`);

    if (sq.type === 'corner') {
      if (sq.action === 'gotojail') {
        _sendToJail(pi);
        UI.log(`${p.name} is sent to Habis Dar Na3im! ⛓️`, 'loss');
      }
      return;
    }

    if (sq.type === 'tax') {
      const tax = sq.amount;
      p.money -= tax;
      UI.log(`${p.name} paid ${tax} ${CURRENCY} tax.`, 'loss');
      _checkBankruptcy(pi);
      return;
    }

    if (sq.type === 'chance')  { await _drawCard('chance', pi, diceTotal); return; }
    if (sq.type === 'chest')   { await _drawCard('chest',  pi, diceTotal); return; }

    if (sq.type === 'utility') {
      await _handleBuyable(pi, pos, diceTotal);
      return;
    }

    if (sq.type === 'station') {
      await _handleBuyable(pi, pos, diceTotal);
      return;
    }

    if (sq.type === 'prop') {
      await _handleBuyable(pi, pos, diceTotal);
      return;
    }
  }

  async function _handleBuyable(pi, pos, diceTotal) {
    const sq   = SQUARES[pos];
    const prop = state.properties[pos];
    const p    = state.players[pi];

    if (!prop) {
      // Unowned — offer to buy
      _showBuyModal(pi, pos);
    } else if (prop.owner !== pi && !prop.mortgaged) {
      // Pay rent
      const rent = _calcRent(pos, diceTotal);
      const owner = state.players[prop.owner];
      p.money     -= rent;
      owner.money += rent;
      UI.log(`${p.name} paid ${rent} ${CURRENCY} rent to ${owner.name}.`, 'loss');
      UI.log(`${owner.name} received ${rent} ${CURRENCY} rent.`, 'gain');
      _checkBankruptcy(pi);
    } else if (prop.owner === pi) {
      UI.log(`${p.name} owns this property.`);
    } else if (prop.mortgaged) {
      UI.log(`${sq.name.replace(/\n/g,' ')} is mortgaged — no rent.`);
    }
  }

  function _showBuyModal(pi, pos) {
    const sq = SQUARES[pos];
    const p  = state.players[pi];
    const canBuy = p.money >= sq.price;
    UI.showPropModal(pos, { canBuy, canAuction: true, canBuild: false });
  }

  function _calcRent(pos, diceTotal) {
    const sq   = SQUARES[pos];
    const prop = state.properties[pos];

    if (sq.type === 'station') {
      const owner = prop.owner;
      const count = STATION_POSITIONS.filter(s => state.properties[s]?.owner === owner).length;
      return STATION_RENT[count] || 25;
    }

    if (sq.type === 'utility') {
      const owner = prop.owner;
      const count = UTILITY_POSITIONS.filter(u => state.properties[u]?.owner === owner).length;
      return (UTILITY_RENT_MULT[count] || 4) * diceTotal;
    }

    // Property
    const houses = prop.houses || 0;
    let rent = sq.rent[houses];
    // Double rent if monopoly and no houses
    if (houses === 0 && _hasMonopoly(prop.owner, sq.group)) rent *= 2;
    return rent;
  }

  function _hasMonopoly(owner, group) {
    if (!group) return false;
    const groupProps = SQUARES.filter((s, i) => s.group === group);
    return groupProps.every((s, i) => {
      const idx = SQUARES.indexOf(s);
      return state.properties[idx]?.owner === owner;
    });
  }

  // ── Buy Property ──────────────────────────
  function buyProperty(idx) {
    const sq = SQUARES[idx];
    const p  = _cp();
    if (p.money < sq.price) { alert('Not enough money!'); return; }
    p.money -= sq.price;
    state.properties[idx] = { owner: _cpi(), houses: 0, mortgaged: false };
    UI.log(`${p.name} bought ${sq.name.replace(/\n/g,' ')} for ${sq.price} ${CURRENCY}.`, 'loss');
    _refresh();
  }

  // ── Build / Sell Houses ───────────────────
  function buildHouse(idx) {
    const sq   = SQUARES[idx];
    const prop = state.properties[idx];
    const grp  = GROUPS[sq.group];
    const p    = _cp();

    if (!_hasMonopoly(_cpi(), sq.group)) {
      alert('You need all properties in the group to build!'); return;
    }
    if (prop.houses >= 5) { alert('Already has a hotel!'); return; }
    const cost = prop.houses === 4 ? grp.hotelCost : grp.houseCost;
    if (p.money < cost) { alert('Not enough money!'); return; }

    p.money -= cost;
    prop.houses++;
    const label = prop.houses === 5 ? 'hotel' : `house #${prop.houses}`;
    UI.log(`${p.name} built a ${label} on ${sq.name.replace(/\n/g,' ')}.`, 'loss');
    _refresh();
  }

  function sellHouse(idx) {
    const sq   = SQUARES[idx];
    const prop = state.properties[idx];
    const grp  = GROUPS[sq.group];
    const p    = _cp();

    if (prop.houses <= 0) return;
    const refund = prop.houses === 5 ? Math.floor(grp.hotelCost / 2) : Math.floor(grp.houseCost / 2);
    p.money += refund;
    prop.houses--;
    UI.log(`${p.name} sold a ${prop.houses === 4 ? 'hotel' : 'house'} on ${sq.name.replace(/\n/g,' ')} for ${refund} ${CURRENCY}.`, 'gain');
    _refresh();
  }

  // ── Mortgage ──────────────────────────────
  function toggleMortgage(idx) {
    const sq   = SQUARES[idx];
    const prop = state.properties[idx];
    const p    = _cp();
    if (prop.owner !== _cpi()) return;

    if (!prop.mortgaged) {
      // Mortgage
      if (prop.houses > 0) { alert('Sell all houses before mortgaging!'); return; }
      const val = Math.floor(sq.price / 2);
      p.money += val;
      prop.mortgaged = true;
      UI.log(`${p.name} mortgaged ${sq.name.replace(/\n/g,' ')} for ${val} ${CURRENCY}.`, 'gain');
    } else {
      // Unmortgage
      const val = Math.floor(sq.price / 2 * 1.1);
      if (p.money < val) { alert('Not enough money to unmortgage!'); return; }
      p.money -= val;
      prop.mortgaged = false;
      UI.log(`${p.name} unmortgaged ${sq.name.replace(/\n/g,' ')} for ${val} ${CURRENCY}.`, 'loss');
    }
    _refresh();
  }

  // ── Cards ─────────────────────────────────
  async function _drawCard(deck, pi, diceTotal) {
    const cards = deck === 'chance' ? CHANCE_CARDS : CHEST_CARDS;
    let cardIdx = deck === 'chance' ? state.chanceIdx : state.chestIdx;
    const card  = { ...cards[cardIdx % cards.length], _deck: deck };

    if (deck === 'chance') state.chanceIdx++;
    else                   state.chestIdx++;

    await _applyCard(card, pi, diceTotal);
  }

  async function _applyCard(card, pi, diceTotal) {
    const p = state.players[pi];
    let effectText = '';
    let effectType = '';

    switch (card.type) {
      case 'gain':
        p.money += card.amount;
        effectText = `+${card.amount} ${CURRENCY}`;
        effectType = 'gain';
        UI.log(`${p.name} drew card: +${card.amount} ${CURRENCY}`, 'gain');
        break;

      case 'lose':
        p.money -= card.amount;
        effectText = `-${card.amount} ${CURRENCY}`;
        effectType = 'loss';
        UI.log(`${p.name} drew card: -${card.amount} ${CURRENCY}`, 'loss');
        _checkBankruptcy(pi);
        break;

      case 'collectAll':
        let total = 0;
        state.players.forEach((op, oi) => {
          if (oi !== pi && !op.bankrupt) {
            op.money  -= card.amount;
            p.money   += card.amount;
            total     += card.amount;
          }
        });
        effectText = `+${total} ${CURRENCY} (from all players)`;
        effectType = 'gain';
        UI.log(`${p.name} collected ${card.amount} ${CURRENCY} from each player!`, 'gain');
        state.players.forEach((op, oi) => { if (oi !== pi) _checkBankruptcy(oi); });
        break;

      case 'goto':
        if (card.collectGo && card.target <= p.position) {
          p.money += GO_SALARY;
          UI.log(`${p.name} passed GO — collected ${GO_SALARY} ${CURRENCY}!`, 'gain');
        }
        p.position = card.target;
        effectText = `→ ${SQUARES[card.target].name.replace(/\n/g,' ')}`;
        effectType = 'move';
        UI.log(`${p.name} moved to ${SQUARES[card.target].name.replace(/\n/g,' ')}.`);
        break;

      case 'gotojail':
        _sendToJail(pi);
        effectText = '⛓️ Go to Habis!';
        effectType = 'loss';
        UI.log(`${p.name} is sent to Habis Dar Na3im!`, 'loss');
        break;

      case 'moveback':
        p.position = (p.position - card.steps + 40) % 40;
        effectText = `← Back ${card.steps} spaces`;
        effectType = 'move';
        UI.log(`${p.name} moved back ${card.steps} spaces.`);
        break;

      case 'repairs': {
        const myProps = Object.values(state.properties).filter(pr => pr.owner === pi);
        const houses  = myProps.reduce((a, pr) => a + (pr.houses < 5 ? pr.houses : 0), 0);
        const hotels  = myProps.reduce((a, pr) => a + (pr.houses === 5 ? 1 : 0), 0);
        const cost    = houses * card.perHouse + hotels * card.perHotel;
        p.money -= cost;
        effectText = `-${cost} ${CURRENCY} (${houses} houses, ${hotels} hotels)`;
        effectType = 'loss';
        UI.log(`${p.name} paid ${cost} ${CURRENCY} for repairs.`, 'loss');
        _checkBankruptcy(pi);
        break;
      }

      case 'nearStation': {
        const stations = STATION_POSITIONS;
        const nearest  = stations.reduce((best, s) => {
          const distBest = (best - p.position + 40) % 40;
          const distS    = (s   - p.position + 40) % 40;
          return distS < distBest ? s : best;
        });
        if (nearest <= p.position) { p.money += GO_SALARY; UI.log(`Passed GO!`, 'gain'); }
        p.position = nearest;
        effectText = `→ ${SQUARES[nearest].name.replace(/\n/g,' ')}`;
        effectType = 'move';
        break;
      }

      case 'nearUtility': {
        const utilities = UTILITY_POSITIONS;
        const nearest   = utilities.reduce((best, u) => {
          const dBest = (best - p.position + 40) % 40;
          const dU    = (u    - p.position + 40) % 40;
          return dU < dBest ? u : best;
        });
        if (nearest <= p.position) { p.money += GO_SALARY; UI.log(`Passed GO!`, 'gain'); }
        p.position = nearest;
        effectText = `→ ${SQUARES[nearest].name.replace(/\n/g,' ')}`;
        effectType = 'move';
        break;
      }
    }

    _refresh();

    // Show card modal and wait for OK
    await new Promise(resolve => {
      UI.showCardModal(card, effectText, effectType, () => {
        // After card — land on the new square if moved
        if (['goto','moveback','nearStation','nearUtility'].includes(card.type) && card.type !== 'gotojail') {
          _handleBuyable(pi, p.position, diceTotal).then(resolve);
        } else {
          resolve();
        }
      });
    });
  }

  // ── Jail ──────────────────────────────────
  function _sendToJail(pi) {
    const p    = state.players[pi];
    p.position = JAIL_POSITION;
    p.jailTurns= 1;
    _refresh();
  }

  function payJailFine() {
    const p = _cp();
    if (p.money < JAIL_FINE) { alert('Not enough money!'); return; }
    p.money    -= JAIL_FINE;
    p.jailTurns = 0;
    UI.log(`${p.name} paid ${JAIL_FINE} ${CURRENCY} to leave Habis.`, 'loss');
    _refresh();
    _updateButtons();
  }

  // ── Auction ───────────────────────────────
  function startAuction(idx) {
    const sq = SQUARES[idx];
    const activePlayers = state.players
      .map((p, i) => ({ i, p }))
      .filter(({ p }) => !p.bankrupt);

    state.auction = {
      idx,
      currentBid:    0,
      highBidder:    null,
      passed:        new Set(),
      order:         activePlayers.map(({ i }) => i),
      turnIdx:       0,
      bidHistory:    [],
    };
    state.phase = 'auction';
    _refreshAuctionModal();
  }

  function _refreshAuctionModal() {
    const a  = state.auction;
    const sq = SQUARES[a.idx];
    const bidderIdx = a.order[a.turnIdx % a.order.length];
    const bidder    = state.players[bidderIdx];
    UI.openAuctionModal(
      sq,
      a.bidHistory,
      a.currentBid,
      a.highBidder !== null ? state.players[a.highBidder].name : null,
      bidder.name
    );
  }

  function placeBid() {
    const a   = state.auction;
    const bid = parseInt(document.getElementById('auction-bid-input').value);
    const bidderIdx = a.order[a.turnIdx % a.order.length];
    const bidder    = state.players[bidderIdx];

    if (isNaN(bid) || bid <= a.currentBid) {
      alert(`Bid must be higher than ${a.currentBid} ${CURRENCY}!`); return;
    }
    if (bid > bidder.money) { alert('Not enough money!'); return; }

    a.currentBid = bid;
    a.highBidder = bidderIdx;
    a.bidHistory.push(`${bidder.name}: ${bid} ${CURRENCY}`);
    a.turnIdx++;
    _advanceAuction();
  }

  function passAuction() {
    const a = state.auction;
    const bidderIdx = a.order[a.turnIdx % a.order.length];
    a.passed.add(bidderIdx);
    a.bidHistory.push(`${state.players[bidderIdx].name}: Pass`);
    a.turnIdx++;
    _advanceAuction();
  }

  function _advanceAuction() {
    const a = state.auction;

    // Skip passed players
    while (a.passed.has(a.order[a.turnIdx % a.order.length]) && a.passed.size < a.order.length) {
      a.turnIdx++;
    }

    // Check if auction over
    const remaining = a.order.filter(i => !a.passed.has(i));
    if (remaining.length <= 1 || a.passed.size >= a.order.length) {
      _endAuction(); return;
    }

    // If everyone except high bidder passed
    if (a.highBidder !== null) {
      const otherActive = a.order.filter(i => i !== a.highBidder && !a.passed.has(i));
      if (otherActive.length === 0) { _endAuction(); return; }
    }

    _refreshAuctionModal();
  }

  function _endAuction() {
    const a  = state.auction;
    const sq = SQUARES[a.idx];
    UI.closeAuctionModal();

    if (a.highBidder !== null && a.currentBid > 0) {
      const winner = state.players[a.highBidder];
      winner.money -= a.currentBid;
      state.properties[a.idx] = { owner: a.highBidder, houses: 0, mortgaged: false };
      UI.log(`${winner.name} won the auction for ${sq.name.replace(/\n/g,' ')} at ${a.currentBid} ${CURRENCY}!`, 'gain');
    } else {
      UI.log(`No bids — ${sq.name.replace(/\n/g,' ')} goes back to the bank.`);
    }

    state.auction = null;
    state.phase   = 'action';
    _refresh();
    _updateButtons();
  }

  // ── Trade ─────────────────────────────────
  function executeTrade() {
    const data = UI.getTradeData();
    const cp   = state.currentPlayer;
    const tp   = data.targetPlayer;

    if (isNaN(tp) || tp === cp) { alert('Select a valid player to trade with!'); return; }

    const giver    = state.players[cp];
    const receiver = state.players[tp];

    // Validate
    if (giver.money < data.offerCash)    { alert('You don\'t have enough cash!'); return; }
    if (receiver.money < data.recvCash)  { alert('Other player doesn\'t have enough cash!'); return; }
    for (const idx of data.offerProps) {
      if (state.properties[idx]?.owner !== cp) { alert('You don\'t own that property!'); return; }
    }
    for (const idx of data.recvProps) {
      if (state.properties[idx]?.owner !== tp) { alert('Other player doesn\'t own that property!'); return; }
    }

    // Execute
    giver.money    -= data.offerCash;
    receiver.money += data.offerCash;
    receiver.money -= data.recvCash;
    giver.money    += data.recvCash;

    for (const idx of data.offerProps) state.properties[idx].owner = tp;
    for (const idx of data.recvProps)  state.properties[idx].owner = cp;

    UI.log(`Trade: ${giver.name} ↔ ${receiver.name}`, 'hl');
    if (data.offerCash) UI.log(`  ${giver.name} gave ${data.offerCash} ${CURRENCY}`);
    if (data.recvCash)  UI.log(`  ${receiver.name} gave ${data.recvCash} ${CURRENCY}`);
    if (data.offerProps.length) UI.log(`  ${giver.name} gave: ${data.offerProps.map(i=>SQUARES[i].name.replace(/\n/g,' ')).join(', ')}`);
    if (data.recvProps.length)  UI.log(`  ${receiver.name} gave: ${data.recvProps.map(i=>SQUARES[i].name.replace(/\n/g,' ')).join(', ')}`);

    UI.closeTradeModal();
    _refresh();
  }

  // ── End Turn ──────────────────────────────
  function endTurn() {
    UI.showDoubles(false);
    state.rolled  = false;
    state.phase   = 'roll';
    state.doublesCount = 0;

    // Next active player
    let tries = 0;
    do {
      state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
      tries++;
    } while (state.players[state.currentPlayer].bankrupt && tries < state.players.length);

    _refresh();
    _updateButtons();
    _checkWinner();
  }

  // ── Bankruptcy ────────────────────────────
  function declareBankruptcy() {
    if (!confirm(`Declare bankruptcy for ${_cp().name}?`)) return;
    _goBankrupt(_cpi());
    endTurn();
  }

  function _checkBankruptcy(pi) {
    if (state.players[pi].money < 0 && !state.players[pi].bankrupt) {
      _goBankrupt(pi);
    }
  }

  function _goBankrupt(pi) {
    const p = state.players[pi];
    p.bankrupt = true;
    UI.log(`${p.token} ${p.name} went bankrupt! 💸`, 'loss');
    // Release properties
    Object.keys(state.properties).forEach(idx => {
      if (state.properties[idx].owner === pi) delete state.properties[idx];
    });
    _refresh();
  }

  function _checkWinner() {
    const active = state.players.filter(p => !p.bankrupt);
    if (active.length === 1) {
      const winner = active[0];
      const propCount = Object.values(state.properties).filter(p => p.owner === state.players.indexOf(winner)).length;
      UI.showWinner(winner, `
        <div>💰 Final Balance: <strong>${winner.money.toLocaleString()} ${CURRENCY}</strong></div>
        <div>🏠 Properties: <strong>${propCount}</strong></div>
      `);
    }
  }

  return {
    start, newGame,
    rollDice, endTurn,
    buyProperty, buildHouse, sellHouse,
    toggleMortgage,
    payJailFine, declareBankruptcy,
    startAuction, placeBid, passAuction,
    executeTrade,
  };

})();
