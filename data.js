// =============================================
//  data.js  —  All game data
// =============================================

const CURRENCY = 'أوقية';
const START_MONEY = 1500;
const GO_SALARY = 200;
const JAIL_POSITION = 10;
const JAIL_FINE = 50;
const MAX_JAIL_TURNS = 3;
const LUXURY_TAX = 100;
const INCOME_TAX = 200;

const PLAYER_COLORS = ['#e53e3e', '#3182ce', '#38a169', '#d97706'];
const PLAYER_TOKENS  = ['🚗', '🎩', '🐶', '⛵'];

// ── Property Groups ──────────────────────────
const GROUPS = {
  brown:  { color: '#8B4513', name: 'Brown',    houseCost: 50,  hotelCost: 50,  rentMult: 1,  count: 2 },
  lblue:  { color: '#87CEEB', name: 'Light Blue',houseCost: 50,  hotelCost: 50,  rentMult: 1,  count: 3 },
  pink:   { color: '#d63384', name: 'Pink',     houseCost: 100, hotelCost: 100, rentMult: 1,  count: 3 },
  orange: { color: '#e67e22', name: 'Orange',   houseCost: 100, hotelCost: 100, rentMult: 1,  count: 3 },
  red:    { color: '#e53e3e', name: 'Red',      houseCost: 150, hotelCost: 150, rentMult: 1,  count: 3 },
  yellow: { color: '#ecc94b', name: 'Yellow',   houseCost: 150, hotelCost: 150, rentMult: 1,  count: 3 },
  green:  { color: '#276749', name: 'Green',    houseCost: 200, hotelCost: 200, rentMult: 1,  count: 3 },
  dblue:  { color: '#1a365d', name: 'Dark Blue', houseCost: 200, hotelCost: 200, rentMult: 1,  count: 2 },
};

// ── Board Squares (40) ───────────────────────
// rent array: [base, 1house, 2houses, 3houses, 4houses, hotel]
const SQUARES = [
  /* 0  */ { type:'corner',  name:'GO',                icon:'🚀', action:'go'       },
  /* 1  */ { type:'prop',    name:'Tar7il',            price:60,  group:'brown',  rent:[2,  10,  30,  90,  160, 250] },
  /* 2  */ { type:'chest',   name:'Community Chest',   icon:'💼'                  },
  /* 3  */ { type:'prop',    name:'Lhy6',              price:60,  group:'brown',  rent:[4,  20,  60,  180, 320, 450] },
  /* 4  */ { type:'tax',     name:'Income Tax',        icon:'💸', amount: INCOME_TAX },
  /* 5  */ { type:'station', name:'Carafor Madrid',    price:200, icon:'🏪'       },
  /* 6  */ { type:'prop',    name:'Limgy6i',           price:100, group:'lblue',  rent:[6,  30,  90,  270, 400, 550] },
  /* 7  */ { type:'chance',  name:'Chance',            icon:'❓'                  },
  /* 8  */ { type:'prop',    name:'Dar Na3im',         price:100, group:'lblue',  rent:[6,  30,  90,  270, 400, 550] },
  /* 9  */ { type:'prop',    name:'Melah',             price:120, group:'lblue',  rent:[8,  40,  100, 300, 450, 600] },
  /* 10 */ { type:'corner',  name:'Habis\nDar Na3im',  icon:'⛓️', action:'jail'   },
  /* 11 */ { type:'prop',    name:'Toujounin',         price:140, group:'pink',   rent:[10, 50,  150, 450, 625, 750] },
  /* 12 */ { type:'utility', name:'Sherikit 8aw',      price:150, icon:'⚡'       },
  /* 13 */ { type:'prop',    name:'Dar Lbarke',        price:140, group:'pink',   rent:[10, 50,  150, 450, 625, 750] },
  /* 14 */ { type:'prop',    name:'Ljedide',           price:160, group:'pink',   rent:[12, 60,  180, 500, 700, 900] },
  /* 15 */ { type:'station', name:'Carafor Livrash',   price:200, icon:'🏪'       },
  /* 16 */ { type:'prop',    name:'Dragaje',           price:180, group:'orange', rent:[14, 70,  200, 550, 750, 950] },
  /* 17 */ { type:'chest',   name:'Community Chest',   icon:'💼'                  },
  /* 18 */ { type:'prop',    name:'Cabanou',           price:180, group:'orange', rent:[14, 70,  200, 550, 750, 950] },
  /* 19 */ { type:'prop',    name:'Cabanou Av.',       price:200, group:'orange', rent:[16, 80,  220, 600, 800, 1000] },
  /* 20 */ { type:'corner',  name:'Istiraha',          icon:'☕', action:'free'   },
  /* 21 */ { type:'prop',    name:'Tar7il Sud',        price:220, group:'red',    rent:[18, 90,  250, 700, 875, 1050] },
  /* 22 */ { type:'chance',  name:'Chance',            icon:'❓'                  },
  /* 23 */ { type:'prop',    name:'Lhy6 El Jadid',     price:220, group:'red',    rent:[18, 90,  250, 700, 875, 1050] },
  /* 24 */ { type:'prop',    name:'Limgy6i Ouest',     price:240, group:'red',    rent:[20, 100, 300, 750, 925, 1100] },
  /* 25 */ { type:'station', name:'Carafor L7outat',   price:200, icon:'🏪'       },
  /* 26 */ { type:'prop',    name:'Dar Na3im Nord',    price:260, group:'yellow', rent:[22, 110, 330, 800, 975, 1150] },
  /* 27 */ { type:'prop',    name:'Melah El Kbir',     price:260, group:'yellow', rent:[22, 110, 330, 800, 975, 1150] },
  /* 28 */ { type:'utility', name:'Sherikit Lme',      price:150, icon:'💧'       },
  /* 29 */ { type:'prop',    name:'Toujounin Haut',    price:280, group:'yellow', rent:[24, 120, 360, 850, 1025, 1200] },
  /* 30 */ { type:'corner',  name:'Go To\nHabis',      icon:'🚔', action:'gotojail'},
  /* 31 */ { type:'prop',    name:'Dar Lbarke Plage',  price:300, group:'green',  rent:[26, 130, 390, 900, 1100, 1275] },
  /* 32 */ { type:'prop',    name:'Ljedide Centre',    price:300, group:'green',  rent:[26, 130, 390, 900, 1100, 1275] },
  /* 33 */ { type:'chest',   name:'Community Chest',   icon:'💼'                  },
  /* 34 */ { type:'prop',    name:'Dragaje Royal',     price:320, group:'green',  rent:[28, 150, 450, 1000,1200, 1400] },
  /* 35 */ { type:'station', name:'Carafor BMD',       price:200, icon:'🏪'       },
  /* 36 */ { type:'chance',  name:'Chance',            icon:'❓'                  },
  /* 37 */ { type:'prop',    name:'Cabanou Prestige',  price:350, group:'dblue',  rent:[35, 175, 500, 1100,1300, 1500] },
  /* 38 */ { type:'tax',     name:'Luxury Tax',        icon:'💎', amount: LUXURY_TAX },
  /* 39 */ { type:'prop',    name:'Cabanou Palace',    price:400, group:'dblue',  rent:[50, 200, 600, 1400,1700, 2000] },
];

const STATION_POSITIONS  = [5, 15, 25, 35];
const UTILITY_POSITIONS  = [12, 28];

// Rent by number of stations owned
const STATION_RENT = { 1: 25, 2: 50, 3: 100, 4: 200 };
// Utility rent multiplier (multiply dice total)
const UTILITY_RENT_MULT = { 1: 4, 2: 10 };

// ── Chance Cards ─────────────────────────────
const CHANCE_CARDS = [
  { text: 'Advance to GO! Collect 200 ' + CURRENCY, type: 'goto', target: 0, collectGo: true },
  { text: 'Advance to Carafor Madrid', type: 'goto', target: 5, collectGo: true },
  { text: 'Advance to Carafor L7outat', type: 'goto', target: 25, collectGo: true },
  { text: 'Advance to Cabanou Palace', type: 'goto', target: 39, collectGo: true },
  { text: 'Go to Habis Dar Na3im. Go directly to Habis!', type: 'gotojail' },
  { text: 'Bank pays you a dividend of 50 ' + CURRENCY, type: 'gain', amount: 50 },
  { text: 'Your building and loan matures. Collect 150 ' + CURRENCY, type: 'gain', amount: 150 },
  { text: 'You have won a crossword competition! Collect 100 ' + CURRENCY, type: 'gain', amount: 100 },
  { text: 'Pay poor tax of 15 ' + CURRENCY, type: 'lose', amount: 15 },
  { text: 'Go back 3 spaces', type: 'moveback', steps: 3 },
  { text: 'Make general repairs on all your property. Pay 25 ' + CURRENCY + ' per house, 100 ' + CURRENCY + ' per hotel.', type: 'repairs', perHouse: 25, perHotel: 100 },
  { text: 'Speeding fine! Pay 15 ' + CURRENCY, type: 'lose', amount: 15 },
  { text: 'Advance to nearest Carafor station. If unowned, you may buy it.', type: 'nearStation' },
  { text: 'Advance to nearest utility. If unowned, you may buy it.', type: 'nearUtility' },
  { text: 'Take a trip to Istiraha. Free resting place.', type: 'goto', target: 20, collectGo: true },
];

// ── Community Chest Cards ────────────────────
const CHEST_CARDS = [
  { text: 'Advance to GO! Collect 200 ' + CURRENCY, type: 'goto', target: 0, collectGo: true },
  { text: 'Bank error in your favor. Collect 200 ' + CURRENCY, type: 'gain', amount: 200 },
  { text: 'Doctor\'s fee. Pay 50 ' + CURRENCY, type: 'lose', amount: 50 },
  { text: 'From sale of stock, you get 50 ' + CURRENCY, type: 'gain', amount: 50 },
  { text: 'Go to Habis Dar Na3im. Go directly to Habis!', type: 'gotojail' },
  { text: 'Grand Opera opening night — collect 50 ' + CURRENCY + ' from every player!', type: 'collectAll', amount: 50 },
  { text: 'Holiday fund matures. Receive 100 ' + CURRENCY, type: 'gain', amount: 100 },
  { text: 'Income tax refund. Collect 20 ' + CURRENCY, type: 'gain', amount: 20 },
  { text: 'Life insurance matures. Collect 100 ' + CURRENCY, type: 'gain', amount: 100 },
  { text: 'Pay hospital fees of 100 ' + CURRENCY, type: 'lose', amount: 100 },
  { text: 'Pay school fees of 50 ' + CURRENCY, type: 'lose', amount: 50 },
  { text: 'Receive 25 ' + CURRENCY + ' consultancy fee', type: 'gain', amount: 25 },
  { text: 'You are assessed for street repairs. Pay 40 ' + CURRENCY + ' per house, 115 ' + CURRENCY + ' per hotel.', type: 'repairs', perHouse: 40, perHotel: 115 },
  { text: 'You have won second prize in a beauty contest. Collect 10 ' + CURRENCY, type: 'gain', amount: 10 },
  { text: 'You inherit 100 ' + CURRENCY, type: 'gain', amount: 100 },
];
